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
 *  Updated:    9/18/21 11:41 AM
 *  Copyright (c) 2014-2021. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { updateSetting, updateMultipleSettings } from 'actions/settings'


import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'

import EnableSwitch from 'components/Settings/EnableSwitch'
import { observer } from 'mobx-react'
import { makeObservable, observable } from 'mobx'


@observer
class ChatwootSettingsController extends React.Component {
  @observable chatwootEnabled = false
  constructor(props) {
    super(props)

    makeObservable(this)

    this.state = {
      chatwootMessageTemplate: '',
      chatwootStatusChangeMessageTemplate: '',
      chatwootUrl: ''
    }

  }

  componentDidMount() {
    // helpers.UI.inputs()
  }

  updateSetting(stateName, name, value) {
    this.props.updateSetting({ stateName, name, value })
  }

  componentDidUpdate(prevProps) {
    // helpers.UI.reRenderInputs()
    if (prevProps.settings !== this.props.settings) {
      if (this.chatwootEnabled !== this.getSetting('chatwootSettings'))
        this.chatwootEnabled = this.getSetting('chatwootSettings')
      if (this.state.chatwootMessageTemplate !== this.getSetting('chatwootMessageTemplate') && this.getSetting('chatwootMessageTemplate') !== true)
        this.state.chatwootMessageTemplate = this.getSetting('chatwootMessageTemplate')
      if (this.state.chatwootStatusChangeMessageTemplate !== this.getSetting('chatwootStatusChangeMessageTemplate') && this.getSetting('chatwootStatusChangeMessageTemplate') !== true)
        this.state.chatwootStatusChangeMessageTemplate = this.getSetting('chatwootStatusChangeMessageTemplate')
      if (this.state.chatwootUrl !== this.getSetting('chatwootUrl') && this.getSetting('chatwootUrl') !== true)
        this.state.chatwootUrl = this.getSetting('chatwootUrl')
    }
  }

  onInputValueChanged(e, stateName) {
    this.setState({
      [stateName]: e.target.value
    })
  }

  getSetting(stateName) {
    return this.props.settings.getIn(['settings', stateName, 'value'])
      ? this.props.settings.getIn(['settings', stateName, 'value'])
      : ''
  }

  onFormSubmit(e) {
    e.preventDefault()
    const chatwootSettings = [
      { name: 'chatwootSettings:messageTemplate', value: this.state.chatwootMessageTemplate },
      { name: 'chatwootSettings:statusChangeMessageTemplate', value: this.state.chatwootStatusChangeMessageTemplate },
      { name: 'chatwootSettings:url', value: this.state.chatwootUrl },
    ]
    this.props.updateMultipleSettings(chatwootSettings);

  }

  render() {
    const { active } = this.props
    return (
      <div className={active ? 'active' : 'hide'}>
        <SettingItem
          title={'Chatwoot'}
          subtitle={'Enable Chatwoot integration'}
          component={
            <EnableSwitch
              stateName={'chatwootSettings'}
              label={'Enable'}
              checked={this.chatwootEnabled}
              onChange={e => {
                this.updateSetting('chatwootSettings', 'chatwootSettings:enable', e.target.checked)
              }}
            />
          }
        >
        </SettingItem>
        <SettingItem
          title={'Chatwoot URL'}
        >
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              name={'chatwootUrl'}
              value={this.state.chatwootUrl}
              onChange={e => this.onInputValueChanged(e, 'chatwootUrl')}
              disabled={!this.getSetting('chatwootSettings')}
            />
        </SettingItem>

        <div className={active ? 'active' : 'hide'}>
          <div>
            <SettingItem
              title={'Notification "Ticket Created" message template'}
              tooltip={`
              Template Parameters: 
              <br><br>
              {{phoneNumber}} - customer phone number 
              <br><br>
              {{ticketLink}} - link to the ticket
              <br><br>
              {{ticketUID}} - ticket number
              <br><br>
              {{ticketSubject}} - ticket theme
              <br><br>       
              {{ticketStatus}} - ticket status
              <br><br>    
              {{contactName}} - customer name 
              <br><br>
              `}
            >
              <form onSubmit={e => this.onFormSubmit(e)}>
                <div className='uk-margin-medium-bottom'>
                  <textarea
                    type='text'
                    className={'md-input md-input-width-medium'}
                    name={''}
                    value={this.state.chatwootMessageTemplate}
                    onChange={e => this.onInputValueChanged(e, 'chatwootMessageTemplate')}
                    style={{ 'height': '200px', 'padding-top': '30px' }}
                    disabled={!this.getSetting('chatwootSettings')}
                  />
                </div>
                <Button
                  text={'Apply'}
                  type={'submit'}
                  extraClass={'uk-float-right'}
                  flat={true}
                  waves={true}
                  style={'success'}
                // disabled={!this.getSetting('mailerCheckEnabled')}
                />
              </form>
            </SettingItem>

          </div>
        </div>
      </div>
    )
  }
}

ChatwootSettingsController.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(ChatwootSettingsController)
