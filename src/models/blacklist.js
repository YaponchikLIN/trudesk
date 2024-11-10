let mongoose = require('mongoose');
let COLLECTION = 'blacklist';
let blacklistSchema = mongoose.Schema(
  {
    regex: { type: String, unique: true },
    reason: String,
    key: { type: String, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model(COLLECTION, blacklistSchema);
