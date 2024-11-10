const ticketSchema = require('../models/ticket');

async function watchersCheck(matchString, ticketId) {
  if (!matchString || matchString == '') {
    return false;
  }

  const ticketDoc = await ticketSchema.findById(ticketId);

  if (!ticketDoc.watchers || ticketDoc.watchers.length === 0) {
    return false;
  }

  const regex = new RegExp(matchString, 'gi');

  const watchers = ticketDoc.watchers.filter((emailObj) => regex.test(emailObj.email));

  return watchers.length > 0;
}

module.exports = watchersCheck;
