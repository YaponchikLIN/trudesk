const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const async = require('async');
const Email = require('email-templates');

const logger = require('../../logger');
const notificationFCM = require('../../firebase/adminMessaging');
const winston = require('../../logger');
const sanitizeHtml = require('sanitize-html');

const userSchema = require('../../models/user');
const Role = require('../../models/role');
const ticketSchema = require('../../models/ticket');
const settingSchema = require('../../models/setting');
const Department = require('../../models/department');
const settingsSchema = require('../../models/setting');
const templateSchema = require('../../models/template');
const NotificationSchema = require('../../models/notification');
const tcmSchema = require('../../models/tcm');
const emitter = require('..');
const util = require('../../helpers/utils');
const pathUpload = path.join(__dirname, `../../../public`);
const socketEvents = require('../../socketio/socketEventConsts');
const { head, filter, flattenDeep, concat, uniqBy } = require('lodash');
const user = require('../../models/user');
const templateDir = path.resolve(__dirname, '../../', 'mailer', 'templates');

function tcmUpdate(ticket, userId) {
  if (ticket.status != 3) {
    tcmSchema.updateOne({ ticketId: ticket._id }, { users: [] }, (err) => {
      if (err) console.log(err);
      tcmSchema.updateOne({ ticketId: ticket._id }, { $push: { users: userId } }, (err, tcm) => {
        if (err) console.log(err);
        if (tcm.matchedCount == 0) {
          const tcm = {
            ticketId: ticket._id,
            ticketUid: ticket.uid,
            users: [userId],
          };
          tcmSchema.create(tcm, (err) => {
            if (err) throw err;
            tcmSchema.findOne({ ticketId: ticket._id }, (err, tcm) => {
              emitter.emit('ticket:tcm:update', { tcm, ticket });
            });
          });
        }
        tcmSchema.findOne({ ticketId: ticket._id }, (err, tcm) => {
          emitter.emit('ticket:tcm:update', { tcm, ticket });
        });
      });
    });
  }
}

const sendNotificationFCM = async (ticket, ticketLink, noteOwnerId) => {
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

  // Находим id роли Support
  const supportRole = await Role.findOne({ name: 'Support' }).exec();
  const supportRoleId = supportRole._id;
  const adminRole = await Role.findOne({ name: 'Admin' }).exec();
  const adminRoleId = adminRole._id;

  // Находим пользователей по id и получаем их токены для уведомления
  const users = await userSchema
    .find({ $and: [{ _id: { $in: notificationUsers } }, { _id: { $ne: noteOwnerId } }] })
    .exec();

  const notificationTokens = users
    .filter((user) => user.role.id == adminRoleId || user.role.id == supportRoleId)
    .map((user) => user.notificationTokens)
    .flat();

  // Создаем и отправляем сообщение с уведомлением
  if (notificationTokens.length !== 0) {
    const message = {
      tokens: notificationTokens,
      // notification: {
      //   title: `Добавлен комментарий к заявке #${ticket.uid}`,
      //   body: ticket.comments[ticket.comments.length - 1].comment.replace(/<\/?[a-zA-Z]+>/gi, ''),
      // },
      data: {
        title: `Добавлена заметка к заявке #${ticket.uid}`,
        body: ticket.notes[ticket.notes.length - 1].note.replace(/<\/?[a-zA-Z]+>/gi, ''),
        click_action: ticketLink,
      },
    };
    notificationFCM(message);
  }
};

