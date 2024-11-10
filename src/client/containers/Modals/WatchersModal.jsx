import React from 'react';
import PropTypes from 'prop-types';
import { observer } from 'mobx-react';
import { makeObservable, observable } from 'mobx';
import { connect } from 'react-redux';
import Button from 'components/Button';
import BaseModal from 'containers/Modals/BaseModal';
import { updateSetting } from 'actions/settings';
import { fetchWatchers } from 'actions/watchers';
import InfiniteScroll from 'react-infinite-scroller';
import axios from 'axios';
import Table from 'components/Table';
import TableHeader from 'components/Table/TableHeader';
import TableRow from 'components/Table/TableRow';
import PageContentWatchers from 'components/PageContentWatchers';
import TableCell from 'components/Table/TableCell';
import { hideModal } from 'actions/common';
import Chance from 'chance';
import helpers from 'lib/helpers';

@observer
class WatchersModal extends React.Component {
  @observable privacyPolicy = '';
  @observable pageStart = -1;
  @observable hasMore = true;
  @observable initialLoad = true;
  @observable initialState = [];
  @observable chance = new Chance();
  constructor(props) {
    super(props);
    this.state = {
      watchers: [],
      recordsUpdate: [],
      recordsAdd: [],
      matchString: true,
      email: '',
    };
    makeObservable(this);
    this.onWatchersFetch = this.onWatchersFetch.bind(this);
    this.onWatchersSave = this.onWatchersSave.bind(this);
    this.onCheckWatchersMatched = this.onCheckWatchersMatched.bind(this);
  }

  componentDidMount() {
    if (this.props.ticketId) {
      this.props.fetchWatchers({
        limit: 5,
        skip: this.state.watchers.length,
        excludedIds: this.state.recordsAdd,
        ticketId: this.props.ticketId,
        sessionUserId: this.props.sessionUser._id,
      });
    } else {
      this.setState({ watchers: this.props.watchers });
    }

    this.props.socket.on('$trudesk:client:watchers:fetch', this.onWatchersFetch);
    this.props.socket.on('$trudesk:client:watchers:save', this.onWatchersSave);
    this.props.socket.on('$trudesk:client:watchers:check', this.onCheckWatchersMatched);
    this.initialLoad = false;

    document.addEventListener('keydown', this.keydownHandler);
  }

  componentDidUpdate(prevProps) {
    // helpers.UI.reRenderInputs()
  }

  componentWillUnmount() {
    this.props.socket.off('$trudesk:client:watchers:check', this.onCheckWatchersMatched);
    this.props.socket.off('$trudesk:client:watchers:fetch', this.onWatchersFetch);
    this.props.socket.off('$trudesk:client:watchers:save', this.onWatchersSave);
  }

  updateEmail(e, value) {
    e.preventDefault();
    let list = [...this.state.watchers];
    let listUpdate = [...this.state.recordsUpdate];

    let indexRecord = list.indexOf(value);
    list[indexRecord].email = list[indexRecord].email.replace(' ', '');
    if (list[indexRecord]._id && list[indexRecord].email != '') {
      if (listUpdate.findIndex((record) => record._id == value._id) == -1) {
        listUpdate.unshift(list[indexRecord]);
      } else {
        const index = listUpdate.findIndex((record) => record._id === value._id);
        listUpdate[index] = value;
      }
    }

    this.setState({
      watchers: list,
      recordsUpdate: listUpdate,
    });
  }

  onWatchersSave = (data) => {
    this.setState({
      watchers: data.watchers,
    });
  };

  onWatchersFetch = (data) => {
    if (data.sessionUserId !== this.props.sessionUser._id) return;
    this.hasMore = data.watchers.length >= 5;
    let watchersState = [...this.state.watchers];
    data.watchers = data.watchers.filter((watcher) => {
      if (!this.state.watchers.includes(watcher)) return watcher;
    });
    watchersState.push(...data.watchers);

    this.setState({
      watchers: watchersState,
    });
  };

  onCheckWatchersMatched = (data) => {
    if (data.resultCheck) {
      helpers.UI.showSnackbar('This email already exists', true);
    } else {
      this.addEmail();
    }
  };

