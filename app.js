'use strict'

const Telegram = require('telegram-node-bot');
const superAgent = require('superagent');
const { exec } = require('child_process');
const vm = require('vm2').VM;

let config = require('./config');
let utils = require('./utils');
const TelegramBaseController = Telegram.TelegramBaseController;
const TextCommand = Telegram.TextCommand;
const tg = new Telegram.Telegram(config.telegramToken, { webAdmin: config.webAdmin });

class Controller extends TelegramBaseController {
  constructor() {
    super();
  }

  echo($) {
    let text = utils.getCommand($);

    $.sendMessage(text.join(' '));
  }

  bash($) {
    utils.verify($);

    let command = utils.getCommand($);

    exec(command, (err, stdout, stderr) => {
      if (err) utils.sendMarkdown($, stderr);
      else utils.sendMarkdown($, stdout);
    });
  }

  id($) {
    utils.sendMarkdown(`User ID: ${$.userId}\nChat ID: ${$.chatId}`);
  }

  node($) {
    let command = utils.getCommand($)
    try {
      let result = new vm({ timeout: 1000 }).run(command);
      $.sendMessage('```\n' + result + '```\n', { parse_mode: 'Markdown' });
    }
    catch (err) {
      $.sendMessage('```\n' + err + '```\n', { parse_mode: 'Markdown' });
    }
  }

  setAlarm($) {

  }

  get routes() {
    return {
      echoHandler: 'echo',
      bashHandler: 'bash',
      idHandler: 'id',
      nodeHandler: 'node',
    };
  }
}

let controller = new Controller();

tg.router
  .when(new TextCommand('/echo', 'echoHandler'), controller)
  .when(new TextCommand('/bash', 'bashHandler'), controller)
  .when(new TextCommand('/id', 'idHandler'), controller)
  .when(new TextCommand('/node', 'nodeHandler'), controller);;


