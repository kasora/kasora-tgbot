exports = module.exports = {};

let mongo = require('./mongo');
let config = require('./config');
let bot = require('./bot');

const getCommand = (text) => {
  let command = text.split(' ');
  command.shift();

  return command.join(' ');
}
exports.getCommand = getCommand;

const verify = (id) => {
  if (id !== config.userId) {
    throw new Error('🌚');
  }
}
exports.verify = verify;

const getLatestMessages = async (chatId) => {
  await mongo.prepare();
  let latestMessages = await mongo.message.aggregate([
    { $match: { 'chat.id': chatId } },
    { $sort: { date: -1 } },
    { $limit: 1 }
  ]).toArray();
  return latestMessages[0];
};
exports.getLatestMessages = getLatestMessages;

const deleteMessage = async (_messageId) => {
  await mongo.prepare();
  await mongo.message.deleteOne({ _id: _messageId });
}
exports.deleteMessage = deleteMessage;

const sendMessage = async (chatId, response, option = {}) => {
  if (typeof response === 'string') {
    let temp = { type: 'text', text: response };
    response = temp;
  }

  let messageOption = {
    parse_mode: 'Markdown',
  };
  if (option.replyTo) messageOption.reply_to_message_id = option.replyTo;

  let sentMessage;
  if (response.type === 'sticker') {
    sentMessage = await bot.sendSticker(chatId, response.sticker);
  }
  if (response.type === 'text') {
    if (response.text === undefined || response.text === '') {
      response.text = 'kasora-bot...没有输出...'
    }
    if (option.at) response.text = `@${option.at}\n${response.text}`;
    sentMessage = await bot.sendMessage(chatId, '```\n' + response.text + '\n```', messageOption)
  }

  await mongo.message.insertOne(sentMessage);
  await mongo.message.deleteMany({
    date: { $lt: parseInt(Date.now() / 1000) - 60 * 60 * 24 * 2 } // 消息保留两天
  })
}
exports.sendMessage = sendMessage;

const alarmToString = (alarm) => {
  if (alarm.alarmTime.minute < 10 && alarm.alarmTime.minute.length < 2) {
    alarm.alarmTime.minute = '0' + alarm.alarmTime.minute;
  }
  return [
    `id:   ${alarm._id}`,
    `label ${alarm.label}`,
    `time: ${alarm.alarmTime.hour}:${alarm.alarmTime.minute}`,
    `mode: `,
    ...alarm.check.map(check => `      ${check.mode}-${check.time}`),
  ].join('\n');
}
exports.alarmToString = alarmToString;
