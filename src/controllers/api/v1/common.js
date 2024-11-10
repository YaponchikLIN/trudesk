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
 *  Updated:    3/12/19 11:32 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash');
const async = require('async');
const passport = require('passport');
const winston = require('winston');
const User = require('../../../models/user');
const Setting = require('../../../models/setting');
const commonV1 = {};

/**
 * Preforms login with username/password and adds
 * an access token to the {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} {@link User} object
 * @see {@link User}
 * @example
 * //Accepts Content-Type:application/json
 * {
 *    username: req.body.username,
 *    password: req.body.password
 * }
 *
 * @example
 * //Object Returned has the following properties removed
 * var resUser = _.clone(user._doc);
 * delete resUser.resetPassExpire;
 * delete resUser.resetPassHash;
 * delete resUser.password;
 * delete resUser.iOSDeviceToken;
 *
 */
commonV1.loginPost = async function (req, res) {
  var userModel = require('../../../models/user');
  var username = req.body.username;
  var password = req.body.password;

  if (_.isUndefined(username) || _.isUndefined(password)) {
    return res.sendStatus(403);
  }
  let domainsString = '';
  Setting.findOne({ name: 'ldapSettings:authorizationDomains' }, (err, setting) => {
    if (err) return next(err);
    domainsString = setting.value
    domainsString = domainsString.replace(' ', '');
    const parsedDomains = domainsString.split(',');
    const allowedDomains = [];
    parsedDomains.forEach(domain => {
      allowedDomains.push(domain.slice(1));
    });

    if (
      (req.body['login-username']?.includes('@') && allowedDomains.includes(req.body['login-username']?.split('@')[1])) ||
      (req.body.username.includes('@') && allowedDomains.includes(req.body.username.split('@')[1]))
    ) {
      req.body['login-username'] ? true : (req.body['login-username'] = req.body.username);
      req.body['login-password'] ? true : (req.body['login-password'] = req.body.password);
      delete req.body.username;
      delete req.body.password;

      Setting.findOne({ name: 'ldapSettings:enable' }, (err, setting) => {
        if (err) {
          winston.error(err);
          return next(err);
        }

        if (setting?.value == true) {
          try {
            passport.authenticate('ldapauth', async function (request, user, err, status) {
              if (err) {
                if (err.message != 'Invalid username/password') {
                  winston.error(err);
                  return next(err);
                }
              }

              if (!user) {
                commonV1.login(req, res, next);
              }

              if (user) {
                let redirectUrl = '/dashboard';
                if (req.session.redirectUrl) {
                  redirectUrl = req.session.redirectUrl;
                  req.session.redirectUrl = null;
                }

                req.logIn(user, function (err) {
                  if (err) {
                    winston.debug(err);
                    return next(err);
                  }

                  return res.redirect(redirectUrl);
                });
              }
            })(req, res, next);
          } catch (err) {
            req.body.username ? true : (req.body.username = req.body['login-username']);
            req.body.password ? true : (req.body.password = req.body['login-password']);
            delete req.body['login-username'];
            delete req.body['login-password'];
            commonV1.login(req, res, next);
          }
        } else {
          req.body.username ? true : (req.body.username = req.body['login-username']);
          req.body.password ? true : (req.body.password = req.body['login-password']);
          delete req.body['login-username'];
          delete req.body['login-password'];
          commonV1.login(req, res, next);
        }
      });
    }
  })


  userModel.getUserByUsername(username, function (err, user) {
    if (err) return res.status(401).json({ success: false, error: err.message });
    if (!user) return res.status(401).json({ success: false, error: 'Invalid User' });

    if (!userModel.validate(password, user.password))
      return res.status(401).json({ success: false, error: 'Invalid Password' });

    var resUser = _.clone(user._doc);
    delete resUser.resetPassExpire;
    delete resUser.resetPassHash;
    delete resUser.password;
    delete resUser.iOSDeviceTokens;
    delete resUser.tOTPKey;
    delete resUser.__v;
    delete resUser.preferences;

    if (_.isUndefined(resUser.accessToken) || _.isNull(resUser.accessToken)) {
      return res.status(200).json({ success: false, error: 'No API Key assigned to this User.' });
    }

    req.user = resUser;
    res.header('X-Subject-Token', resUser.accessToken);
    return res.json({
      success: true,
      accessToken: resUser.accessToken,
      user: resUser,
    });
  });
};

