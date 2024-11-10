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
 *  Updated:    4/20/22 2:12 AM
 *  Copyright (c) 2014-2022. All rights reserved.
 */

const path = require('path');
const { head, filter } = require('lodash');
const logger = require('../../logger');
const Setting = require('../../models/setting');
const Template = require('../../models/template');
const winston = require('winston');
const Mailer = require('../../mailer');

const Email = require('email-templates');
const templateDir = path.resolve(__dirname, '../..', 'mailer', 'templates');

const sendMail = async (user, userPassword, emails, baseUrl, req, betaEnabled, callback) => {
  let email = null;

  if (betaEnabled) {
    email = new Email({
      render: (view, locals) => {
        return new Promise((resolve, reject) => {
          (async () => {
            try {
              if (!global.Handlebars) return reject(new Error('Could not load global.Handlebars'));
              const template = await Template.findOne({ name: view });
              if (!template) return reject(new Error('Invalid Template'));
              const html = global.Handlebars.compile(template.data['gjs-fullHtml'])(locals);
              const results = await email.juiceResources(html);
              return resolve(results);
            } catch (e) {
              return reject(e);
            }
          })();
        });
      },
    });
  } else {
    email = new Email({
      views: {
        root: templateDir,
        options: {
          extension: 'handlebars',
        },
      },
    });
  }

  const template = await Template.findOne({ name: 'new-password' });
  if (template) {
    const userJSON = user.toJSON();

    const context = { base_url: baseUrl, user: userJSON, userPassword: userPassword };

    const html = await email.render('new-password', context);
    const subjectParsed = global.Handlebars.compile(template.subject)(context);
    const mailOptions = {
      to: emails.join(),
      subject: subjectParsed,
      html,
      generateTextFromHTML: true,
    };

    Mailer.sendMail(mailOptions, function (err) {
      if (err) {
        winston.warn(err);
        logger.warn(`[trudesk:events:password:reset] - Error: ${e}`);
        callback(307);
      }
      callback(307);
    }).catch(function (err) {
      winston.warn(err);
      callback(400);
    });

    logger.debug(`Sent [${emails.length}] emails.`);
  }
};

module.exports = async (data, callback) => {
  const userPassword = data.userPassword;
  const req = data.req;
  const res = data.res;
  try {
    const user = data.user;
    const settings = await Setting.getSettingsByName(['gen:siteurl', 'mailer:enable', 'beta:email']);
    const baseUrl = head(filter(settings, ['name', 'gen:siteurl'])).value;
    let mailerEnabled = head(filter(settings, ['name', 'mailer:enable']));
    mailerEnabled = !mailerEnabled ? false : mailerEnabled.value;
    let betaEnabled = head(filter(settings, ['name', 'beta:email']));
    betaEnabled = !betaEnabled ? false : betaEnabled.value;

    //++ ShaturaPro LIN 14.10.2022
    const emails = [];
    if (user.email && user.email !== '') {
      emails.push(user.email);
    }

    if (mailerEnabled) await sendMail(user, userPassword, emails, baseUrl, req, betaEnabled, callback);
  } catch (e) {
    logger.warn(`[trudesk:events:password:reset] - Error: ${e}`);
  }
};
