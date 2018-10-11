exports = module.exports = [
  {
    label: 'workday sleep',
    message: { type: 'sticker', sticker: 'CAADBQAD_gADDxXNGWuj_Z6psGN4Ag' },
    alarmTime: {
      hour: 23,
      minute: 0,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'work'
    }],
  },
  {
    label: 'workday lunch',
    message: { type: 'sticker', sticker: 'CAADBQAD8wADDxXNGeYW5EDuT_6aAg' },
    alarmTime: {
      hour: 12,
      minute: 0,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'work'
    }],
  },
  {
    label: 'workday afternoon tea',
    message: '下午茶时间！快乐一下！',
    alarmTime: {
      hour: 14,
      minute: 30,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'work'
    }],
  },
  {
    label: 'workday work start',
    message: '早安。主人。\n吃过早餐了么？\n请不要忘了今天的打卡。',
    alarmTime: {
      hour: 9,
      minute: 20,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'work'
    }],
  },
  {
    label: 'workday work end',
    message: '今天也辛苦了呢。主人。\n已经到了下班时间了\n不要忘记打卡。',
    alarmTime: {
      hour: 18,
      minute: 35,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'work'
    }],
  },
  {
    label: 'holiday lunch',
    message: '主人，就算放假也要记得吃午饭！',
    alarmTime: {
      hour: 12,
      minute: 0,
    },
    point: 1,
    check: [{
      time: 'today',
      mode: 'holiday'
    }],
  },
  {
    label: 'last holiday sleep',
    message: '主人。已经11点了。\n明天又要开始上班了……早点睡吧。',
    alarmTime: {
      hour: 23,
      minute: 0,
    },
    point: 5,
    check: [
      {
        time: 'tomorrow',
        mode: 'work'
      },
      {
        time: 'today',
        mode: 'holiday'
      }
    ],
  },
  {
    label: 'last workday work end',
    message: '明天就要放假啦，今晚准备玩些什么？',
    alarmTime: {
      hour: 18,
      minute: 30,
    },
    point: 5,
    check: [
      {
        time: 'tomorrow',
        mode: 'holiday'
      },
      {
        time: 'today',
        mode: 'work'
      }
    ],
  },
]