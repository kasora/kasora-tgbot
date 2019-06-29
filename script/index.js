// 随便写的脚本，变量混乱不要在意
// 数据来源于 http://wiki.joyme.com/arknights/%E5%B9%B2%E5%91%98%E6%95%B0%E6%8D%AE%E8%A1%A8

let jssoup = require('jssoup').default;

let fs = require('fs');

let data = fs.readFileSync('./明日方舟干员.html', { encoding: 'utf8' })

let soup = new jssoup(data);

let table = soup.findAll('td')
let opt = [];
let temp = [];
for (let el of table) {
  if (el.find('a')) {
    let text = temp.join(',');
    if (text) opt.push(text);
    temp = [];
  }
  let text = el.text.split('');
  if (text[text.length - 1] === '\n') text.pop();
  if (text[0] === ' ') text.shift()
  temp.push(text.join(''));
}

opt.shift();

let tableInfo = [];
for (member of opt) {
  if (!member) continue;
  let info = member.split(',')
  let infoObj = {
    // origin: info,
  };
  infoObj.name = info[0];
  infoObj.star = Math.floor(info[3])
  infoObj.status = !member.includes('实装');
  if (!infoObj.status) {
    // infoObj.tags = [];
    // tableInfo.push(infoObj)
    continue;
  }
  if (!info[6].split('、').includes('公开招募')) continue;
  infoObj.tags = info[info.length - 1].split('、')
  let sexTag = info[4] === '男' ? '男性干员' : '女性干员';
  infoObj.tags.push(sexTag);
  infoObj.tags.push(info[2] + '干员');
  if (infoObj.star === 5) infoObj.tags.push('资深干员');
  if (infoObj.star === 6) infoObj.tags.push('高级资深干员');
  tableInfo.push(infoObj)
}

fs.writeFileSync('./a.txt',
  // opt.join('\n'))
  JSON.stringify(tableInfo, null, 2));