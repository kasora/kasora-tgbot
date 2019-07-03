'use strict';

exports = module.exports = {};

const { exec } = require('child_process');
const vm = require('vm2').VM;

let utils = require('./utils');
let template = require('./template');
let alarmUtils = require('./alarm-utils');
let routes = require('./route');
let arknightsMemberData = require('./data/arknights_member.json');

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
  if (tagList.length > 6) return '标签太多了啊，朋友'

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
    if (!tagList.includes('高级资深干员')) {
      memberList = memberList.filter(el => el.star < 6);
    }
    return {
      minStar: minStar,
      tagList: tagList,
      percent: memberList.filter(el => el.star >= 4).length / memberList.length,
      memberList: memberList.map(el => `${el.star}星 ${el.name}`),
    };
  }

  let tagMap = getMap(tagList);
  let memberList = tagMap.map(el => getMember(el));
  let output = memberList.filter(el => el.minStar > 3 && el.memberList.length !== 0);
  if (output.length === 0) {
    memberList.sort((a, b) => {
      if (b.percent - a.percent === 0) return a.tagList.length - b.tagList.length;
      return b.percent - a.percent;
    });
    if (memberList.length) {
      memberList = memberList.filter(el => Math.abs(el.percent - memberList[0].percent) < 0.000001)
    }
    let optStr = `当前的标签没法组合出纯4星+的干员`;
    if (memberList.length) {
      optStr += '，但是可以尝试下列组合\n';
    }
    let opt = memberList.map(el => `最低${el.minStar}星 - ${el.tagList.join(' + ')}: ${el.memberList.join(' / ')}`)
    opt = opt.join('\n');
    return optStr + opt;
  }
  output.sort((a, b) => {
    if (b.minStar - a.minStar === 0) return a.tagList.length - b.tagList.length;
    return b.minStar - a.minStar
  });
  output = output.map(el => `最低${el.minStar}星 - ${el.tagList.join(' + ')}: ${el.memberList.join(' / ')}`)
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
