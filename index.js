'use strict'

const express = require('express');
const Telegram = require('telegram-node-bot');
const request = require('request');
const { exec } = require('child_process');
const fs = require('fs');

let config = require('./config');
const TelegramBaseController = Telegram.TelegramBaseController;
const TextCommand = Telegram.TextCommand;
const tg = new Telegram.Telegram(config.telegramToken, { webAdmin: config.webAdmin });

let allTime = config.workTime.concat(config.freeTime);
let runnintTime = Array.from(allTime);
let flags = {};
for (let key in allTime) {
  flags[key] = true;
};
let intervalId;

Object.keys(config).forEach(key => {
  if (config.workTime.includes(key)) config[key].type = 'work';
  if (config.freeTime.includes(key)) config[key].type = 'free';
});

let checkTimer = (timer, name) => {
  if (timer.type === 'work' && config.freeDay.includes(new Date().getDay())) return false;

  let now = new Date();

  let beginTime = new Date();
  let endTime = new Date();

  timer.time = timer.time.split(':');
  timer.time.map(val => parseInt(val));

  beginTime.setHours = timer.time[0];
  beginTime.setMinutes = timer.time[1] - 1;
  beginTime.setSeconds = 50;

  endTime.setHours = timer.time[0];
  endTime.setMinutes = timer.time[1] + config.checkInterval / 60;
  endTime.setSeconds = 10;

  if (beginTime < now && now < endTime && flags.workCard) {
    flags[name] = false;
    setTimeout(function () {
      flags[name] = true;
    }, config.checkInterval * 1000 + 60000);
    tg.api.sendMessage(config.userId, timer.message, { parse_mode: 'Markdown' });
    return true;
  }
  return false;
}

let checkTime = () => {
  for (let key in allTime) {
    checkTimer(config[key], key);
  };
};

class Controller extends TelegramBaseController {
  constructor() {
    let freeTime = config.freeTime;

    super();
  }
  echo($) {
    let text = $.message.text.split(' ');
    text.shift(); let freeTime = config.freeTime;

    $.sendMessage(text.join(' '));

  }

  bash($) {
    if ($.userId != config.userId) {
      $.sendMessage('🌚');
      return;
    }

    let msg = $.message.text;
    let words = msg.split(' '); words.shift();
    let command = words.join(' ');

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

  listremind($) {
    if ($.userId != config.userId) {
      $.sendMessage('🌚');
      return;
    }

    let list = config.workTime.concat(config.freeTime);
    list = list.join('\n')
    $.sendMessage(list);
  }

  openremind($) {
    if ($.userId != config.userId) {
      $.sendMessage('🌚');
      return;
    }

    let list = $.message.text.split(' ');
    list.shift();
    list.filter(val => !val === '');
    if (list.length === 0) {

    }

    list.filter(val => allTime.includes(val));

    intervalId = setInterval(checkTime(), config.checkInterval * 1000);
    checkTime();

    $.sendMessage()
  }

  closeremind($) {
    if ($.userId != config.userId) {
      $.sendMessage('🌚');
      return;
    }

    clearInterval(intervalId);
  }

  get routes() {
    return {
      echoHandler: 'echo',
      bashHandler: 'bash',
      idHandler: 'id',
      listremindHandler: 'listremind',
      openremindHandler: 'openremind',
      closeremindHandler: 'closeremind'
    };
  }
}

let controller = new Controller();

tg.router
  .when(new TextCommand('/echo', 'echoHandler'), controller)
  .when(new TextCommand('/bash', 'bashHandler'), controller)
  .when(new TextCommand('/listremind', 'listremindHandler'), controller)
  .when(new TextCommand('/openremind', 'openremindHandler'), controller)
  .when(new TextCommand('/closeremind', 'closeremindHandler'), controller)
  .when(new TextCommand('/id', 'idHandler'), controller);


