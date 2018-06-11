'use strict'

const express = require('express');
const Telegram = require('telegram-node-bot');
const superAgent = require('superagent');
const { exec } = require('child_process');
const vm = require('vm');

const agent = superAgent.agent();
let config = require('./config');
const TelegramBaseController = Telegram.TelegramBaseController;
const TextCommand = Telegram.TextCommand;
const tg = new Telegram.Telegram(config.telegramToken, { webAdmin: config.webAdmin });

class Controller extends TelegramBaseController {
  constructor() {
    super();
  }
  echo($) {
    let text = $.message.text.split(' ');
    text.shift();

    $.sendMessage(text.join(' '));
  }

  bash($) {
    if ($.userId !== config.userId) {
      $.sendMessage('🌚');
      return;
    }

    let msg = $.message.text;
    let code = msg.split(' ');
    code.shift();


    let command = code.join(' ');

    exec(command, (err, stdout, stderr) => {
      if (err) {
        $.sendMessage('```\n' + err + '```\n', { parse_mode: 'Markdown' });
      }
      else {
        $.sendMessage('```\n' + stdout + '```\n', { parse_mode: 'Markdown' });
      }
    });
  }

  id($) {
    $.sendMessage(`User ID: ${$.userId}\nChat ID: ${$.chatId}`);
  }

  node($) {
    let code = $.message.text.split(' ');
    code.shift();

    let command = code.join(' ');
    const script = new vm.Script(command);
    const context = new vm.createContext();
    let result = script.runInContext(context);
    $.sendMessage('```\n' + result + '```\n', { parse_mode: 'Markdown' });
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


