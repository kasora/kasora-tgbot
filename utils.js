exports = module.exports = {};

let mongo = require('./mongo');

const getCommand = (text) => {
  let command = text.split(' ');
  command.shift();

  return command.join(' ');
}
exports.getCommand = getCommand;

const verify = (msg) => {
  if (msg.from.id !== config.userId) {
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

const sendMessage = async (msg) => {
  if (msg.response) {
    let sentMessage = await msg.bot.sendMessage(msg.chat.id, '```\n' + msg.response + '```\n', {
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id
    });
    await mongo.message.insertOne(sentMessage);
  }
}
exports.sendMessage = sendMessage;
