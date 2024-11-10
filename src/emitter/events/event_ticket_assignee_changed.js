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
const notificationFCM = require('../../firebase/adminMessaging');
const Setting = require('../../models/setting');
const User = require('../../models/user');
const Template = require('../../models/template');
const Mailer = require('../../mailer');

const Email = require('email-templates');
const templateDir = path.resolve(__dirname, '../..', 'mailer', 'templates');

const sendMail = async (assignee, emails, baseUrl, ticket, ticketLink, betaEnabled) => {
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

  const template = await Template.findOne({ name: 'assignee-changed' });
  if (template) {
    const context = { base_url: baseUrl, assignee: assignee, ticket: ticket.toJSON(), ticketLink: ticketLink };

    const html = await email.render('assignee-changed', context);
    const subjectParsed = global.Handlebars.compile(template.subject)(context);
    const mailOptions = {
      to: emails.join(),
      subject: subjectParsed,
      html,
      generateTextFromHTML: true,
      cc: []
    };

    if (ticket.watchers && ticket.watchers.length !== 0) {
      for (const watcher of ticket.watchers) {
        if (watcher && watcher !== '') {
          if (!ticket.subscribers.includes(watcher)) {
            mailOptions.cc.push(watcher.email);
          }
        }
      }
    }

    await Mailer.sendMail(mailOptions);

    logger.debug(`Sent [${emails.length}] emails.`);
  }
};

const sendNotificationFCM = async (ticket, ticketLink) => {
  const subscribersIds = ticket.subscribers.map((subscriber) => subscriber._id.toString());

  // Получаем id владельца и исполнителя заявки, если они есть
  const ownerId = ticket.owner?._id ? ticket.owner._id.toString() : null;
  const assigneeId = ticket.assignee?._id ? ticket.assignee._id.toString() : null;

  // Создаем массив id пользователей для уведомления, добавляя владельца и исполнителя, если они не входят в подписчики
  const notificationUsers = [...subscribersIds];
  if (ownerId && !notificationUsers.includes(ownerId)) {
    notificationUsers.push(ownerId);
  }
  if (assigneeId && !notificationUsers.includes(assigneeId)) {
    notificationUsers.push(assigneeId);
  }

  // Находим пользователей по id и получаем их токены для уведомления
  const users = await User.find({ _id: { $in: notificationUsers } }).exec();
  const notificationTokens = users.map((user) => user.notificationTokens).flat();

  // Создаем и отправляем сообщение с уведомлением
  const message = {
    tokens: notificationTokens,
    // notification: {
    //   title: `Изменён исполнитель в заявке #${ticket.uid}`,
    //   body: `Новый исполнтель: ${ticket.assignee.fullname}`,
    // },
    data: {
      title: `Изменён исполнитель в заявке #${ticket.uid}`,
      body: `Новый исполнтель: ${ticket.assignee.fullname}`,
      click_action: ticketLink,
    },
  };
  notificationFCM(message);
};

module.exports = async (data) => {
  const ticket = data.ticket;
  const assignee = data.ticket.assignee.fullname;
  const ownerEmail = data.ticket.owner.email;
  try {
    const settings = await Setting.getSettingsByName(['gen:siteurl', 'mailer:enable', 'beta:email']);
    const baseUrl = head(filter(settings, ['name', 'gen:siteurl'])).value;
    const ticketLink = `${baseUrl}/tickets/${ticket.uid}`;
    let mailerEnabled = head(filter(settings, ['name', 'mailer:enable']));
    mailerEnabled = !mailerEnabled ? false : mailerEnabled.value;
    let betaEnabled = head(filter(settings, ['name', 'beta:email']));
    betaEnabled = !betaEnabled ? false : betaEnabled.value;
    //++ ShaturaPro LIN 14.10.2022
    const emails = [];
    if (ownerEmail && ownerEmail !== '') {
      emails.push(ownerEmail);
    }

    if (mailerEnabled) await sendMail(assignee, emails, baseUrl, ticket, ticketLink, betaEnabled);

    sendNotificationFCM(ticket, ticketLink);
  } catch (e) {
    logger.warn(`[trudesk:events:ticket:assignee:changed] - Error: ${e}`);
  }
};
