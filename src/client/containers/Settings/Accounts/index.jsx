/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    5/17/22 2:20 PM
 *  Copyright (c) 2014-2022. All rights reserved.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { updateSetting, updateMultipleSettings, fetchRoles } from 'actions/settings';
import { fetchLDAPGroups } from 'actions/ldapGroups';
import { fetchSettings } from 'actions/settings';

import Button from 'components/Button';
import SettingItem from 'components/Settings/SettingItem';
import SettingSubItem from 'components/Settings/SettingSubItem';
import SingleSelect from 'components/SingleSelect';
import Zone from 'components/ZoneBox/zone';
import ZoneBox from 'components/ZoneBox';

import helpers from 'lib/helpers';
import axios from 'axios';
import Log from '../../../logger';
import EnableSwitch from 'components/Settings/EnableSwitch';
import { observer } from 'mobx-react';
import { makeObservable, observable } from 'mobx';

@observer
class AccountsSettingsContainer extends React.Component {
  @observable passwordComplexityEnabled = false;
  @observable allowUserRegistrationEnabled = false;
  @observable ldapEnabled = false;
  @observable siteURL = '';
  @observable loader = 'none';

  ldapGroupsArray = [];

  constructor(props) {
    super(props);

    makeObservable(this);

    this.state = {
      restarting: false,
      ldapHost: '',
      ldapBindDN: '',
      ldapPassword: '',
      ldapUsername: '',
      ldapPathToGroups: '',
      ldapSearchBase: '',
      ldapAuthorizationDomains: '',
      mapping: [],
      rolesArray: [],
      ldapEnabled: false,
      ldapGArray: [],
      focusInput: false,
    };

    this.restartServer = this.restartServer.bind(this);
  }