module.exports = async (ticket, note) => {
  tcmUpdate(ticket, note.owner._id);
  settingsSchema.getSettingsByName(
    ['tps:enable', 'tps:username', 'tps:apikey', 'mailer:enable'],
    function (err, tpsSettings) {
      if (err) return false;

      let tpsEnabled = _.head(_.filter(tpsSettings, ['name', 'tps:enable']));
      let tpsUsername = _.head(_.filter(tpsSettings, ['name', 'tps:username']));
      let tpsApiKey = _.head(_.filter(tpsSettings), ['name', 'tps:apikey']);
      let mailerEnabled = _.head(_.filter(tpsSettings), ['name', 'mailer:enable']);
      mailerEnabled = !mailerEnabled ? false : mailerEnabled.value;

      if (!tpsEnabled || !tpsUsername || !tpsApiKey) {
        tpsEnabled = false;
      } else {
        tpsEnabled = tpsEnabled.value;
        tpsUsername = tpsUsername.value;
        tpsApiKey = tpsApiKey.value;
      }

      async.parallel(
        [
          function (cb) {
            if (_.isUndefined(ticket.assignee)) return cb();
            if (ticket.assignee._id.toString() === note.owner.toString()) return cb;
            if (ticket.owner._id.toString() === ticket.assignee._id.toString()) return cb();

            const notification = new NotificationSchema({
              owner: ticket.assignee,
              title: 'Note Added to Ticket#' + ticket.uid,
              message: ticket.subject,
              type: 2,
              data: { ticket: ticket },
              unread: true,
            });

            notification.save(function (err) {
              return cb(err);
            });
          },
          // Send email to subscribed users
          function (c) {
            if (!mailerEnabled) return c();

            const mailer = require('../../mailer');
            let emails = [];

            const getTeamMembers = async (group) => {
              const departments = await Department.getDepartmentsByGroup(group._id);
              if (!departments) throw new Error('Group is not assigned to any departments. Exiting...');
              return flattenDeep(
                departments.map((department) => {
                  return department.teams.map((team) => {
                    return team.members.map((member) => {
                      return member;
                    });
                  });
                })
              );
            };

            const createNotification = async (ticket) => {
              let members = await getTeamMembers(ticket.group);

              members = concat(members, ticket.group.members);
              members = uniqBy(members, (i) => i._id);

              for (const member of members) {
                if (!member || (!member.role.isAgent && !member.role.isAdmin)) continue;
                await saveNotification(member, ticket);
              }
            };

            const saveNotification = async (user, ticket) => {
              const notification = new NotificationSchema({
                owner: user,
                title: `Note added to ticket #${ticket.uid}`,
                message: ticket.notes[ticket.notes.length - 1].note.replace(/<\/?[a-zA-Z]+>/gi, ''),
                type: 0,
                data: { ticket },
                unread: true,
              });

              await notification.save();
            };

            createNotification(ticket);
            util.sendToAllConnectedClients(io, socketEvents.TICKETS_CREATED, ticket);

            async.each(
              ticket.subscribers,
              function (member, cb) {
                if (_.isUndefined(member) || _.isUndefined(member.email)) return cb();
                if (member._id.toString() === note.owner.toString()) return cb();
                if (member.deleted) return cb();

                emails.push(member.email);

                cb();
              },
              function (err) {
                if (err) return c(err);

                emails = _.uniq(emails);

                if (_.size(emails) < 1) {
                  return c();
                }

                const sendMail = async (ticket, emails, baseUrl, betaEnabled, templateName) => {
                  let email = null;
                  if (betaEnabled) {
                    email = new Email({
                      render: (view, locals) => {
                        return new Promise((resolve, reject) => {
                          (async () => {
                            try {
                              if (!global.Handlebars) return reject(new Error('Could not load global.Handlebars'));
                              const template = await templateSchema.findOne({ name: view });
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

                  const template = await templateSchema.findOne({ name: templateName });

                  if (template) {
                    const ticketJSON = ticket.toJSON();
                    ticketJSON.status = ticket.statusFormatted;
                    if (ticketJSON.assignee) {
                      const assignee = await userSchema.findOne({ _id: ticketJSON.assignee });
                      ticketJSON.assignee = assignee.fullname;
                    }

                    const attachmentsForSendMail = [];
                    if (note.attachments) {
                      for (const attachment of note.attachments) {
                        const attachmentPath = pathUpload + attachment.path;
                        if (fs.existsSync(attachmentPath)) {
                          attachmentsForSendMail.push({ name: attachment.name, path: attachmentPath });
                        }
                      }
                    }

                    const noteObject = {
                      text: ticketJSON.notes.slice(-1)[0].note.replace(/(<([^>]+)>)/gi, ''),
                      owner: ticketJSON.notes.slice(-1)[0].owner.fullname,
                      attachments: attachmentsForSendMail,
                    };
                    const context = { base_url: baseUrl, ticket: ticketJSON, note: noteObject };
                    const html = await email.render(templateName, context);
                    const subjectParsed = global.Handlebars.compile(template.subject)(context);
                    const mailOptions = {
                      to: emails.join(),
                      subject: subjectParsed,
                      html,
                      generateTextFromHTML: true,
                      attachments: noteObject.attachments,
                    };

                    try {
                      await mailer.sendMail(mailOptions);
                    } catch (err) {
                      console.log(err);
                    }

                    logger.debug(`Sent [${emails.length}] emails.`);
                  }
                };

                ticket.populate('notes.owner', async function (err, ticket) {
                  if (err) winston.warn(err);
                  if (err) return c();
                  const ticketObject = ticket;
                  ticket = await ticketSchema.getTicketById(ticketObject._id);
                  const settings = await settingSchema.getSettingsByName([
                    'gen:siteurl',
                    'mailer:enable',
                    'beta:email',
                  ]);
                  const baseUrl = head(filter(settings, ['name', 'gen:siteurl'])).value;
                  const ticketLink = `${baseUrl}/tickets/${ticket.uid}`;
                  sendNotificationFCM(ticket, ticketLink, note.owner._id);
                });
              }
            );
          },
        ],
        function () {
          // Blank
        }
      );
    }
  );
};