  async addEmail() {
    let list = [...this.state.watchers];
    let listAdd = [...this.state.recordsAdd];
    let key = this.chance.string({
      length: 8,
      pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
      alpha: true,
      numeric: true,
      casing: 'lower',
    });
    let value = {};
    value.email = this.state.email.replace(' ', '');
    value.key = key;
    value.ticketId = this.props.ticketId;
    value.owner = this.props.sessionUser._id;
    value.userPermission = this.props.sessionUser.role.isAdmin || this.props.sessionUser.role.isAgent;
    value.ticketOwner = this.props.ownerId;
    if (value.email != '') {
      if (this.props.ticketId) {
        await axios.post('/api/v2/watchers/add', value).then((res) => {
          const record = res.data.record;
          list.unshift(record);
          listAdd.unshift(record);
          this.setState({
            watchers: list,
            recordsAdd: listAdd,
            email: '',
          });
          return true;
        });
      } else {
        const record = { email: value.email, key: value.key };
        list.unshift(record);
        this.setState({
          watchers: list,
          email: '',
        });
      }
    }
  }

  async removeEmail(value, ticketId) {
    let list = [
      ...this.state.watchers.filter((record) => {
        if (record._id && value._id) {
          return record._id != value._id;
        } else {
          return record.key != value.key;
        }
      }),
    ];
    let listUpdate = [
      ...this.state.recordsUpdate.filter((record) => {
        if (record._id && value._id) {
          return record._id !== value._id;
        } else {
          return record.key !== value.key;
        }
      }),
    ];
    let listAdd = [
      ...this.state.recordsAdd.filter((record) => {
        if (record._id && value._id) {
          return record._id !== value._id;
        } else {
          return record.key !== value.key;
        }
      }),
    ];

    this.setState({
      watchers: list,
      recordsUpdate: listUpdate,
      recordsAdd: listAdd,
    });

    if (ticketId) {
      if (value && value._id) {
        const owner = this.props.sessionUser._id;
        const ticketOwner = this.props.ownerId;
        const userPermission = this.props.sessionUser.role.isAdmin || this.props.sessionUser.role.isAgent;
        const data = { ticketId, record: value, owner, ticketOwner, userPermission };
        await axios.post(`/api/v2/watchers/remove`, data).then((res) => {
          return res.data;
        });
      }
    }
  }

  handleChange = (event, key, property) => {
    const newItems = [...this.state.watchers];
    const index = newItems.findIndex((record) => record.key === key);
    newItems[index][property] = event.target.value;
    this.setState({ watchers: newItems });
  };

  inputChange = (event) => {
    event.preventDefault();
    const stateString = event.target.value;
    if (event.target.id == 'email') this.setState({ email: stateString.replace(' ', '') });
  };

  getWatchers = () => {
    return this.state.watchers;
  };

  _validateEmail(email) {
    if (!email) return false;
    return email
      .toString()
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  }

  async checkWatchersMatched(e) {
    e.preventDefault();
    if (this.state.email == '') {
      return;
    }
    if (!this._validateEmail(this.state.email)) {
      helpers.UI.showSnackbar('Invalid Email', true);
      return;
    }

    const matchString = this.state.email;
    if (matchString == this.props.mainEmail) {
      helpers.UI.showSnackbar('This email already exists', true);
      return false;
    }

    const ticketId = this.props.ticketId;
    if (ticketId) {
      try {
        await axios.post('/api/v2/watchers/check', { matchString, ticketId }).then((res) => {
          return res.data;
        });
      } catch (err) {
        console.error(err);
        return false;
      }
    } else {
      if (this.state.watchers.find((record) => record.email === matchString)) {
        helpers.UI.showSnackbar('This email already exists', true);
        return false;
      } else {
        this.addEmail();
      }
    }
  }

  showTickCross(id) {
    const deleteIcon = document.getElementById(`delete-${id}`);
    const tickIcon = document.getElementById(`tick-${id}`);
    const crossIcon = document.getElementById(`cross-${id}`);

    if (deleteIcon && tickIcon && crossIcon) {
      deleteIcon.style.display = 'none';
      tickIcon.style.display = 'inline-block';
      crossIcon.style.display = 'inline-block';
    }
  }

