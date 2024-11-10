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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import moment from 'moment-timezone';
import axios from 'axios';
import { updateSetting, updateMultipleSettings, fetchSettings } from 'actions/settings';
import { fetchGroups } from 'actions/groups';
import helpers from 'lib/helpers';

import SettingItem from 'components/Settings/SettingItem';

import InputWithSave from 'components/Settings/InputWithSave';
import SingleSelect from 'components/SingleSelect';
import Button from 'components/Button';
import SettingSubItem from 'components/Settings/SettingSubItem';
import Zone from 'components/ZoneBox/zone';
import ZoneBox from 'components/ZoneBox';

class GeneralSettings extends React.Component {
  constructor(props) {
    super(props);
    this.serviceKeyfileInput = React.createRef();
    this.imageInput = React.createRef();
    this.state = {
      fileUploaded: 'Upload a file',
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      vapidKey: '',
      siteUrl: '',
    };
  }

  componentDidMount() {
    this.checkFileServiceAccount();
    this.props.fetchGroups({ type: 'all' });
  }
  componentWillUnmount() {}

  getSettingsValue(name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : '';
  }

  updateSetting(stateName, name, value) {
    this.props.updateSetting({ stateName, name, value });
  }

  checkFileServiceAccount = () => {
    // Отправляем запрос на сервер с помощью axios
    axios
      .get('/api/v1/settings/general/checkFileServiceAccount')
      .then((response) => {
        // Получаем ответ от сервера
        const data = response.data;
        // Обрабатываем ответ от сервера
        if (data.exists) {
          // Если файл существует, то обновляем состояние компонента с сообщением об успехе
          this.setState({ fileUploaded: 'Service file uploaded' });
        } else {
          // Если файл не существует, то обновляем состояние компонента с сообщением об ошибке
          this.setState({ fileUploaded: 'Upload a file' });
        }
      })
      .catch((error) => {
        // Обрабатываем ошибку при отправке запроса
        console.error(error);
        // Обновляем состояние компонента с сообщением об ошибке
        this.setState({ fileUploaded: 'Upload a file' });
      });
  };

  handleChangeFileServiceAccount = (event) => {
    console.log('handleChangeFileServiceAccount');
    // Получаем файл из инпута
    const file = event.target.files[0];
    // Проверяем, что файл выбран
    if (file) {
      // Создаем объект FormData для отправки файла на сервер
      const formData = new FormData();
      formData.append('file', file);
      // Указываем папку, в которую нужно загрузить файл
      formData.append('folder', 'your_folder_name');
      // Отправляем запрос на сервер с помощью
      const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      axios({
        method: 'post',
        url: '/api/v1/settings/general/fileServiceAccount',
        timeout: 500000,
        headers: {
          'Content-Type': 'multipart/form-data',
          'CSRF-TOKEN': token,
        },
        data: formData,
      })
        .then((data) => {
          // Обрабатываем ответ от сервера
          helpers.UI.showSnackbar('Setting saved successfully.', false);
          this.setState({ fileUploaded: 'Service file uploaded' });
        })
        .catch((error) => {
          // Обрабатываем ошибку при отправке запроса
          console.error(error);
        });
    } else {
      // Выводим сообщение, если файл не выбран
      alert('Please select a file to upload');
    }
  };

  handleChangeImage = (event) => {
    console.log('handleChangeImage');
    // Получаем файл из инпута
    const file = event.target.files[0];
    // Проверяем, что файл выбран
    if (file) {
      // Создаем объект FormData для отправки файла на сервер
      const formData = new FormData();
      formData.append('file', file);
      // Указываем папку, в которую нужно загрузить файл
      formData.append('folder', 'your_folder_name');
      // Отправляем запрос на сервер с помощью
      const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
      axios({
        method: 'post',
        url: '/api/v1/settings/general/fileImage',
        timeout: 500000,
        headers: {
          'Content-Type': 'multipart/form-data',
          'CSRF-TOKEN': token,
        },
        data: formData,
      })
        .then((res) => {
          // Обрабатываем ответ от сервера
          helpers.UI.showSnackbar(res.data.message, false);
          this.setState({ fileUploaded: 'Service file uploaded' });
        })
        .catch((error) => {
          // Обрабатываем ошибку при отправке запроса
          helpers.UI.showSnackbar(error.response.data.message, true);
          console.error(error);
        });
    } else {
      // Выводим сообщение, если файл не выбран
      alert('Please select a file to upload');
    }
  };

