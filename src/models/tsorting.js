let mongoose = require('mongoose');
let COLLECTION = 'tsorting';
let tSortingSchema = mongoose.Schema({
  sorting: String,
  direction: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
});

module.exports = mongoose.model(COLLECTION, tSortingSchema);
