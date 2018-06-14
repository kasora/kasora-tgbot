'use strict'

let utils = require('./utils');
let routes = require('./route');
let alarmUtils = require('./alarm-utils');
let mongo = require('./mongo');

const bot = require('./bot');
const cron = require('cron');

Object.keys(routes).forEach((routeName) => {
  let route = routes[routeName]
  bot.onText(RegExp(`^\/${routeName}`), async (msg) => {
    console.log(msg);
    await mongo.prepare();
    msg.command = utils.getCommand(msg.text);
    msg.bot = bot;
    try {
      let output = await route.handler(msg);
      msg.response = output;
    } catch (err) {
      msg.response = `Error: ${err.message}`;
      console.error(err);
    }
    await utils.sendMessage(msg);
  })
})

var CronJob = require('cron').CronJob;
new CronJob('0 * * * * *', async function () {
  await mongo.prepare();
  await alarmUtils.triggerAlarm();
  console.log('alarm checked.')
}, null, true, 'Asia/Shanghai', null, true);