  keydownHandler = (e) => {
    if (this.state.email !== '') {
      if (e.keyCode === 13 && e.target.id == 'email') {
        this.checkWatchersMatched(e);
      }
    }
  };

  hideTickCross(id) {
    const deleteIcon = document.getElementById(`delete-${id}`);
    const tickIcon = document.getElementById(`tick-${id}`);
    const crossIcon = document.getElementById(`cross-${id}`);

    if (deleteIcon && tickIcon && crossIcon) {
      deleteIcon.style.display = 'block';
      tickIcon.style.display = 'none';
      crossIcon.style.display = 'none';
    }
  }

  getEmailsWithPage = (page) => {
    this.hasMore = false;
    if (this.props.ticketId) {
      this.props.fetchWatchers({
        limit: 5,
        skip: this.state.watchers.length - this.state.recordsAdd.length,
        excludedIds: this.state.recordsAdd,
        ticketId: this.props.ticketId,
        sessionUserId: this.props.sessionUser._id,
      });
    }
  };

  async onFormSubmit() {
    if (
      this.props.ownerId == this.props.sessionUser._id ||
      this.props.sessionUser.role.isAdmin ||
      this.props.sessionUser.role.isAgent
    ) {
      const data = {
        recordsUpdate: this.state.recordsUpdate,
        ticketId: this.props.ticketId,
        owner: this.props.sessionUser._id,
        ticketOwner: this.props.ownerId,
        userPermission: this.props.sessionUser.role.isAdmin || this.props.sessionUser.role.isAgent,
      };

      for (let record of this.state.recordsUpdate) {
        if (!this._validateEmail(record.email)) {
          helpers.UI.showSnackbar(`Invalid Email: ${record.email}`, true);
          return;
        }
      }

      if (data.ticketId) {
        await axios.post('/api/v2/watchers/update', data).then((res) => {
          if (res.success == false) {
            helpers.UI.showSnackbar('Update failed', true);
          }
          return res.data;
        });
      }
    }
    this.props.hideModal();
  }

