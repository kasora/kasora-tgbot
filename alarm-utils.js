exports = module.exports = {};

const cron = require('cron');
const holiday = require('cn-holiday');
const ObjectId = require('mongodb').ObjectId;

const bot = require('./bot');
const config = require('./config');
const mongo = require('./mongo');
const utils = require('./utils');

const getAlarms = async () => {
  let day = checkDay();
  let now = new Date();

  let enableAlarms = await mongo.alarm.find(
    {
      enable: true,
      'alarmTime.hour': { $lte: now.getHours() },
      'alarmTime.minute': { $lte: now.getMinutes() }
    }
  ).toArray();

  let alarms = {};

  enableAlarms.forEach(alarm => {
    let isTrueTime = true;
    alarm.check.forEach(check => {
      if (day[check.time] !== check.mode) isTrueTime = false;
    });
    if (!isTrueTime) return;

    let key = `${alarm.from.id}_${alarm.chat.id}`;
    if (alarms[key]) {
      if (alarm.point > alarms[key].point) {
        alarms[key] = alarm;
      }
    } else {
      alarms[key] = alarm;
    }
  })
  alarms = Object.keys(alarms).map(key => alarms[key]);
  return alarms;
}
exports.getAlarms = getAlarms;

const triggerAlarm = async () => {
  let alarms = await getAlarms();
  let now = new Date();
  if (alarms.length) {
    await Promise.all(alarms.map(async alarm => {
      try {
        await utils.sendMessage(alarm.chat.id, alarm.message, { at: alarm.from.username });
        await mongo.alarm.updateMany(
          {
            'alarmTime.hour': { $lte: now.getHours() },
            'alarmTime.minute': { $lte: now.getMinutes() }
          },
          { $set: { enable: false } }
        )
      } catch (err) {
        if (err.message === 'ETELEGRAM: 400 Bad Request: group chat was upgraded to a supergroup chat') {
          await mongo.alarm.updateMany(
            { 'chat.id': alarm.chat.id },
            { $set: { 'chat.id': err.response.body.parameters.migrate_to_chat_id } }
          )
          return await triggerAlarm();
        } else {
          throw err;
        }
      }
    }))
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

  let updateRes = await mongo.alarm.updateOne(
    {
      label: alarm.label,
      "from.id": alarm.from.id,
      "chat.id": alarm.chat.id,
    },
    { $set: alarm },
    { upsert: true }
  )

  return updateRes.upsertedCount;
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
  await mongo.alarm.deleteMany({ $and: [{ 'from.id': msg.from.id }, { 'chat.id': msg.chat.id }] });
  return 'ok';
}
exports.clearAllAlarms = clearAllAlarms;

const listAlarms = async (msg) => {
  return await mongo.alarm.find({ $and: [{ 'from.id': msg.from.id }, { 'chat.id': msg.chat.id }] }).toArray();
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