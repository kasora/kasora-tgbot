const config = {
  sleep: {
    message: 'master。已经11点了。现在还不睡觉的话……',
    time: '11:00'
  },
  workStart: {
    message: '早安。master。\n吃过早餐了么？\n请不要忘了今天的打卡。',
    time: '8:50'
  },
  workEnd: {
    message: '今天辛苦了呢。master。\n已经到了下班时间了\n不要忘记打卡。',
    time: '18:30'
  },
  afternoonFood: {
    message: 'master。工作很辛苦吧。\n不要太过劳累了。\n休息一下。不如……就去罗森吃个笋尖怎么样？',
    time: '16:30'
  },

  freeDay: [0],

  workTime: ['workStart', 'workEnd', 'afternoonFood'],
  freeTime: ['sleep'],

  checkInterval: 60,// s
  userId: 10086,
  telegramToken: '****',
  webAdmin: {
    port: 12450,
    hostt: 'localhost'
  }
};

module.exports = config;