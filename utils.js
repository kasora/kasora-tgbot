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

let cardToString = (card) => {
  let suitEnum = [null, '♥', '♦', '♠', '♣'];
  let numberEnum = [null, null, '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'k', 'A'];

  return suitEnum[card.suit] + numberEnum[card.value];
}
exports.cardToString = cardToString;

const sendUserKeyboard = async (gameInfo) => {
  let playerInfo = gameInfo.playerList.find(el => el.index === gameInfo.nowIndex);

  let keyboardList = [];
  if (playerInfo.coin >= gameInfo.nowCoin) keyboardList.push({ text: 'check' })
  if (playerInfo.coin > gameInfo.nowCoin) keyboardList.push({ text: 'raise' })
  keyboardList.push({ text: 'fold' })
  keyboardList.push({ text: 'all in' })

  await bot.sendMessage(
    playerInfo.userId,
    [
      `轮到你了`,
      playerInfo.cardList.length ? '你的手牌: ' + playerInfo.cardList.map(cardToString).join(', ') : null,
      gameInfo.publicCardList.length ? '当前公牌: ' + gameInfo.publicCardList.map(cardToString).join(', ') : null,
      `当前奖池: ${gameInfo.coinPool.reduce((a, b) => a + b, 0)}`,
      `你已下注: ${gameInfo.coinPool[playerInfo.index]}`,
      `你的筹码: ${playerInfo.coin}`,
    ].filter(el => el).join('\n'),
    {
      reply_markup: {
        keyboard: [keyboardList],
        one_time_keyboard: true,
        resize_keyboard: true,
      },
      parse_mode: 'HTML',
    }
  );

  return new Promise((resolve, reject) => {
    gameInfo.gameContinue = resolve;
  });
}
exports.sendUserKeyboard = sendUserKeyboard;

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

const shufflingArray = (arr) => {
  let i = arr.length;
  while (i) {
    let j = Math.floor(Math.random() * i--);
    [arr[j], arr[i]] = [arr[i], arr[j]];
  }
  return arr;
}
exports.shufflingArray = shufflingArray;
