const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  email: {
    type: String,
    required: true,
    min: 6,
    max: 255,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 1024,
  },
  role: {
    type: String,
    default: "basic",
  },
  authType: {
    type: String,
    default: "local",
  },
  allowExtraEmails: {
    type: Boolean,
    required: false,    
  },
  isActivated: {
    type: Boolean,
    required: false,    
  },
  accepted: {
    type: Boolean,
    required: true,
  },
  dateCreated: {
    type: Date,
    default: Date.now,
  },
  isDeactivated: {
    type: Boolean,
    default: false    
  }
});

module.exports = mongoose.model("User", userSchema);
