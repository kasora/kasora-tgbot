'use strict';

const { exec } = require('child_process');
const vm = require('vm2').VM;

let utils = require('./utils');
let template = require('./template');
let alarmUtils = require('./alarm-utils')

exports = module.exports = {};

exports.bash = function (msg) {
  utils.verify(msg.from.id);
  return new Promise((resolve, reject) => {
    exec(msg.command, (err, stdout, stderr) => {
      if (err) reject(stderr);
      resolve(stdout);
    });
  })
}

exports.echo = async function (msg) {
  return msg.command;
}

exports.id = function (msg) {
  return `user ID: ${msg.from.id}\nchat ID: ${msg.chat.id}`;
};

exports.node = function (msg) {
  let result = new vm({ timeout: 1000 }).run(msg.command);
  return result === undefined ? 'undefined' : result.toString();
}

exports.shutUp = async function (msg) {
  let lastMessage = await utils.getLatestMessages(msg.chat.id);
  await utils.deleteMessage(lastMessage._id);
  msg.bot.deleteMessage(lastMessage.chat.id, lastMessage.message_id);
}

exports.setAlarm = async function (msg) {
  let alarms = template[msg.command];
  if (alarms) {
    await Promise.all(alarms.map(alarm => alarmUtils.setAlarm(msg, alarm)))
  }
  return 'ok';
}

exports.listAlarms = async function (msg) {
  let alarms = await alarmUtils.listAlarms(msg);
  alarms = alarms.map(alarm => utils.alarmToString(alarm));

  return alarms.length ? alarms.join('\n\n') : '你还没有设定闹铃\n使用 /setalarm 来设定一个闹铃吧';
}

exports.modifyAlarm = async function (msg) {
  return utils.alarmToString(await alarmUtils.modifyAlarm(msg))
}

exports.clearAlarm = async function (msg) {
  if (msg.command === '') {
    throw new Error('需要闹铃 id。或者输入 all 取消所有闹铃。');
  }
  if (msg.command === 'all') {
    return await alarmUtils.clearAllAlarms(msg);
  }
  return alarmUtils.clearAlarm(msg, msg.command);
}

exports.help = async function (msg) {
  let routes = require('./route');
  let labels = Object.keys(routes).map(routeName => {
    return [
      `path : /${routeName}`,
      `label:`,
      `${routes[routeName].label}`,
    ].join('\n')
  })

  return labels.join('\n\n');
}