commonV1.login = async function (req, res) {
  var userModel = require('../../../models/user');
  var username = req.body.username;
  var password = req.body.password;

  const responseUser = (user) => {
    var resUser = _.clone(user._doc);
    delete resUser.resetPassExpire;
    delete resUser.resetPassHash;
    delete resUser.password;
    delete resUser.iOSDeviceTokens;
    delete resUser.tOTPKey;
    delete resUser.__v;
    delete resUser.preferences;

    if (_.isUndefined(resUser.accessToken) || _.isNull(resUser.accessToken)) {
      return res.status(200).json({ success: false, error: 'No API Key assigned to this User.' });
    }

    req.user = resUser;
    res.header('X-Subject-Token', resUser.accessToken);
    return res.json({
      success: true,
      accessToken: resUser.accessToken,
      user: resUser,
    });
  };

  const loginLocal = () => {
    return new Promise((resolve, reject) => {
      userModel.getUserByUsername(username, function (err, user) {
        if (err) return res.status(401).json({ success: false, error: err.message });
        if (!user) return res.status(401).json({ success: false, error: 'Invalid User' });

        if (!userModel.validate(password, user.password))
          return res.status(401).json({ success: false, error: 'Invalid Password' });

        resolve(responseUser(user));
      });
    });
  };

  if (
    (req.body['login-username']?.includes('@') && req.body['login-username']?.split('@')[1] == 'shatura.pro') ||
    (req.body?.username?.includes('@') && req.body?.username?.split('@')[1] == 'shatura.pro')
  ) {
    req.body['login-username'] ? true : (req.body['login-username'] = req.body.username);
    req.body['login-password'] ? true : (req.body['login-password'] = req.body.password);
    delete req.body.username;
    delete req.body.password;

    const promiseSetting = () => {
      return new Promise((resolve, reject) => {
        Setting.findOne({ name: 'ldapSettings:enable' }, async (err, setting) => {
          if (err) {
            winston.error(err);
            reject(err);
          }

          if (setting?.value == true) {
            const promisePassport = () => {
              return new Promise((resolve, reject) => {
                passport.authenticate('ldapauth', async function (request, user, err, status) {
                  if (err) {
                    if (err.message != 'Invalid username/password') {
                      winston.error(err);
                      reject(err);
                    }
                  }

                  if (!user) {
                    resolve(await loginLocal());
                  }

                  if (user) {
                    req.logIn(user, function (err) {
                      if (err) {
                        winston.debug(err);
                        reject(err);
                      }

                      resolve(responseUser(user));
                    });
                  }
                })(req, res);
              });
            };
            resolve(await promisePassport());
          } else {
            resolve(await loginLocal());
          }
        });
      });
    };

    return await promiseSetting();
  } else {
    return await loginLocal();
  }
};

commonV1.getLoggedInUser = function (req, res) {
  if (!req.user) {
    return res.status(400).json({ success: false, error: 'Invalid Auth' });
  }

  const resUser = _.clone(req.user._doc);
  delete resUser.resetPassExpire;
  delete resUser.accessToken;
  delete resUser.resetPassHash;
  delete resUser.password;
  delete resUser.iOSDeviceTokens;
  delete resUser.tOTPKey;
  delete resUser.__v;

  return res.json({ success: true, user: resUser });
};

/**
 * Preforms logout
 * {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} Success/Error object
 *
 * @example
 * //Tokens are sent in the HTTP Header
 * var token = req.headers.token;
 * var deviceToken = req.headers.devicetoken;
 */
commonV1.logout = function (req, res) {
  var deviceToken = req.headers.devicetoken;
  var user = req.user;

  async.series(
    [
      function (callback) {
        if (!deviceToken) return callback();
        user.removeDeviceToken(deviceToken, 1, function (err) {
          if (err) return callback(err);

          callback();
        });
      },
    ],
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err.message });

      return res.status(200).json({ success: true });
    }
  );
};

commonV1.privacyPolicy = async (req, res) => {
  const SettingsUtil = require('../../../settings/settingsUtil');
  try {
    const results = await SettingsUtil.getSettings();

    return res.json({ success: true, privacyPolicy: results.data.settings.privacyPolicy.value });
  } catch (err) {
    winston.warn(err);
    return res.status(500).json({ success: false, error: err });
  }
};

module.exports = commonV1;
