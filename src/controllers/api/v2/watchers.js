var _ = require('lodash');
var async = require('async');
var ticketSchema = require('../../../models/ticket');
var settingSchema = require('../../../models/setting');
var watchersCheck = require('../../../mailer/watchersCheck');
var emitter = require('../../../emitter');
const socketEvents = require('../../../socketio/socketEventConsts');
const winston = require('../../../logger');
var apiWatchers = {};
const apiUtil = require('../apiUtils');
var utils = require('../../../helpers/utils');

apiWatchers.get = function (req, res) {
  var watchers = [];
  const limit = req.query.limit;
  const skip = req.query.skip;
  const ticketId = req.body.ticketId;
  const excludedIds = req.body.excludedIds;
  const sessionUserId = req.body.sessionUserId;
  async.parallel(
    [
      async function (done) {
        const ticket = await ticketSchema.findById(ticketId);
        if (!ticket.watchers) {
          await ticketSchema.updateOne(
            { _id: ticketId },
            {
              $set: {
                watchers: [],
              },
            }
          );
        }
        let filteredEmails = ticket.watchers.filter((emailObj) => {
          return !excludedIds.includes(emailObj.id);
        });

        filteredEmails = filteredEmails.sort((a, b) => {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });

        filteredEmails = filteredEmails.slice(skip);
        filteredEmails = filteredEmails.slice(0, limit);
        watchers = filteredEmails;
      },
    ],
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err });
      emitter.emit('watchers:fetch', { watchers: watchers, sessionUserId: sessionUserId });
      return apiUtil.sendApiSuccess(res, { watchers: watchers, count: watchers.length });
    }
  );
};

apiWatchers.add = async function (req, res) {
  const { email, key, owner, ticketOwner, userPermission } = req.body;

  if (owner !== ticketOwner && !userPermission) return apiUtil.sendApiError(res, 500, 'The owner of the action is not the owner of the application');

  const ticketId = req.body.ticketId;
  let recordAdd = { email, key };

  try {
    const ticket = await ticketSchema.findById(ticketId);

    if (!ticket.watchers) {
      try {
        const ticket = await ticketSchema.findById(ticketId);
        if (!ticket.watchers) {
          await ticketSchema
            .findOne({ _id: { ticketId }, watchers: { email: { $in: recordAdd.email } } })
            .then((item) => {
              if (item) {
                recordAdd = false;
              }
            });
        }
      } catch (e) {
        winston.warn(e);
        return apiUtil.sendApiError(res, 500, e.message);
      }
    }

    const insertEmailRecord = async (recordAdd) => {
      if (recordAdd) {

        var historyItem = {
          action: 'ticket:watcher:added',
          description: `Watcher was added:  ${recordAdd.email}`,
          owner: owner,
        };

        try {

          const ticket = await ticketSchema.findOne({
            _id: ticketId,
            'watchers.email': recordAdd.email
          });

          if (ticket) {
            // email уже есть в watchers, пропускаем обновление
            return false;

          } else {

            const updatedTicket = await ticketSchema.findOneAndUpdate(
              { _id: ticketId },
              { $push: { watchers: recordAdd, history: historyItem } },
              { returnOriginal: false }
            )
            if (updatedTicket) {
              const record = updatedTicket.watchers.find(watcher => watcher.key == recordAdd.key)
              const watcher = { email: record.email, key: record.key, _id: record._id }
              return watcher
            }
          }
        } catch (e) {
          winston.warn(e);
          return apiUtil.sendApiError(res, 500, e.message);
        }
      }

      // function (err, resRecord) {
      //   if (err) return res.status(400).json({ success: false, error: err });
      //   return res.json({ success: true, record: resRecord[0] });
    };

    if (recordAdd) {
      const record = await insertEmailRecord(recordAdd);
      if (record) return res.json({ success: true, record: record });
      else return res.status(400).json({ success: false, error: 'Duplicate email' });

    } else {
      return res.status(400).json({ message: 'Duplicate email' });
    }
  } catch (error) {
    winston.warn(e);
    return apiUtil.sendApiError(res, 500, e.message);
  }
};

apiWatchers.check = async function (req, res) {
  const matchString = req.body.matchString;
  const ticketId = req.body.ticketId;
  resultCheck = await watchersCheck(matchString, ticketId);
  emitter.emit('watchers:check', { resultCheck });
  return resultCheck;
};

apiWatchers.update = async function (req, res) {

  try {
    const { ticketId, owner, ticketOwner, userPermission } = req.body;

    if (owner !== ticketOwner && !userPermission) return apiUtil.sendApiError(res, 500, 'The owner of the action is not the owner of the application');

    const recordsUpdate = req.body.recordsUpdate.filter(
      (record) => record.email.replace(' ', '') != '' && record.email != ''
    );

    if (recordsUpdate.length !== 0) {
      recordsUpdate.map(async (record) => {
        const historyItem = {
          action: 'ticket:watcher:updated',
          description: `Watcher was updated: ${record.email}`,
          owner: owner,
        };
        await ticketSchema
          .findOneAndUpdate(
            {
              _id: ticketId,
              'watchers._id': record._id
            },
            {
              $set: { 'watchers.$.email': record.email },
              $push: { history: historyItem }
            },
            { new: true }
          )
          .populate('history.owner')
          .then(ticket => {
            utils.sendToAllConnectedClients(io, socketEvents.TICKETS_HISTORY_SET, ticket);
          });
      });
    } else {
      await ticketSchema
        .findOne({ _id: ticketId })
        .populate('history.owner')
        .exec((err, ticket) => {
          io.sockets.emit(socketEvents.TICKETS_HISTORY_SET, ticket)
        });
    }

    return res.json({
      success: true,
      message: 'Watchers updated',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error updating watchers',
    });
  }
};

apiWatchers.remove = function (req, res) {

  const ticketId = req.body.ticketId;
  const recordRemove = req.body.record;
  const owner = req.body.owner;
  const ticketOwner = req.body.ticketOwner;
  const userPermission = req.body.userPermission;
  if (owner !== ticketOwner && !userPermission) return apiUtil.sendApiError(res, 500, 'The owner of the action is not the owner of the application');
  const historyItem = {
    action: 'ticket:watcher:deleted',
    description: `Watcher was deleted: ${recordRemove.email}`,
    owner: owner,
  };

  async.parallel(
    [
      async function () {
        try {
          const updatedTicket = await ticketSchema
            .findOneAndUpdate(
              { _id: ticketId },
              {
                $pull: {
                  watchers: {
                    _id: recordRemove._id,
                  },
                },
                $push: { history: historyItem }
              },
            )

          if (updatedTicket) {
            return { success: true }
          }
        } catch {
          winston.warn(e);
          return apiUtil.sendApiError(res, 500, e.message);
        }
      },
    ],
    function (err) {
      if (err) return res.status(400).json({ success: false, error: err });
      return apiUtil.sendApiSuccess(res);
    }
  );
};

module.exports = apiWatchers;
