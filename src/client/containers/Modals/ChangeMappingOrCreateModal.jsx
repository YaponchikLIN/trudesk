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
 *  Updated:    4/12/19 12:20 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react'

import { createAccount, fetchAccounts, saveEditAccount } from 'actions/accounts'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { fetchTeams, unloadTeams } from 'actions/teams'
import { fetchRoles, showModal } from 'actions/common'
import { fetchSettings } from 'actions/settings'
import BaseModal from 'containers/Modals/BaseModal'
import helpers from 'lib/helpers'
import Chance from 'chance'



@observer
class ChangeMappingOrCreateModalContainer extends React.Component {

  @observable username = this.props.email
  @observable fullname = this.props.fullname
  @observable email = this.props.email
  @observable phone = this.props.phone.replace(' ', '+')
  @observable title = this.props.username
  @observable selectedUser = ''
  @observable defaultUser = ''
  @observable isAgentRole = false
  @observable chance = new Chance()
  @observable plainTextPass = this.passGenerate()
  @observable password = this.plainTextPass
  @observable passwordConfirm = this.password
  @observable contactID = this.props.contactID
  @observable accountID = this.props.accountID
  @observable customAttributes = this.props.customAttributes
  @observable defaultRole
  @observable defaultGroup

  constructor(props) {
    super(props)
    makeObservable(this)
  }

  componentDidMount() {
    // this.props.fetchGroups({ type: 'all' })
    // this.props.fetchTeams()
    // this.props.fetchRoles()
    // this.props.fetchAccounts()
    this.props.fetchSettings()
    helpers.UI.inputs()
    helpers.formvalidator()
  }

  getSetting(stateName) {
    return this.props.settings.getIn(['settings', stateName, 'value'])
      ? this.props.settings.getIn(['settings', stateName, 'value'])
      : ''
  }
  
  passGenerate() {
    let passResult = false;
    while (passResult == false) {
      let pass = this.chance.string({
        length: 8,
        pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890',
        alpha: true,
        numeric: true,
        casing: 'lower',
      })
      if (pass.match(/[0-9]/) && pass.match(/[a-z]/) && pass.match(/[A-Z]/)) {
        passResult = true;
        return pass
      }
    }
  }
  render() {
    console.log(this.fullname)
    const siteURL = this.getSetting('siteurl');
    return (
      <BaseModal parentExtraClass={'pt-0'} extraClass={'p-0 pb-25'}>
        <div className=" uk-text-center" style={{ 'padding-top': '10px' }}>
          <h2>Select an action
          </h2></div>
        <div style={{ margin: ' 0px 25px 0px' }}>
          <div className='uk-modal-footer uk-text-center'>
            <a class={'md-btn'} style={{ fontSize: '20px', margin: '20px 5 0 5px', 'margin-right': '50px', color: 'white', 'background-color': '#7cb342' }} href={`${siteURL}/loginChatwoot?username=${this.username}&phone=${this.phone}&email=${this.email}&contactID=${this.contactID}&accountID=${this.accountID}&customAttributes=${this.customAttributes}&fullname=${this.fullname}`}>
              Create User
            </a>
            <a class={'md-btn'} style={{ fontSize: '20px', margin: '5px 5 0 20px', 'margin-left': '50px', color: 'white', 'background-color': '#1976d2' }} href={`${siteURL}/mappingChatwoot?username=${this.username}&phone=${this.phone}&email=${this.email}&contactID=${this.contactID}&accountID=${this.accountID}&customAttributes=${this.customAttributes}`}>
              User Mapping
            </a>
          </div>
        </div>
      </BaseModal>

    )
  }
}

ChangeMappingOrCreateModalContainer.propTypes = {
  common: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  teams: PropTypes.object.isRequired,
  roles: PropTypes.object.isRequired,
  createAccount: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  fetchTeams: PropTypes.func.isRequired,
  unloadTeams: PropTypes.func.isRequired,
  fetchRoles: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  accountsState: PropTypes.object.isRequired,
  saveEditAccount: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  roles: state.shared.roles,
  common: state.common,
  groups: state.groupsState.groups,
  teams: state.teamsState.teams,
  accountsState: state.accountsState,
  settings: state.settings.settings
})

export default connect(mapStateToProps, {
  createAccount,
  fetchGroups,
  unloadGroups,
  fetchTeams,
  unloadTeams,
  fetchRoles,
  fetchAccounts,
  saveEditAccount,
  showModal,
  fetchSettings
})(ChangeMappingOrCreateModalContainer)