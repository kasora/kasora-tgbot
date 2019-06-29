'use strict';

const { exec } = require('child_process');
const vm = require('vm2').VM;

let utils = require('./utils');
let template = require('./template');
let alarmUtils = require('./alarm-utils');
let routes = require('./route');
let arknightsMemberData = require('./data/arknights_member.json');

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

exports.getMember = async function (msg) {
  let tagList = msg.command.split(' ');
  if (tagList.length > 5) return '公开招募只有 5 个标签啊，朋友'

  let getMap = (tagList) => {
    let tagMap = [[]];
    for (let tag of tagList) {
      let tempMap = Array.from(tagMap);
      tempMap = tempMap.map(el => Array.from(el));
      tempMap.forEach(el => el.push(tag));
      tagMap = tagMap.concat(tempMap);
    }
    tagMap.shift()
    return tagMap;
  }

  let getMember = (tagList) => {
    let memberSet = new Set();
    let minStar = 6;
    for (let memberInfo of arknightsMemberData) {
      let flag = true;
      for (let tag of tagList) {
        if (!memberInfo.tags.includes(tag)) {
          flag = false;
          break;
        }
      }
      if (flag) {
        if (memberInfo.star < minStar) {
          minStar = memberInfo.star;
        }
        memberSet.add(memberInfo);
      }
    }
    let memberList = Array.from(memberSet);
    memberList.sort((a, b) => b.star - a.star);
    return {
      minStar: minStar,
      tagList: tagList,
      memberList: memberList.map(el => el.name),
    };
  }

  let tagMap = getMap(tagList);
  let output = tagMap.map(el => getMember(el));
  output = output.filter(el => el.minStar > 3 && el.memberList.length !== 0);
  if (output.length === 0) return `当前的标签没法组合出纯4星+的干员`;
  output.sort((a, b) => b.minStar - a.minStar);
  output = output.map(el => `最低${el.minStar}⭐️ - ${el.tagList.join(' + ')}: ${el.memberList.join(' / ')}`)
  output = output.join('\n');

  return output;
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
