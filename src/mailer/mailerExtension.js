const userSchema = require('../models/user');
const ticketSchema = require('../models/ticket');
const groupSchema = require('../models/group');
const ticketTypeSchema = require('../models/tickettype');
const settingSchema = require('../models/setting');
const emitter = require('../emitter');

const mailerExtension = {};
mailerExtension.processingWatchers = function (data, callback) {
    let message = data.message;
    let user = data.user;
    if (!message.from || message.from == '') {
        return;
    }
    if (!user) {
        userSchema.createUserFromEmail(message.from, message.fromName, function (err, response) {
            if (err) return callback(err);

            emitter.emit('user:created', {
                socketId: '',
                user: response.user,
                userPassword: response.userPassword,
            });
            return callback(null, response.user);
        });
    } else {
        return callback(null, user);
    }

}

module.exports = mailerExtension;