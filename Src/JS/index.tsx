import React, {useState} from "react";
import {Paper, WithStyles, LinearProgress} from "@material-ui/core";
import {withStyles} from "@material-ui/core/styles";
import styles from "./Styles";
import getReport, {getTimeFilters} from "./Data";
import {calcState, initState} from "./Pure";
import {
  InitStatePayload,
  ReportLoadedPayload,
  TimeFilterChangedPayload,
  State,
  SearchRequestedPayload,
  FailurePayload,
  FilterChangedPayload,
  CostCenterChangedPayload,
} from "./State";
import {ReportTable} from "./ReportTable";

import {ReportFilters} from "./ReportFilters";
import {TimeFilter, CostCenter} from "./Models";
import {orderBy} from 'lodash';
import {BaseProps} from 'src/BaseProps';
import Notification, {showNotification} from "./../Notification";


interface IFinanceReportProps extends WithStyles<typeof styles>, BaseProps {
}

const FinanceReport: React.FunctionComponent<IFinanceReportProps> = props => {
  const {classes} = props;

  // TODO: move to back-end settings
  const defaultTimeFilter = {text: "Last 72 hours", value: 73};
  const customTimeFilter = {text: "Custom", value: -1};
  const now = new Date();

  const [timeFilters, setTimeFilters] = useState([customTimeFilter, defaultTimeFilter] as TimeFilter[]);
  const [costCenters, setCostCenters] = useState([{id: 0, name: 'All', code: ''}] as CostCenter[]);
  const [state, setState] = useState(
    initState(new InitStatePayload(now, defaultTimeFilter))
  );

  React.useEffect(() => {
    loadReport(state);

    getTimeFilters().then(d => {
      const filters = d.timeFilters.concat(timeFilters)
      setTimeFilters(orderBy(filters, f => f.value));

      setCostCenters(d.costCenters.concat(costCenters))
    });
  }, []);

  const handleFilterChanged = (payload: FilterChangedPayload) => {
    if (
      payload instanceof TimeFilterChangedPayload ||
      payload instanceof SearchRequestedPayload ||
      payload instanceof CostCenterChangedPayload
    ) {
      const newState = calcState(payload, state, setState);
      loadReport(newState);
    } else {
      calcState(payload, state, setState);
    }
  };

  const handleEnterPressed = (e: any) => {
    const code = e.keyCode || e.which;
    if (code === 13) {
      const newState = calcState(new SearchRequestedPayload(), state, setState);

      loadReport(newState);
    }
  };

  const loadReport = (s: State) => {
    getReport(
      s.searchId,
      s.dateFrom,
      s.dateTo,
      s.searchName,
      s.searchEmail,
      s.searchCostCenterId
    )
      .then(d => {
        calcState(new ReportLoadedPayload(d), s, setState);
      })
      .catch(err => {
        // TODO: re-factor failure handling
        if (err.status === 400) {
          calcState(new FailurePayload(err.data), state, setState);
        } else if (err.status === 401) {
          // do nothing since it's gonna be redirected to the Sign In page.
        } else {
          calcState(new FailurePayload(undefined), state, setState);
        }
      });
  };

  return (
    <div onKeyUp={handleEnterPressed}>
      <Paper className={classes.searchBarContainer}>
        <ReportFilters
          state={state}
          timeFilterOptions={timeFilters}
          costCenterOptions={costCenters}
          onChange={handleFilterChanged}
          classes={classes}
        />
        <Notification/>
      </Paper>

      {(() => {
        switch (state.view) {
          case "loading":
            return <LinearProgress variant="query"/>;
          case "empty":
            return <h3 style={{margin: 40}}>No data found</h3>;
          case "report":
            return <ReportTable state={state} classes={classes}/>;
          case "failure":
            showNotification({
              type: "error",
              message: "Couldn't display reports",
              errors: state.validationErrors
            });
            return <></>;
        }
      })()}
    </div>
  );
};

export default withStyles(styles)(FinanceReport);