  render() {
    return (
      <BaseModal options={{ bgclose: false }} style={{ top: 150 }}>
        <form className="uk-form-stacked" onSubmit={(e) => this.onFormSubmit(e)} style={{ position: 'center' }}>
          <div className="setting-item-wrap">
            <div style={{ minHeight: '60px', height: 'auto' }}>
              <div>
                <div className="uk-position-relative">
                  <div>
                    <div>
                      <h2 className="uk-text-muted uk-text-center">Watchers</h2>
                    </div>
                  </div>
                  {(this.props.ownerId == this.props.sessionUser._id ||
                    this.props.sessionUser.role.isAdmin ||
                    this.props.sessionUser.role.isAgent) && (
                    <div className="uk-margin-medium-bottom" style={{ paddingTop: 10, paddingLeft: 5 }}>
                      <div className="uk-right">
                        <div
                          className="md-switch-wrapper md-switch md-green uk-float-right uk-clearfix"
                          style={{ margin: 0, position: 'absolute', right: 15, zIndex: 99 }}
                        >
                          <button
                            className="uk-float-right md-btn md-btn-small  md-btn-wave  undefined waves-effect waves-button"
                            type="button"
                            style={{ maxHeight: 27 }}
                            onClick={(e) => this.checkWatchersMatched(e)}
                          >
                            <div className="uk-float-left uk-width-1-1 uk-text-center">Add</div>
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex' }}>
                        <div className="md-input-wrapper md-input-filled" style={{ flex: 1, width: '60%' }}>
                          <label style={{ top: -6, fontSize: 12 }}>Watcher`s Email</label>
                          <input
                            type="text"
                            className="md-input md-input-width-medium"
                            style={{ width: '60%', marginLeft: '5px' }}
                            id="email"
                            onChange={(event) => this.inputChange(event)}
                            value={this.state.email}
                          />
                          <span className="md-input-bar" style={{ width: '62%' }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  <PageContentWatchers id={'watchers-page-content'} padding={0} style={{ height: 300 }}>
                    <InfiniteScroll
                      pageStart={this.pageStart}
                      loadMore={this.getEmailsWithPage}
                      hasMore={this.hasMore}
                      initialLoad={this.initialLoad}
                      threshold={5}
                      loader={
                        <div className={'uk-width-1-1 uk-text-center'} key={0}>
                          <i className={'uk-icon-refresh uk-icon-spin'} />
                        </div>
                      }
                      useWindow={false}
                      getScrollParent={() => document.getElementById('watchers-page-content')}
                    >
                      <Table
                        style={{ margin: 0 }}
                        extraClass={'pDataTable'}
                        stickyHeader={true}
                        striped={true}
                        headers={[
                          <TableHeader key={1} width={'90%'} text={'Email'} />,
                          <TableHeader key={2} width={'12%'} />,
                        ]}
                      >
                        {this.state.watchers &&
                          this.state.watchers.map((value) => {
                            return (
                              <TableRow key={this.state.watchers.indexOf(value) + 1} clickable={true}>
                                <TableCell className={'vam nbb'}>
                                  <div
                                    key={this.state.watchers.indexOf(value) + 1}
                                    className={'uk-float-left'}
                                    style={{ marginLeft: -5 }}
                                  >
                                    {(this.props.ownerId == this.props.sessionUser._id ||
                                      this.props.sessionUser.role.isAdmin ||
                                      this.props.sessionUser.role.isAgent) && (
                                      <input
                                        name={'subject'}
                                        type="text"
                                        id="email"
                                        className={'md-input'}
                                        value={value.email}
                                        style={{ borderWidth: 0, width: 480 }}
                                        onChange={(event) => this.handleChange(event, value.key, event.target.id)}
                                        onBlur={(e) => {
                                          this.updateEmail(e, value);
                                        }}
                                      />
                                    )}
                                    {this.props.ownerId !== this.props.sessionUser._id &&
                                      !this.props.sessionUser.role.isAdmin &&
                                      !this.props.sessionUser.role.isAgent && (
                                        <input
                                          readOnly
                                          name={'subject'}
                                          type="text"
                                          id="email"
                                          className={'md-input'}
                                          value={value.email}
                                          style={{ borderWidth: 0, width: 480 }}
                                        />
                                      )}
                                  </div>
                                </TableCell>
                                <TableCell className={'vam nbb'}>
                                  {(this.props.ownerId == this.props.sessionUser._id ||
                                    this.props.sessionUser.role.isAdmin ||
                                    this.props.sessionUser.role.isAgent) && (
                                    <div style={{ position: 'relative' }}>
                                      <span
                                        className="material-icons"
                                        style={{ top: 15, left: 'auto', color: '#c8d6e6', fontSize: 20 }}
                                        onClick={() => {
                                          this.showTickCross(value._id);
                                        }}
                                        id={`delete-${value._id}`}
                                      >
                                        delete
                                      </span>
                                      <span
                                        className="material-icons"
                                        style={{
                                          top: 15,
                                          left: 'auto',
                                          color: '#c8d6e6',
                                          fontSize: 20,
                                          display: 'none',
                                          marginLeft: -13,
                                        }}
                                        onClick={() => {
                                          this.removeEmail(value, this.props.ticketId);
                                        }}
                                        id={`tick-${value._id}`}
                                      >
                                        check
                                      </span>
                                      <span
                                        className="material-icons"
                                        style={{
                                          top: 15,
                                          left: 'auto',
                                          color: '#c8d6e6',
                                          fontSize: 20,
                                          display: 'none',
                                          paddingLeft: 5,
                                        }}
                                        onClick={() => {
                                          this.hideTickCross(value._id);
                                        }}
                                        id={`cross-${value._id}`}
                                      >
                                        close
                                      </span>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </Table>
                    </InfiniteScroll>
                  </PageContentWatchers>
                  <div className="uk-modal-footer uk-text-right">
                    <Button
                      text={'Close'}
                      flat={true}
                      waves={true}
                      // extraClass={'uk-modal-close'}
                      onClick={() => {
                        this.onFormSubmit();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </BaseModal>
    );
  }
}

WatchersModal.propTypes = {
  updateSetting: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  socket: state.shared.socket,
  settings: state.settings.settings,
  sessionUser: state.shared.sessionUser,
  currentTicketId: state.ticketsState.currentTicketId,
});

export default connect(mapStateToProps, { updateSetting, fetchWatchers, hideModal })(WatchersModal);
