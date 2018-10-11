'use strict'

process.env["NTBA_FIX_319"] = 1;

let utils = require('./utils');
let routes = require('./route');
let alarmUtils = require('./alarm-utils');
let mongo = require('./mongo');

const bot = require('./bot');
const cron = require('cron');

Object.keys(routes).forEach((routeName) => {
  let route = routes[routeName]
  bot.onText(RegExp(`^\/${routeName}`), async (msg) => {
    await mongo.prepare();

    msg.code = routeName;
    msg.command = utils.getCommand(msg.text);
    msg.bot = bot;

    console.log(`username: `, msg.from.username);
    console.log(`command : `, msg.text);

    try {
      let output = await route.handler(msg);
      if (output === undefined) return;
      msg.response = output;
    } catch (err) {
      msg.response = `Error: ${err.message}`;
      console.error(err);
    }
    await utils.sendMessage(msg.chat.id, msg.response, { replyTo: msg.message_id });
  })
})

bot.on('edited_message_text', (msg) => {
  bot._textRegexpCallbacks.some(reg => {
    const result = reg.regexp.exec(msg.text);
    if (!result) { return false }
    reg.regexp.lastIndex = 0;
    reg.callback(msg, result);
  });
});

var CronJob1 = require('cron').CronJob;
new CronJob1('0 * * * * *', async function () {
  await mongo.prepare();
  await alarmUtils.triggerAlarm();
}, null, true, 'Asia/Shanghai', null, true);

var CronJob2 = require('cron').CronJob;
new CronJob2('0 0 0 * * *', async function () {
  await mongo.prepare();
  await alarmUtils.refreshAlarm();
  console.log(`${new Date()}\nAll alarm is refreshed.`)
}, null, true, 'Asia/Shanghai');

console.log('Bot is working...');