  componentDidUpdate(prevProps) {
    if (prevProps.settings !== this.props.settings) {
      if (this.state.apiKey !== this.getSettingsValue('apiKey') && this.getSettingsValue('apiKey') !== true)
        this.setState({
          apiKey: this.getSettingsValue('apiKey'),
        });
      if (this.state.authDomain !== this.getSettingsValue('authDomain') && this.getSettingsValue('authDomain') !== true)
        this.setState({
          authDomain: this.getSettingsValue('authDomain'),
        });
      if (this.state.projectId !== this.getSettingsValue('projectId') && this.getSettingsValue('projectId') !== true)
        this.setState({
          projectId: this.getSettingsValue('projectId'),
        });
      if (
        this.state.storageBucket !== this.getSettingsValue('storageBucket') &&
        this.getSettingsValue('storageBucket') !== true
      )
        this.setState({
          storageBucket: this.getSettingsValue('storageBucket'),
        });
      if (
        this.state.messagingSenderId !== this.getSettingsValue('messagingSenderId') &&
        this.getSettingsValue('messagingSenderId') !== true
      )
        this.setState({
          messagingSenderId: this.getSettingsValue('messagingSenderId'),
        });
      if (this.state.appId !== this.getSettingsValue('appId') && this.getSettingsValue('appId') !== true)
        this.setState({
          appId: this.getSettingsValue('appId'),
        });
      if (this.state.vapidKey !== this.getSettingsValue('vapidKey') && this.getSettingsValue('vapidKey') !== true)
        this.setState({
          vapidKey: this.getSettingsValue('vapidKey'),
        });
      if (this.state.siteUrl !== this.getSettingsValue('siteUrl') && this.getSettingsValue('siteUrl') !== true)
        this.setState({
          siteUrl: this.getSettingsValue('siteUrl'),
        });
    }
  }

  getTimezones() {
    return moment.tz
      .names()
      .map(function (name) {
        const year = new Date().getUTCFullYear();
        const timezoneAtBeginningOfyear = moment.tz(year + '-01-01', name);
        return {
          utc: timezoneAtBeginningOfyear.utcOffset(),
          text: '(GMT' + timezoneAtBeginningOfyear.format('Z') + ') ' + name,
          value: name,
        };
      })
      .sort(function (a, b) {
        return a.utc - b.utc;
      });
  }

  onTimezoneChange(e) {
    if (e.target.value) this.updateSetting('timezone', 'gen:timezone', e.target.value);
  }

  onDefaultGroupChange(e) {
    if (e.target.value) this.updateSetting('defaultGroup', 'gen:defaultGroup', e.target.value);
  }

  onInputValueChanged(e, stateName) {
    this.setState({
      [stateName]: e.target.value,
    });
  }

  onFormSubmit(e) {
    e.preventDefault();

    const firebaseConfig = [
      { name: 'gen:apiKey', value: this.state.apiKey },
      { name: 'gen:authDomain', value: this.state.authDomain },
      { name: 'gen:projectId', value: this.state.projectId },
      { name: 'gen:storageBucket', value: this.state.storageBucket },
      { name: 'gen:messagingSenderId', value: this.state.messagingSenderId },
      { name: 'gen:appId', value: this.state.appId },
      { name: 'gen:vapidKey', value: this.state.vapidKey },
    ];

    const settings = {};
    settings.apiKey = this.state.apiKey;
    settings.authDomain = this.state.authDomain;
    settings.projectId = this.state.projectId;
    settings.storageBucket = this.state.storageBucket;
    settings.messagingSenderId = this.state.messagingSenderId;
    settings.appId = this.state.appId;
    settings.siteUrl = this.state.siteUrl;
    this.props.updateMultipleSettings(firebaseConfig);
    axios.post('/api/v1/settings/general/firebaseMessagingSw', { settings });
  }

