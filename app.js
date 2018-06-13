'use strict'

const TelegramBot = require('node-telegram-bot-api');

let config = require('./config');
let utils = require('./utils');
let routes = require('./route');

const bot = new TelegramBot(config.telegramToken, { polling: true });

Object.keys(routes).forEach((routeName) => {
  let route = routes[routeName]
  bot.onText(RegExp(`^\/${routeName}`), async (msg) => {
    msg.command = utils.getCommand(msg.text);
    msg.bot = bot;
    try {
      let output = await route.handler(msg);
      msg.response = output;
    } catch (err) {
      msg.response = `Error: ${err.message}`;
    }
    await utils.sendMessage(msg);
  })
})