"use strict";

const { version: platformVersion } = require("zapier-platform-core");
const { version } = require("./package.json");

const authentication = require("./authentication");

// Triggers
const newMessage = require("./triggers/newMessage");
const newContact = require("./triggers/newContact");
const newOrder = require("./triggers/newOrder");

// Actions
const sendMessage = require("./actions/sendMessage");
const upsertContact = require("./actions/upsertContact");
const tagContact = require("./actions/tagContact");

module.exports = {
  version,
  platformVersion,

  authentication,

  triggers: {
    [newMessage.key]: newMessage,
    [newContact.key]: newContact,
    [newOrder.key]: newOrder,
  },

  creates: {
    [sendMessage.key]: sendMessage,
    [upsertContact.key]: upsertContact,
    [tagContact.key]: tagContact,
  },

  searches: {},
};
