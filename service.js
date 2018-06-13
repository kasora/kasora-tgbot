'use strict';

const { exec } = require('child_process');
const vm = require('vm2').VM;

let utils = require('./utils');

exports = module.exports = {};

exports.bash = async function (msg) {
  utils.verify(msg.from.id);

  exec(command, (err, stdout, stderr) => {
    if (err) throw new Error(stderr);
    return stdout;
  });
}

exports.echo = async function (msg) {
  return msg.command;
}

exports.id = function (msg) {
  return `user ID: ${msg.from.id}\nchat ID: ${msg.chat.id}`;
};

exports.node = function (msg) {
  let result = new vm({ timeout: 1000 }).run(msg.command);
  return result;
}

exports.shutUp = async function (msg) {
  let lastMessage = utils.sentMessages.pop();
  msg.bot.deleteMessage(lastMessage.chat.id, lastMessage.message_id)
}