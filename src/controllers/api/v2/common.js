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
 *  Updated:    2/14/19 12:30 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const User = require('../../../models/user')
const LDAPGroup = require('../../../models/ldapGroup')
const apiUtils = require('../apiUtils')
const passport = require('passport')
const winston = require('winston')
const ldapClient = require('../../../ldap')
const { c } = require('tar')

const commonV2 = {}

commonV2.login = async (req, res) => {
  const username = req.body.username
  const password = req.body.password

  if (!username || !password) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const user = await User.getUserByUsername(username)
    if (!user) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password')

    if (!User.validate(password, user.password)) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password')

    const tokens = await apiUtils.generateJWTToken(user)

    return apiUtils.sendApiSuccess(res, { token: tokens.token, refreshToken: tokens.refreshToken })
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message)
  }
}

// Обработка данных из формы Chatwoot
commonV2.loginChatwoot = async (req, res) => {
  
  data =req.body.phone_number;
  

  // const username = req.body.username
  // const password = req.body.password

  // if (!username || !password) return apiUtils.sendApiError_InvalidPostData(res)

  // try {
  //   const user = await User.getUserByUsername(username)
  //   if (!user) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password')

  //   if (!User.validate(password, user.password)) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password')

  //   const tokens = await apiUtils.generateJWTToken(user)

  //   return apiUtils.sendApiSuccess(res, { token: tokens.token, refreshToken: tokens.refreshToken })
  // } catch (e) {
  //   return apiUtils.sendApiError(res, 500, e.message)
  // }
}

commonV2.loginLDAP = async (req, res) => {

  ldapCallBack = function (req, username, password, done) {
    // for (group of req.memberOf){
    //   console.log(group);
    //   if (group = 'CN=rocket,OU=Groups,DC=shatura,DC=pro'){
    //       role = 'admin';
    //   }
    // }
    console.log(req);
    console.log(username);
    // return done(null, username);
    User.findOne({ username: new RegExp('^' + username.trim() + '$', 'i') })
      .select('+password +tOTPKey +tOTPPeriod')
      .exec(function (err, user) {
        if (err) {
          return done(err)
        }

        if (!user || user.deleted || !User.validate(password, user.password)) {
          req.flash('loginMessage', '')
          //Функция создания пользователя в db с ролями
          return done(null, false, req.flash('loginMessage', 'Invalid Username/Password'))
        }
        //Функция проверки ролей пользователя, удаление или добавление ролей
        req.user = user

        return done(null, user)
      })
  }

  ldapClient.bind(req.body.ldapHost, req.body.ldapBindDN, req.body['login-password'], ldapCallBack)

}

commonV2.pushLDAPGroup = async (req, res) => {
  const ldapGroups = req.body.dnGroupsArray;
  for (let group of ldapGroups) {

    LDAPGroup.findOne({ name: group }, function (err, ldapGroup) {

      if (err) return console.log(err);
      if (ldapGroup !== null && ldapGroup !== undefined) {
        console.log('Group found: ' + ldapGroup.name);
      } else if (ldapGroup !== undefined) {

        LDAPGroup.insertMany({ name: group }, function (err, ldapGroup) {
          if (err) return console.log(err);
          console.log('Group added: ' + ldapGroup[0].name)
        })
      }
    })
  }

  LDAPGroup.find()
    .then(ldapGroupsMDB => {
      for (let group of ldapGroupsMDB) {
        if (group.name !== undefined) {
          if (ldapGroups.includes(group.name)) {
            console.log('The group "' + group.name + '" exists in LDAP');
          } else {
            console.log('The group "' + group.name + '" does not exist in LDAP');
            LDAPGroup.remove({ _id: group._id }, function (err, ldapGroup) {
              if (err) return console.log(err);
              console.log('Group deleted: ' + group.name)
            })
          }
        }
      }

    })
    .catch(error => {
      console.log(error);
    })

  console.log(req);
}


commonV2.token = async (req, res) => {
  const refreshToken = req.body.refreshToken
  if (!refreshToken) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const user = await User.getUserByAccessToken(refreshToken)
    if (!user) return apiUtils.sendApiError(res, 401)

    const tokens = await apiUtils.generateJWTToken(user)

    return apiUtils.sendApiSuccess(res, { token: tokens.token, refreshToken: tokens.refreshToken })
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message)
  }
}

commonV2.viewData = async (req, res) => {
  return apiUtils.sendApiSuccess(res, { viewdata: req.viewdata })
}

module.exports = commonV2
