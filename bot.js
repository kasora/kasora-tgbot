const TelegramBot = require('node-telegram-bot-api');
let config = require('./config');
let bot = new TelegramBot(config.telegramToken, { polling: true });

module.exports = bot;