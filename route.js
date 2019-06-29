let service = require('./service');

exports = module.exports = {};

exports.echo = {
  label: '人类的本质就是个复读机。',
  handler: service.echo
};
exports.bash = {
  label: '顾名思义。不过只有主人能用。',
  handler: service.bash
};
exports.node = {
  label: '来测试一下你的 js 代码吧。',
  handler: service.node
};
exports.id = {
  label: '查看你的 ID。',
  handler: service.id
};
exports.shutup = {
  label: '让我收回我的上一句发言。',
  handler: service.shutUp
};
exports.explain = {
  label: '使用通俗易懂的方式解释一种事情。',
  handler: service.explain
};
exports.setalarm = {
  label: '设定一组闹钟。\n例如 /setalarm maid。\n目前的可选项有 maid ……呃，目前只有这一个',
  handler: service.setAlarm
};
exports.listalarm = {
  label: '列出你的所有闹钟',
  handler: service.listAlarms
};
exports.modifyalarm = {
  label: '修改一个闹钟的时间。\n格式为 /modifyalarm <闹钟id> <要修改到的小时:要修改到的分钟> \n可以使用 /listalarm 查看所有闹钟\n例如 /modifyalarm 123456789 17:30',
  handler: service.modifyAlarm
};
exports.clearalarm = {
  label: '清空你的闹铃。\n清空所有闹铃格式为 /clearalarm all\n清空指定闹铃为 /clearalarm <闹铃id>',
  handler: service.clearAlarm
};
exports.getmember = {
  label: '明日方舟工具-查询公开招募标签的最优解，标签之间使用空格区分',
  handler: service.getMember
};
exports.help = {
  label: '帮助手册。就是你看到的这个。也可以使用 /help xxx 显示 xxx 命令的用途',
  handler: service.help
};
exports.start = {
  label: '兼容 /help。',
  handler: service.help
};
