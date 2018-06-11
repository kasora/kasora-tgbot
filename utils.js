exports = module.exports = {};

const sendMarkdown = ($, message) => {
  $.sendMessage('```\n' + message + '```\n', { parse_mode: 'Markdown' });
}
exports.sendMarkdown = sendMarkdown;

const getCommand = ($) => {
  let command = $.message.text.split(' ');
  command.shift();
  
  return command.join(' ');
}
exports.getCommand = getCommand;

const verify = ($) => {
  if ($.userId !== config.userId) {
    $.sendMessage('🌚');
    return;
  }
}
exports.verify = verify;
