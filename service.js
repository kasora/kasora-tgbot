'use strict';

const { exec } = require('child_process');
const vm = require('vm2').VM;

let utils = require('./utils');
let template = require('./template');
let alarmUtils = require('./alarm-utils');
let routes = require('./route');

exports = module.exports = {};

exports.bash = async function (msg) {
  utils.verify(msg.from.id);
  return await new Promise((resolve, reject) => {
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
  try {
    let result = new vm({ timeout: 1000 }).run(msg.command);
    return result === undefined ? 'undefined' : result.toString();
  } catch (err) {
    msg.response = `Error: ${err.message}`;
  }
}

exports.shutUp = async function (msg) {
  try {
    let lastMessage = await utils.getLatestMessages(msg.chat.id);
    await utils.deleteMessage(lastMessage._id);
    msg.bot.deleteMessage(lastMessage.chat.id, lastMessage.message_id);
  } catch (err) {
    msg.response = `Error: ${err.message}`;
  }
}

exports.explain = async function (msg) {
  try {
    return `null是什么意思？null是什么梗？null是谁？这个梗又是从何而来？为什么一瞬间就有好多人使用这个梗？为什么大家都在null？相信不少同学都很想了解这个梗，下面就让小编来为大家介绍一下null梗的详细内容。null是什么意思？null是什么梗？null是谁？这个梗又是从何而来？为什么一瞬间就有好多人使用这个梗？为什么大家都在null？相信不少同学都很想了解这个梗，下面就让小编来为大家介绍一下null梗的详细内容。
以上就是null的全部内容，希望能够帮助到大家。`.replace(/null/g, msg.command);
  } catch (err) {
    msg.response = `Error: ${err.message}`;
  }
}

exports.setAlarm = async function (msg) {
  let alarms = template[msg.command];
  let createCount = 0;
  if (alarms) {
    let alarmResList = await Promise.all(alarms.map(alarm => alarmUtils.setAlarm(msg, alarm)))
    createCount = alarmResList.filter(alarmRes => alarmRes).length;
    let repeatCount = alarmResList.length - createCount;

    let opt = [];
    if (createCount) opt.push(`${createCount}个闹铃已被添加。`);
    if (repeatCount) opt.push(`${repeatCount}个闹铃已存在，自动忽略。`);

    return opt.join('\n');
  } else {
    return '请指定一个闹铃模板。'
  }
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
  if (msg.command) {
    return [
      `path: /${msg.command}`,
      `label:`,
      `${routes[msg.command].label}`,
    ].join('\n')
  }
  let labels = Object.keys(routes).map(routeName => {
    return [
      `path : /${routeName}`,
      `label:`,
      `${routes[routeName].label}`,
    ].join('\n')
  })

  return labels.join('\n\n');
}
