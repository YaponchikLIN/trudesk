import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchGroups, unloadGroups } from 'actions/groups';
import { fetchAccounts, unloadAccounts } from 'actions/accounts';
import { generateReport } from 'actions/reports';

import TruCard from 'components/TruCard';
import Grid from 'components/Grid';
import GridItem from 'components/Grid/GridItem';
import DatePicker from 'components/DatePicker';
import SingleSelect from 'components/SingleSelect';
import Button from 'components/Button';
import SpinLoader from 'components/SpinLoader';

import moment from 'moment-timezone';
import helpers from 'lib/helpers';
import $ from 'jquery';

const ReportTicketsByAssignee = () => {
  const groupsState = useSelector((state) => state.groupsState);
  const accountsState = useSelector((state) => state.accountsState);
  const dispatch = useDispatch();

  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState([]);

  useEffect(() => {
    helpers.UI.inputs();
    helpers.formvalidator();
    dispatch(fetchGroups());
    dispatch(fetchAccounts({ type: 'agents' }));
    // setStartDate(moment().utc(true).subtract(30, 'days').format(helpers.getShortDateFormat()));
    setStartDate(moment(startDate, helpers.getShortDateFormat()).utc().toISOString());
    // setEndDate(moment().utc(true).format(helpers.getShortDateFormat()));
    setEndDate(moment(endDate, helpers.getShortDateFormat()).utc().toISOString());

    return () => {
      dispatch(unloadGroups());
      dispatch(unloadAccounts());
    };
  }, []);

  useEffect(() => {
    helpers.UI.reRenderInputs();
  }, [startDate, endDate]);

  useEffect(() => {
    const g = groupsState.groups.map((group) => ({ text: group.get('name'), value: group.get('_id') })).toArray();
    g.push({ text: 'All', value: 'all' });
    setGroups(g);
  }, [groupsState]);

  useEffect(() => {
    const a = accountsState.accounts
      .map((account) => ({ text: account.get('fullname'), value: account.get('_id') }))
      .toArray();
    setAgents(a);
  }, [accountsState]);

  const onFormSubmit = (e) => {
    e.preventDefault();
    console.log('endDate: ' + endDate);
    if (startDate && endDate && startDate <= endDate) {
      if (isLoading) return;
      setIsLoading(true);
      dispatch(
        generateReport({
          type: 'tickets_by_assignee',
          filename: `report_tickets_by_assignee__${moment(startDate).format('MMDDYYYY')}`,
          startDate,
          endDate,
          groups: selectedGroups,
          assignee: selectedAssignee,
        }),
      ).then(() => {
        setIsLoading(false);
      });
    } else {
      helpers.UI.showSnackbar(' Invalid date interval', true);
    }
  };

  const registerFormValidators = (valueInput) => {
    if (!moment(valueInput, helpers.getShortDateFormat(), true).isValid()) {
      helpers.UI.showSnackbar('Invalid Date (' + helpers.getShortDateFormat() + ')', true);
    }
  };

  return (
    <div>
      <TruCard
        hover={false}
        header={
          <div style={{ padding: '10px 15px' }}>
            <h4 style={{ width: '100%', textAlign: 'left', fontSize: '14px', margin: 0 }}>Tickets by Assignee</h4>
          </div>
        }
        extraContentClass={'nopadding'}
        content={
          <div>
            <SpinLoader active={isLoading} />
            <p className="padding-15 nomargin uk-text-muted">
              Please select the start and end dates and which groups to include in the report.
            </p>
            <hr className="uk-margin-large-bottom" style={{ marginTop: 0 }} />
            <div className={'padding-15'}>
              <form onSubmit={(e) => onFormSubmit(e)}>
                <Grid>
                  <GridItem width={'1-2'}>
                    <label htmlFor="filterDate_Start" className={'uk-form-label nopadding nomargin'}>
                      Start Date
                    </label>
                    <DatePicker
                      name={'filterDate_Start'}
                      format={helpers.getShortDateFormat()}
                      value={startDate}
                      onChange={(e) => {
                        const newStartDate = moment(e.target.value, helpers.getShortDateFormat()).utc().toISOString();
                        if (!endDate || new Date(newStartDate) <= new Date(endDate)) {
                          registerFormValidators(e.target.value);
                        } else if (endDate) {
                          helpers.UI.showSnackbar('Invalid Date (' + helpers.getShortDateFormat() + ')', true);
                        }
                        setStartDate(newStartDate);
                      }}
                    />
                  </GridItem>
                  <GridItem width={'1-2'}>
                    <label htmlFor="filterDate_End" className={'uk-form-label nopadding nomargin'}>
                      End Date
                    </label>
                    <DatePicker
                      name={'filterDate_End'}
                      format={helpers.getShortDateFormat()}
                      value={endDate}
                      onChange={(e) => {
                        const newEndDate = moment(e.target.value, helpers.getShortDateFormat()).utc().toISOString();
                        if (!startDate || new Date(newEndDate) >= new Date(startDate)) {
                          registerFormValidators(e.target.value);
                        } else if (startDate) {
                          helpers.UI.showSnackbar('Invalid Date (' + helpers.getShortDateFormat() + ')', true);
                        }
                        setEndDate(newEndDate);
                      }}
                    />
                  </GridItem>
                  <GridItem width={'1-1'}>
                    <div className="uk-margin-medium-top uk-margin-medium-bottom">
                      <label htmlFor="groups" className={'uk-form-label'}>
                        Groups
                      </label>
                      <SingleSelect
                        multiple={true}
                        items={groups}
                        value={selectedGroups}
                        onSelectChange={(e, value) => {
                          setSelectedGroups(value);
                        }}
                      />
                    </div>
                  </GridItem>
                  <GridItem width={'1-1'}>
                    <div className="uk-margin-medium-top uk-margin-medium-bottom">
                      <label htmlFor="priorities">Assignee</label>
                      <SingleSelect
                        multiple={true}
                        items={agents}
                        value={selectedAssignee}
                        onSelectChange={(e, value) => {
                          setSelectedAssignee(value);
                        }}
                      />
                    </div>
                  </GridItem>
                  <GridItem width={'1-1'}>
                    <div>
                      <Button
                        disabled={isLoading}
                        text={'Generate'}
                        type={'submit'}
                        style={'primary'}
                        waves={true}
                        small={true}
                      />
                    </div>
                  </GridItem>
                </Grid>
              </form>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default ReportTicketsByAssignee;
