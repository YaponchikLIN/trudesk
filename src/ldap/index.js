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
 *  Updated:    1/20/19 4:43 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

var _ = require('lodash')
var ldap = require('ldapjs')
var Setting = require('../models/setting')
var ldapClient = {}
const LDAPGroup = require('../models/ldapGroup');
// var api = require('../client/api')
ldapClient.client = null

const pushLDAPGroup = (dnGroupsArray, callback) => {

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

ldapClient.bind = function (url, userDN, password, callback) {
  ldapClient.client = ldap.createClient({
    url: url
  })

  const opts = {
    filter: '(objectclass=*)',
    scope: 'sub',
    // attributes: ['dn', 'sn', 'cn']
    attributes: ['dn', 'sn', 'cn', 'dc', 'ou']
  };

  ldapClient.client.bind(userDN, password, async function (err) {
    if (err) {
      console.log('Error in new connection ' + err);
    } else {
      console.log('Success');
      Setting.findOne({ name: 'ldapSettings:pathToGroups' }, async (err, setting) => {

        ldapClient.client.search(setting.value, opts, async (err, res) => {
          var dnGroupsArray = [];
          if (err) {
            console.log('Error in new connection ' + err);
          } else {
            res.on('searchRequest', (searchRequest) => {
              console.log('searchRequest: ', searchRequest.messageID);
            })
            res.on('searchEntry', (entry) => {
              console.log('entry: ' + JSON.stringify(entry.object));
              let dnGroup = JSON.parse(JSON.stringify(entry.object));
              dnGroupsArray.push(dnGroup.dn);
            });
            res.on('searchReference', (referral) => {
              console.log('referral: ' + referral.uris.join());
            });
            res.on('error', (err) => {
              console.error('error: ' + err.message);
            });
            res.on('end', async (result) => {
              console.log('status: ' + result.status);
              Setting.findOne({ name: 'gen:siteurl' }, (err, url) => {
                if (err) console.log(err);
                pushLDAPGroup(dnGroupsArray, (err, res) => {
                  if (err) {
                    console.log(err)
                  }
                  if (res) console.log('pushLDAPGroup = true')
                  return callback(null, res)
                })

              })
            });
          }
        });
      })

    }
  })

  ldapClient.client.on('error', function (err) {
    if (_.isFunction(callback)) {
      return callback(err)
    }

    throw err
  })
}

ldapClient.search = function (base, filter, callback) {
  if (ldapClient.client === null) return callback('Client is not initialized.')

  var entries = []

  ldapClient.client.on('error', function (err) {
    if (_.isFunction(callback)) {
      return callback(err)
    }

    throw err
  })

  ldapClient.client.search(
    base,
    {
      filter: filter,
      scope: 'sub',
      attributes: ['dn', 'displayName', 'cn', 'samAccountName', 'title', 'mail']
    },
    function (err, res) {
      if (err) return callback(err)
      res.on('searchEntry', function (entry) {
        entries.push(entry.object)
      })

      // res.on('searchReference', function(referral) {
      //     console.log('referral: ' + referral.uris.join());
      // });

      res.on('error', function (err) {
        return callback(err)
      })

      res.on('end', function (result) {
        return callback(null, { entries: entries, result: result })
      })
    }
  )
}

ldapClient.unbind = function (callback) {
  if (ldapClient.client === null) return callback('Client is not initialized')

  return ldapClient.client.unbind(callback)
}

module.exports = ldapClient
