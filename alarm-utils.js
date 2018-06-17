exports = module.exports = {};

const cron = require('cron');
const holiday = require('cn-holiday');
const ObjectId = require('mongodb').ObjectId;

const bot = require('./bot');
const config = require('./config');
const mongo = require('./mongo');

const getAlarm = async () => {
  let day = checkDay();
  let now = new Date();

  let enableAlarms = await mongo.alarm.find(
    {
      enable: true,
      'alarmTime.hour': { $lte: now.getHours() },
      'alarmTime.minute': { $lte: now.getMinutes() }
    }
  ).toArray();

  let alarms = enableAlarms.filter((alarm) => {
    let flag = true;
    alarm.check.forEach(check => {
      if(day[check.time] !== check.mode) flag = false;
    });
    return flag;
  })
  alarms.sort((a, b) => b.point - a.point)
  if (alarms.length) {
    return alarms[0];
  }
  return;
}
exports.getAlarm = getAlarm;

const triggerAlarm = async () => {
  let alarm = await getAlarm();
  let now = new Date();
  if (alarm) {
    let message = '```\n' + `@${alarm.from.username}\n` + alarm.message + '```\n';
    let sentMessage = await bot.sendMessage(alarm.chat.id, message, {
      parse_mode: 'Markdown',
    });
    await Promise.all([
      mongo.message.insertOne(sentMessage),
      mongo.message.deleteMany({
        date: { $lt: parseInt(Date.now() / 1000) - 60 * 60 * 24 * 2 } // 消息保留两天
      }),
      mongo.alarm.updateMany(
        {
          'alarmTime.hour': { $lte: now.getHours() },
          'alarmTime.minute': { $lte: now.getMinutes() }
        },
        { $set: { enable: false } }
      )
    ])
  }
}
exports.triggerAlarm = triggerAlarm;

const refreshAlarm = async () => {
  await mongo.alarm.updateMany(
    {},
    { $set: { enable: true } }
  )
}
exports.refreshAlarm = refreshAlarm;

const checkDay = () => {
  let now = new Date();
  if (now.getHours() < 3) {
    now.setDate(now.getDate() - 1);
  }
  let day = { today: {}, tomorrow: {} };
  day.today = holiday.isWorkday(now) ? 'work' : 'holiday';
  day.tomorrow = holiday.isWorkday(now.setDate(now.getDate() + 1)) ? 'work' : 'holiday';

  return day;
}

const setAlarm = async (msg, alarm) => {
  alarm.from = msg.from;
  alarm.chat = msg.chat;

  let now = new Date();
  alarm.enable = alarm.alarmTime.hour > now.getHours()
    || (alarm.alarmTime.hour === now.getHours() && alarm.alarmTime.minute >= now.getMinutes())

  await mongo.alarm.insertOne(alarm);
}
exports.setAlarm = setAlarm;

const clearAlarm = async (msg, alarmId) => {
  let _id = ObjectId(alarmId);
  let alarm = await mongo.alarm.findOne({ _id: _id })
  if (msg.from.id !== alarm.from.id) throw new Error('🌚');
  await mongo.alarm.deleteOne({ _id: _id })
  return 'ok';
}
exports.clearAlarm = clearAlarm;

const clearAllAlarms = async (msg) => {
  await mongo.alarm.deleteMany({ 'from.id': msg.from.id })
  return 'ok';
}
exports.clearAllAlarms = clearAllAlarms;

const listAlarms = async (msg) => {
  return await mongo.alarm.find({ 'from.id': msg.from.id }).toArray();
}
exports.listAlarms = listAlarms;

const modifyAlarm = async (msg) => {
  let _id = ObjectId(msg.command.split(' ')[0])
  let alarm = await mongo.alarm.findOne({ _id: _id });

  if (alarm.from.id !== msg.from.id) {
    throw new Error('🌚');
  };

  let time = msg.command.split(' ')[1];
  if (time) time = time.split(':');
  if (time.length != 2) time = time.split('：')

  let alarmTime = {
    hour: parseInt(time[0]),
    minute: parseInt(time[1])
  }

  let now = new Date();
  let enable = alarmTime.hour > now.getHours()
    || (alarmTime.hour === now.getHours() && alarmTime.minute >= now.getMinutes())

  await mongo.alarm.updateOne(
    { _id: _id },
    {
      $set: {
        alarmTime: alarmTime,
        enable: enable
      }
    }
  );
  return await mongo.alarm.findOne({ _id: _id });
}
exports.modifyAlarm = modifyAlarm;