exports = module.exports = {};

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

exports.sentMessages = [];