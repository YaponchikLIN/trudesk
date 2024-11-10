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

const User = require('../../../models/user');
const Setting = require('../../../models/setting');
const LDAPGroup = require('../../../models/ldapGroup');
const apiUtils = require('../apiUtils');
const ldapClient = require('../../../ldap');
const axios = require('axios');
const commonV2 = {};

commonV2.login = async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) return apiUtils.sendApiError_InvalidPostData(res);

  try {
    const user = await User.getUserByUsername(username);
    if (!user) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password');

    if (!User.validate(password, user.password)) return apiUtils.sendApiError(res, 401, 'Invalid Username/Password');

    const tokens = await apiUtils.generateJWTToken(user);

    return apiUtils.sendApiSuccess(res, { token: tokens.token, refreshToken: tokens.refreshToken });
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message);
  }
};

// Обработка данных из формы Chatwoot
commonV2.loginChatwoot = async (req, res) => {
  const payload = {
    username: req.body.username,
    phone: req.body.phone,
    email: req.body.email,
  };

  User.createUserFromChatwoot(payload, function (err, response) {
    if (err) return apiUtils.sendApiSuccess(res);

    return apiUtils.sendApiError(res, 500, e.message);
  });
};

commonV2.loginLDAP = async (req, res) => {
  ldapCallBack = function (error, response, username, password, done) {
    try {
      return apiUtils.sendApiSuccess(res);
    } catch {
      return apiUtils.sendApiError(res, 500, error);
    }
  };

  ldapClient.bind(req.body.ldapHost, req.body.ldapBindDN, req.body['login-password'], ldapCallBack);
};

commonV2.pushLDAPGroup = (dnGroupsArray, callback) => {

  try {

    const ldapGroups = dnGroupsArray;

    let result = [];

    ldapGroups.forEach(group => {

      LDAPGroup.findOne({ name: group }, (err, ldapGroup) => {

        if (err) return callback(err);

        if (ldapGroup) {
          result.push({ message: `Group exists: ${ldapGroup.name}` });
        } else {
          LDAPGroup.insertMany({ name: group }, (err, newLdapGroup) => {
            if (err) return callback(err);

            result.push({ message: `Added group: ${newLdapGroup[0].name}` });
          });
        }

      });

    });

    LDAPGroup.find()
      .then(ldapGroups => {

        ldapGroups.forEach(group => {
          if (!ldapGroups.includes(group.name)) {
            LDAPGroup.remove({ _id: group._id }, err => {
              if (err) return callback(err);

              result.push({ message: `Removed group: ${group.name}` });
            });
          }
        });

        return callback(null, result);

      })
      .catch(err => callback(err));

  } catch (err) {
    callback(err);
  }

}
commonV2.requestChatwoot = function (req, res) {
  Setting.findOne({ name: 'chatwootSettings:url' }, (err, setting) => {
    if (err) {
      return apiUtils.sendApiError(res, 500, error.message);
    }

    const config = {
      method: 'put',
      url: `${setting.value}/api/v1/accounts/${req.body.accountID}/contacts/${req.body.contactID}`,
      headers: {
        api_access_token: req.body.chatwootApiKey,
        'Content-Type': 'application/json',
      },
      data: req.body.data,
    };

    axios(config)
      .then((response) => {
        return response;
      })
      .catch((error) => {
        return apiUtils.sendApiError(res, 500, error.message);
      });
    return apiUtils.sendApiSuccess(res);
  });
};

commonV2.unloadingTheDialogChatwoot = async function (req, res) {
  Setting.findOne({ name: 'chatwootSettings:url' }, async (err, setting) => {
    if (err) {
      return apiUtils.sendApiError(res, 500, error.message);
    }

    const config = {
      method: 'get',
      url: `${setting.value}/api/v1/accounts/${req.body.accountID}/conversations/${req.body.conversationID}/messages`,
      headers: {
        api_access_token: req.body.chatwootApiKey,
        'Content-Type': 'application/json',
      },
    };

    let messages;
    await axios(config)
      .then((response) => {
        messages = response.data.payload;
      })
      .catch((error) => {
        return apiUtils.sendApiError(res, 500, error.message);
      });

    return apiUtils.sendApiSuccess(res, { messages: messages });
  });
};

commonV2.sendNotificationChatwoot = async function (req, res) {
  Setting.findOne({ name: 'chatwootSettings:url' }, async (err, setting) => {
    if (err) {
      return apiUtils.sendApiError(res, 500, error.message);
    }

    const config = {
      method: 'Post',
      url: `${setting.value}/api/v1/accounts/${req.body.accountID}/conversations/${req.body.conversationID}/messages`,
      headers: {
        api_access_token: req.body.chatwootApiKey,
        'Content-Type': 'application/json',
      },
      data: req.body.message,
    };

    axios(config)
      .then((response) => {
        return response;
      })
      .catch((error) => {
        return apiUtils.sendApiError(res, 500, error.message);
      });
    return apiUtils.sendApiSuccess(res);
  });
};

commonV2.token = async (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (!refreshToken) return apiUtils.sendApiError_InvalidPostData(res);

  try {
    const user = await User.getUserByAccessToken(refreshToken);
    if (!user) return apiUtils.sendApiError(res, 401);

    const tokens = await apiUtils.generateJWTToken(user);

    return apiUtils.sendApiSuccess(res, { token: tokens.token, refreshToken: tokens.refreshToken });
  } catch (e) {
    return apiUtils.sendApiError(res, 500, e.message);
  }
};

commonV2.viewData = async (req, res) => {
  return apiUtils.sendApiSuccess(res, { viewdata: req.viewdata });
};

module.exports = commonV2;
