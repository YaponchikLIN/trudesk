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
import mongoose from 'mongoose'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { makeObservable, observable } from 'mobx'
import { observer } from 'mobx-react'


import Table from 'components/Table'
import TableHeader from 'components/Table/TableHeader'
import TableRow from 'components/Table/TableRow'
import TitlePagination from 'components/TitlePagination'
import PageContent from 'components/PageContent'
import TableCell from 'components/Table/TableCell'
import { createAccount, fetchAccounts, saveEditAccount } from 'actions/accounts'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { fetchTeams, unloadTeams } from 'actions/teams'
import { fetchRoles,showModal } from 'actions/common'
import BaseModal from 'containers/Modals/BaseModal'
import MultiSelect from 'components/MultiSelect'
import Button from 'components/Button'
import SingleSelect from 'components/SingleSelect'
import helpers from 'lib/helpers'
import $ from 'jquery'
import SpinLoader from 'components/SpinLoader'
import Chance from 'chance'
import setting from '../../../models/setting'
import axios from 'axios'


@observer
class MappingChatwootContainer extends React.Component {

  @observable username = this.props.email
  @observable fullname = this.props.username
  @observable email = this.props.email
  // @observable phone = this.props.phone.replace(' ','+')
  @observable phone = this.props.phone.replace(' ', '+')
  @observable title = this.props.username
  @observable selectedUser = ''
  @observable defaultUser = '' 
  @observable isAgentRole = false
  @observable chance = new Chance()
  @observable plainTextPass = this.chance.string({
    length: 10,
    pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
  })
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
    this.props.fetchGroups({ type: 'all' })
    this.props.fetchTeams()
    this.props.fetchRoles()
    this.props.fetchAccounts()
    helpers.UI.inputs()
    helpers.formvalidator()
  }

  componentDidUpdate() {
    helpers.UI.reRenderInputs()
  }

  onInputChanged(e, name) {
    this[name] = e.target.value
  }

  onUserSelectChange(e) {
    this.selectedUser = e.target.value

    const userObject = this.props.accountsState.accounts.find(user => {
      return user.get('_id') === this.selectedUser
    })

    // this.isAgentRole = roleObject.get('isAdmin') || roleObject.get('isAgent')

    // if (!this.selectedRole || this.selectedRole.length < 1) this.roleSelectErrorMessage.classList.remove('hide')
    // else this.roleSelectErrorMessage.classList.add('hide')
  }

  onGroupSelectChange() {
    const selectedGroups = this.groupSelect.getSelected()
    console.log(selectedGroups)
    console.log(this.groupSelect)
    if (!selectedGroups || selectedGroups.length < 1) this.groupSelectErrorMessage.classList.remove('hide')
    else this.groupSelectErrorMessage.classList.add('hide')
  }

  //Валидация номера телефона
  _validatePhone(phone) {
    if (!phone) return false
    return phone
      .toString()
      .toLowerCase()
      .match(
        /^\+(\d{11})$/
      )
  }


  onFormSubmit(e) {
    e.preventDefault()
    if (this.selectedUser == undefined || this.selectedUser == ''){
      this.selectedUser = this.defaultUser;
    }
    if (!this._validatePhone(this.phone)) {
      helpers.UI.showSnackbar('Invalid Phone', true)
      return
    }

    const users = this.props.accountsState.accounts
      .map(user => {
        return { text: user.get('email'), value: user.get('_id'), username: user.get('username'), phone: user.get('phone') }
      })
      .toArray()

      let updateUser ={
        username: '',
        email:'',
        phone:''
      }

      for (let user of users) {
        if (user.value == this.selectedUser) {
          updateUser.username = user.username;
          updateUser.email = user.text;
          updateUser.phone = user.phone;
        }
      }

    const data = {
      username:  updateUser.username ,
      email:  updateUser.email,
      phone: this.phone
    }
    this.props.saveEditAccount(data)
  
    const contact = {
      "email": updateUser.email,
      "phone_number": this.phone
    }
    let config = {
      method: 'put',
      url: `https://cw.shatura.pro/api/v1/accounts/${this.accountID}/contacts/${this.contactID}`,
      headers: {
        'api_access_token': 'DmqbNynqFJFK7ZDdpHv4AQzf',
        'Content-Type': 'application/json',
      },
      data: contact
    };
    axios(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });
  }

  render() {

    const roles = this.props.roles
      .map(role => {
        return { text: role.get('name'), value: role.get('_id') }
      })
      .toArray()

    let defaultRole;
    for (let role of roles) {
      if (role.text == 'User') {
        defaultRole = role.value;
      }
    }

    const users = this.props.accountsState.accounts
      .map(user => {
        return { text: user.get('email'), value: user.get('_id'), phone: user.get('phone') }
      })
      .toArray()

    for (let user of users) {
      if (user.text == this.email) {
        this.defaultUser = user.value;
      }
    }

    if (this.defaultUser == undefined || this.defaultUser == '' ){
    for (let user of users) {
      if (user.phone == this.phone) {
        this.defaultUser = user.value;
      }
    }
  }

  const selectAllCheckbox = (
    <div style={{ marginLeft: 17 }}>
      <input
        type='checkbox'
        id={'select_all'}
        style={{ display: 'none' }}
        className='svgcheckinput'
        onChange={e => this.onSelectAll(e)}
        ref={r => (this.selectAllCheckbox = r)}
      />
      <label htmlFor={'select_all'} className='svgcheck'>
        <svg width='16px' height='16px' viewBox='0 0 18 18'>
          <path d='M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z' />
          <polyline points='1 9 7 14 15 4' />
        </svg>
      </label>
    </div>
  )
    return (
      <BaseModal parentExtraClass={'pt-0'} extraClass={'p-0 pb-25'}>
        <div className='user-heading-content' style={{ background: '#1976d2', padding: '24px' }}>
              <h2>
                <span className={'uk-text-truncate'}>User Mapping</span>
              </h2>
            </div>
        <div style={{ margin: '24px 24px 0 24px' }}>
          <form className='uk-form-stacked' onSubmit={e => this.onFormSubmit(e)}>
            <div className='uk-margin-medium-bottom'>
              <label className='uk-form-label'>Phone</label>
              <input
                type='text'
                className={'md-input'}
                value={this.phone}
                onChange={e => this.onInputChanged(e, 'phone')}
              />
            </div>
            <div className='uk-margin-medium-bottom'>
              <label className={'uk-form-label'}>User</label>
              <SingleSelect
                items={users}
                width={'100'}
                showTextbox={false}
                defaultValue={this.defaultUser}
                onSelectChange={e => this.onUserSelectChange(e)}
              />
              <span
                className='hide help-block'
                style={{ display: 'inline-block', marginTop: '10px', fontWeight: 'bold', color: '#d85030' }}
                ref={r => (this.roleSelectErrorMessage = r)}
              >
                Please select a role for this user
              </span>
            </div>
            <Table
            tableRef={ref => (this.ticketsTable = ref)}
            style={{ margin: 0 }}
            extraClass={'pDataTable'}
            stickyHeader={true}
            striped={true}
            headers={[
              <TableHeader key={0} width={'20%'} height={50} component={selectAllCheckbox} />,
              <TableHeader key={1} width={'20%'} text={'Username'} />,
              <TableHeader key={2} width={'20%'} text={'Name'} />,
              <TableHeader key={3} width={'20%'} text={'Email'} />,
              <TableHeader key={4} width={'20%'} text={'Group'} />,
            ]}
          >
            {
            
            this.props.accountsState.accounts.map(user => {
              groupUser =  this.props.groups.map(group => {
                  let foundGroup = group.members.filter(userGroup => userGroup == user._id);
                  if (foundGroup.length!==0){
                    return foundGroup[0];
                  }
                })
                return (
                  <TableRow
                    key={user.get('_id')}
                    clickable={true}
                  >
                    <TableCell className={'vam nbb'}>{user.get('username')}</TableCell>
                    <TableCell className={'vam nbb'}>{user.get('fullname')}</TableCell>
                    <TableCell className={'vam nbb'}>{user.get('email')}</TableCell>
                    <TableCell className={'vam nbb'}>{groupUser}</TableCell>

                  </TableRow>
                )
              })}

          </Table>
            <div className='uk-modal-footer uk-text-right'>
              <button class="uk-clearfix md-btn md-btn-flat  md-btn-wave waves-effect waves-button" type="button">
                <a class="uk-float-left uk-width-1-1 uk-text-center"  href={`https://trudesk-dev.shatura.pro/changeMappingOrCreate?username=${this.username}&phone=${this.phone}&email=${this.email}&contactID=${this.contactID}&accountID=${this.accountID}&customAttributes=${this.customAttributes}`}> 
                Close
                </a>
              </button>
              <Button text={'Link to Chatwoot'} flat={true} waves={true} style={'success'} type={'submit'} />
            </div>
          </form>
        </div>
      </BaseModal>

    )
  }
}

MappingChatwootContainer.propTypes = {
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
  showModal
})(MappingChatwootContainer)