  render() {
    const { active } = this.props;
    const groups = this.props.groups
      .map((grp) => {
        return { text: grp.get('name'), value: grp.get('_id') };
      })
      .toArray();
    const SiteTitle = (
      <InputWithSave
        stateName="siteTitle"
        settingName="gen:sitetitle"
        initialValue={this.getSettingsValue('siteTitle')}
      />
    );

    const SiteUrl = (
      <InputWithSave stateName="siteUrl" settingName="gen:siteurl" initialValue={this.getSettingsValue('siteUrl')} />
    );

    const DefaultGroup = (
      <SingleSelect
        stateName="defaultGroup"
        settingName="gen:defaultGroup"
        items={groups}
        defaultValue={this.getSettingsValue('defaultGroup')}
        onSelectChange={(e) => {
          this.onDefaultGroupChange(e);
        }}
        showTextbox={true}
      />
    );

    const Timezone = (
      <SingleSelect
        stateName="timezone"
        settingName="gen:timezone"
        items={this.getTimezones()}
        defaultValue={this.getSettingsValue('timezone')}
        onSelectChange={(e) => {
          this.onTimezoneChange(e);
        }}
        showTextbox={true}
      />
    );

    return (
      <div className={active ? 'active' : 'hide'}>
        <SettingItem
          title="Site Title"
          subtitle={
            <div>
              Title of site. Used as page title. <i>default: Trudesk</i>
            </div>
          }
          component={SiteTitle}
        />
        <SettingItem
          title="Site Url"
          subtitle={
            <div>
              Publicly accessible URL of this site. <i>ex: {this.props.viewdata.get('hosturl')}</i>
            </div>
          }
          component={SiteUrl}
        />
        <SettingItem
          title="Default Customer Group"
          subtitle={<div>Default customer group for users with unknown domain.</div>}
          component={DefaultGroup}
        />
        <SettingItem
          title="Time Zone"
          subtitle="Set the local timezone for date display"
          tooltip="Requires Server Restart"
          component={Timezone}
        />
        <SettingItem
          title="Time & Date Format"
          subtitle={
            <a href="https://momentjs.com/docs/#/displaying/format/" rel="noopener noreferrer" target="_blank">
              Moment.js Format Options
            </a>
          }
        >
          <Zone>
            <ZoneBox>
              <SettingSubItem
                title="Time Format"
                subtitle="Set the format for time display"
                component={
                  <InputWithSave
                    stateName="timeFormat"
                    settingName="gen:timeFormat"
                    initialValue={this.getSettingsValue('timeFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title="Short Date Format"
                subtitle="Set the format for short dates"
                component={
                  <InputWithSave
                    stateName="shortDateFormat"
                    settingName="gen:shortDateFormat"
                    initialValue={this.getSettingsValue('shortDateFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title="Long Date Format"
                subtitle="Set the format for long dates"
                component={
                  <InputWithSave
                    stateName="longDateFormat"
                    settingName="gen:longDateFormat"
                    initialValue={this.getSettingsValue('longDateFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
          </Zone>
        </SettingItem>
        <SettingItem
          title="Notification FCM"
          // subtitle={
          //   <a href="https://momentjs.com/docs/#/displaying/format/" rel="noopener noreferrer" target="_blank">
          //     Moment.js Format Options
          //   </a>
          // }
        >
          <div id="LDAPSettings">
            <form onSubmit={(e) => this.onFormSubmit(e)}>
              <div className="uk-margin-medium-bottom">
                <label>Api Key</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'apiKey'}
                  value={this.state.apiKey}
                  onChange={(e) => this.onInputValueChanged(e, 'apiKey')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>Auth Domain</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'authDomain'}
                  value={this.state.authDomain}
                  onChange={(e) => this.onInputValueChanged(e, 'authDomain')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>Project ID</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'projectId'}
                  value={this.state.projectId}
                  onChange={(e) => this.onInputValueChanged(e, 'projectId')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>Storage Bucket</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'storageBucket'}
                  value={this.state.storageBucket}
                  onChange={(e) => this.onInputValueChanged(e, 'storageBucket')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>Messaging Sender ID</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'messagingSenderId'}
                  value={this.state.messagingSenderId}
                  onChange={(e) => this.onInputValueChanged(e, 'messagingSenderId')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>App ID</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'appId'}
                  value={this.state.appId}
                  onChange={(e) => this.onInputValueChanged(e, 'appId')}
                />
              </div>
              <div className="uk-margin-medium-bottom">
                <label>Vapid Key</label>
                <input
                  type="text"
                  className={'md-input md-input-width-medium'}
                  name={'vapidKey'}
                  value={this.state.vapidKey}
                  onChange={(e) => this.onInputValueChanged(e, 'vapidKey')}
                />
              </div>
              <div className="ticket-type-general-wrapper">
                <h6
                  style={{
                    margin: '15px 0px 0px',
                    fontSize: '16px',
                    lineHeight: '14px',
                    marginBottom: -30,
                  }}
                >
                  {/* {this.state.fileUploaded} */}
                  Service account key file
                </h6>
                <div className="uk-width-1-1 uk-float-right" style={{ textAlign: 'right', marginBottom: 10 }}>
                  <div className="add-attachment">
                    <div>
                      <div className="add-attachment" onClick={(e) => this.serviceKeyfileInput.click()}>
                        <Button text={'Upload'} small={true} />
                      </div>
                      <input
                        ref={(r) => (this.serviceKeyfileInput = r)}
                        className="hide"
                        type="file"
                        onChange={this.handleChangeFileServiceAccount}
                      />
                    </div>
                  </div>
                  <input className="hide" type="file" />
                </div>
                <hr className="uk-margin-medium-bottom" />
              </div>
              <div className="ticket-type-general-wrapper">
                <div className="left">
                  <h6
                    style={{
                      fontSize: '16px',
                      lineHeight: '14px',
                      marginBottom: 0,
                    }}
                  >
                    {/* {this.state.fileUploaded} */}
                    Notification image file
                  </h6>
                  <h5 style={{ fontSize: '12px', marginBottom: -35 }} className="uk-text-muted">
                    Upload an image for notifications. Note: height and width should be in the range of 50-300px
                  </h5>
                </div>
                <div className="uk-width-1-1 uk-float-right" style={{ textAlign: 'right', marginBottom: 10 }}>
                  <div className="add-attachment">
                    <div>
                      <div className="add-attachment" onClick={(e) => this.imageInput.click()}>
                        <Button text={'Upload'} small={true} />
                      </div>
                      <input
                        ref={(r) => (this.imageInput = r)}
                        className="hide"
                        type="file"
                        onChange={this.handleChangeImage}
                      />
                    </div>
                  </div>
                  <input className="hide" type="file" />
                </div>
                <hr className="uk-margin-medium-bottom" />
              </div>
              <div className="uk-clearfix" style={{ paddingTop: '1%' }}>
                <Button
                  text={'Apply'}
                  type={'submit'}
                  extraClass={'uk-float-right'}
                  flat={true}
                  waves={true}
                  style={'success'}
                  // disabled={this.state.ldapEnabled}
                />
              </div>
            </form>
          </div>
        </SettingItem>
      </div>
    );
  }
}

GeneralSettings.propTypes = {
  active: PropTypes.bool,
  updateSetting: PropTypes.func.isRequired,
  viewdata: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  fetchGroups: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  viewdata: state.common.viewdata,
  settings: state.settings.settings,
  groups: state.groupsState.groups,
});

export default connect(mapStateToProps, { updateSetting, fetchGroups, updateMultipleSettings, fetchSettings })(
  GeneralSettings
);