  componentDidMount() {
    this.getRoles();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.settings !== this.props.settings) {
      if (this.passwordComplexityEnabled !== this.getSetting('accountsPasswordComplexity'))
        this.passwordComplexityEnabled = this.getSetting('accountsPasswordComplexity');
      if (this.allowUserRegistrationEnabled !== this.getSetting('allowUserRegistration'))
        this.allowUserRegistrationEnabled = this.getSetting('allowUserRegistration');
      if (this.ldapEnabled !== this.getSetting('ldapSettings')) this.ldapEnabled = this.getSetting('ldapSettings');
      this.state.ldapEnabled = !this.ldapEnabled;
      if (this.state.ldapHost !== this.getSetting('ldapHost') && this.getSetting('ldapHost') !== true)
        this.state.ldapHost = this.getSetting('ldapHost');
      if (this.state.ldapBindDN !== this.getSetting('ldapBindDN') && this.getSetting('ldapBindDN') !== true)
        this.state.ldapBindDN = this.getSetting('ldapBindDN');
      if (this.state.ldapPassword !== this.getSetting('ldapPassword') && this.getSetting('ldapPassword') !== true)
        this.state.ldapPassword = this.getSetting('ldapPassword');
      if (
        this.state.ldapPathToGroups !== this.getSetting('ldapPathToGroups') &&
        this.getSetting('ldapPathToGroups') !== true
      )
        this.state.ldapPathToGroups = this.getSetting('ldapPathToGroups');
      if (this.state.ldapSearchBase !== this.getSetting('ldapSearchBase') && this.getSetting('ldapSearchBase') !== true)
        this.state.ldapSearchBase = this.getSetting('ldapSearchBase');
      if (
        this.state.ldapAuthorizationDomains !== this.getSetting('ldapAuthorizationDomains') &&
        this.getSetting('ldapAuthorizationDomains') !== true
      )
        this.state.ldapAuthorizationDomains = this.getSetting('ldapAuthorizationDomains');
    }
  }

  restartServer() {
    this.setState({ restarting: true });

    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    axios
      .post(
        '/api/v1/admin/restart',
        {},
        {
          headers: {
            'CSRF-TOKEN': token,
          },
        }
      )
      .catch((error) => {
        helpers.hideLoader();
        Log.error(error.responseText);
        Log.error('Unable to restart server. Server must run under PM2 and Account must have admin rights.');
        helpers.UI.showSnackbar('Unable to restart server. Are you an Administrator?', true);
      })
      .then(() => {
        this.setState({ restarting: false });
      });
  }

  getSetting(stateName) {
    return this.props.settings.getIn(['settings', stateName, 'value'])
      ? this.props.settings.getIn(['settings', stateName, 'value'])
      : '';
  }

  updateSetting(stateName, name, value) {
    this.props.updateSetting({ stateName, name, value });
  }

  onFocus = () => {
    this.setState({ focusInput: true });
  };

  onBlur = () => {
    this.setState({ focusInput: false });
  };

  async getRoles() {
    await axios
      .get('/api/v1/roles')
      .then((res) => {
        let rolesArray = res.data.roles;
        let rolesName = [];
        for (let i = 0; i < rolesArray.length; i++) {
          if (rolesArray[i]['name'] !== 'User') {
            rolesName.push({
              name: rolesArray[i]['name'],
              _id: rolesArray[i]['_id'],
              ldapGroupID: rolesArray[i]['ldapGroupID'],
            });
          }
        }
        this.setState({ rolesArray: rolesName });
        this.getLDAPGroups();
        this.forceUpdate();
      })
      .catch((err) => {
        console.log(err);
      });
  }

  getLDAPGroups() {
    let ldapGArray = [];
    this.loader = 'block';
    axios
      .get(`${this.siteURL}/api/v2/ldapGroups`)
      .then((res) => {
        this.ldapGroupsArray = res.data.ldapGroups;
        for (let i = 0; i < this.ldapGroupsArray.length; i++) {
          ldapGArray.push({ text: this.ldapGroupsArray[i]['name'], value: this.ldapGroupsArray[i]['_id'] });
        }
        this.setState({ ldapGArray: ldapGArray });
        this.loader = 'none';
      })
      .catch((err) => {
        console.log(err);
      });
  }

  onInputValueChanged(e, stateName) {
    e.target.value = e.target.value.replace('  ', ' ');
    this.setState({
      [stateName]: e.target.value,
    });
  }

  async updateMapping(mapping, ldapSettings) {
    await axios
      .put(`/api/v2/ldapGroups/updateMapping`, mapping)
      .then((res) => {
        if (res.data && res.data.success) helpers.UI.showSnackbar('Mapping success');
        this.getRoles();
        this.props.updateMultipleSettings(ldapSettings);
      })
      .catch((err) => {
        Log.error(err);
        helpers.UI.showSnackbar(err, true);
      });
  }

  addToMap(e, role, ldapGroupID) {
    let roleExist = false;
    for (let map of this.state.mapping) {
      if (map.roleID == role._id) {
        map.ldapGroupID = ldapGroupID;
        roleExist = true;
      }
    }

    if (roleExist == false) {
      this.state.mapping.push({ roleID: role._id, ldapGroupID: ldapGroupID });
    }
  }

  onCheckNowClicked(e) {
    this.loader = 'block';
    axios
      .post(`/api/v2/loginLDAP`, {
        'login-password': this.state.ldapPassword,
        ldapHost: this.state.ldapHost,
        ldapBindDN: this.state.ldapBindDN,
        ldapSearchBase: this.state.ldapSearchBase,
        ldapPathToGroups: this.state.ldapPathToGroups,
        ldapAuthorizationDomains: this.state.ldapAuthorizationDomains,
      })
      .then((res) => {
        console.log('Ответ получен');
        if (res.data && res.data.success) helpers.UI.showSnackbar('Mapping success');
        const ldapGArray = this.getLDAPGroups();
        const rolesArray = this.getRoles();
        if (this.state.ldapGArray !== ldapGArray) {
          this.setState({
            ldapGArray: ldapGArray,
            rolesArray: rolesArray,
          });
          this.forceUpdate();
        }
      })
      .catch((err) => {
        console.log('Ошибка ответа');
        Log.error(err);
        helpers.UI.showSnackbar(err, true);
        this.forceUpdate();
      });
  }

  onFormSubmit(e) {
    e.preventDefault();
    const ldapSettings = [
      { name: 'ldapSettings:host', value: this.state.ldapHost },
      { name: 'ldapSettings:bindDN', value: this.state.ldapBindDN },
      { name: 'ldapSettings:password', value: this.state.ldapPassword },
      { name: 'ldapSettings:pathToGroups', value: this.state.ldapPathToGroups },
      { name: 'ldapSettings:searchBase', value: this.state.ldapSearchBase },
      { name: 'ldapSettings:authorizationDomains', value: this.state.ldapAuthorizationDomains },
    ];

    this.props.updateMultipleSettings(ldapSettings);
    this.updateMapping(this.state.mapping, ldapSettings);
  }

  render() {
    this.siteURL = this.getSetting('siteurl');
    let checkNowDisabled = true;
    if (
      this.getSetting('ldapSettings') &&
      this.getSetting('ldapSettings') !== '' &&
      this.getSetting('ldapHost') &&
      this.getSetting('ldapHost') !== '' &&
      this.getSetting('ldapBindDN') &&
      this.getSetting('ldapBindDN') !== '' &&
      this.getSetting('ldapPassword') &&
      this.getSetting('ldapPassword') !== '' &&
      this.getSetting('ldapPathToGroups') &&
      this.getSetting('ldapPathToGroups') !== '' &&
      this.getSetting('ldapSearchBase') &&
      this.getSetting('ldapSearchBase') !== '' &&
      this.getSetting('ldapAuthorizationDomains') &&
      this.getSetting('ldapAuthorizationDomains') !== ''
    ) {
      checkNowDisabled = false;
    } else {
      checkNowDisabled = true;
    }

    const ElementArray = ({ role }) => {
      const roleGroup = role;
      return (
        <ZoneBox>
          <SettingSubItem
            title={role.name}
            value={role._id}
            component={
              <SingleSelect
                width="60%"
                showTextbox={false}
                items={this.state.ldapGArray}
                defaultValue={roleGroup.ldapGroupID}
                disabled={this.state.ldapEnabled}
                onSelectChange={(e) => {
                  this.addToMap(e, roleGroup, e.target.value);
                }}
              />
            }
          />
        </ZoneBox>
      );
    };

    const { active } = this.props;
    return (
      <div className={active ? 'active' : 'hide'}>
        <SettingItem
          title="Allow User Registration"
          subtitle="Allow users to create accounts on the login screen."
          component={
            <EnableSwitch
              stateName="allowUserRegistration"
              label="Enable"
              checked={this.allowUserRegistrationEnabled}
              onChange={(e) => {
                this.updateSetting('allowUserRegistration', 'allowUserRegistration:enable', e.target.checked);
              }}
            />
          }
        />
        <SettingItem
          title={'Password Complexity'}
          subtitle={'Require users passwords to meet minimum password complexity'}
          tooltip={'Minimum 8 characters with uppercase and numeric.'}
          component={
            <EnableSwitch
              stateName={'accountsPasswordComplexity'}
              label={'Enable'}
              checked={this.passwordComplexityEnabled}
              onChange={(e) => {
                this.updateSetting('accountsPasswordComplexity', 'accountsPasswordComplexity:enable', e.target.checked);
              }}
            />
          }
        />

        <SettingItem
          title={'LDAP Settings'}
          component={
            <EnableSwitch
              stateName={'ldapSettings'}
              label={'Enable'}
              checked={this.ldapEnabled}
              onChange={(e) => {
                this.state.ldapEnabled = !this.state.ldapEnabled;
                this.updateSetting('ldapSettings', 'ldapSettings:enable', e.target.checked);
              }}
            />
          }
        >
          <div id="LDAPSettings">
            <form onSubmit={(e) => this.onFormSubmit(e)}>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Authorization Domains</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'ldapAuthorizationDomains'}
                  value={this.state.ldapAuthorizationDomains}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapAuthorizationDomains')}
                  onFocus={this.onFocus}
                  onBlur={this.onBlur}
                  //placeholder={'@example1.com, @example2.com'}
                  placeholder={this.state.focusInput ? '@example1.com, @example2.com' : ''}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Server</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'ldapHost'}
                  value={this.state.ldapHost}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapHost')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Login</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'ldapBindDN'}
                  value={this.state.ldapBindDN}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapBindDN')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Password</label>
                <input
                  type="password"
                  className={'md-input md-input-width-medium'}
                  name={'ldapPassword'}
                  value={this.state.ldapPassword}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapPassword')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Path To Groups</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'ldapPathToGroups'}
                  value={this.state.ldapPathToGroups}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapPathToGroups')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>LDAP Search Base</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'ldapSearchBase'}
                  value={this.state.ldapSearchBase}
                  disabled={this.state.ldapEnabled}
                  onChange={(e) => this.onInputValueChanged(e, 'ldapSearchBase')}
                />
              </div>

              <Zone>
                {Array.isArray(this.state.rolesArray) &&
                  Array.isArray(this.state.ldapGArray) &&
                  this.state.rolesArray?.map((el) => <ElementArray role={el} />)}
              </Zone>

              <div style={{ paddingTop: 10, paddingRight: 10, textAlign: 'right', display: this.loader }}>
                Loading LDAP groups
                <div className="loader-spin uk-float-right" style={{ marginTop: -5, marginLeft: 10 }}></div>
              </div>

              <div className="uk-clearfix" style={{ paddingTop: '1%' }}>
                <Button
                  text={'Check Now'}
                  type={'button'}
                  extraClass={'uk-float-left'}
                  flat={true}
                  waves={true}
                  style={'primary'}
                  onClick={(e) => this.onCheckNowClicked(e)}
                  disabled={checkNowDisabled}
                />
                <Button
                  text={'Apply'}
                  type={'submit'}
                  extraClass={'uk-float-right'}
                  flat={true}
                  waves={true}
                  style={'success'}
                  disabled={this.state.ldapEnabled}
                />
              </div>
            </form>
          </div>
        </SettingItem>
      </div>
    );
  }
}

AccountsSettingsContainer.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  ldapGroups: PropTypes.object.isRequired,
  fetchLDAPGroups: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  settings: state.settings.settings,
  roles: state.shared.roles,
  ldapGroups: state.shared.ldapGroups,
});

export default connect(mapStateToProps, {
  updateSetting,
  updateMultipleSettings,
  fetchRoles,
  fetchLDAPGroups,
  fetchSettings,
})(AccountsSettingsContainer);
