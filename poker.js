'use strict';

exports = module.exports = {};

let utils = require('./utils');
let bot = require('./bot');
let cardToString = utils.cardToString;
let config = require('./config');
let gameInfoMap = {};

let broadMessage = async (chatId, message) => {
  await Promise.all(gameInfoMap[chatId].playerList.filter(el => checkPlayer(el)).map(el => utils.sendMessage(el.userId, message)));
  await utils.sendMessage(chatId, message)
}

let pickCard = (chatId, cardNumber) => {
  let gameInfo = gameInfoMap[chatId];

  let pickCardList = gameInfo.cardList.slice(0, cardNumber);
  gameInfo.cardList = gameInfo.cardList.slice(cardNumber);

  return pickCardList;
}

let checkPlayer = (player) => {
  return !player.isAllIn && !player.isFold && player.coin !== 0
}

let skipToValidPlayer = (chatId) => {
  let gameInfo = gameInfoMap[chatId];
  let tempIndex = (gameInfo.nowIndex + 1) % gameInfo.playerList.length;
  while (!checkPlayer(tempIndex)) {
    tempIndex++;
    tempIndex = (gameInfo.nowIndex + 1) % gameInfo.playerList.length;
  }

  gameInfo.nowIndex = tempIndex;
  return tempIndex;
}

let playerIn = (chatId, playerInfo, coin) => {
  let gameInfo = gameInfoMap[chatId]
  let realCoin = 0;
  if (playerInfo.coin < coin) {
    gameInfo.coinPool[playerInfo.index] += playerInfo.coin;
    playerInfo.coin = 0;
    realCoin = playerInfo.coin;
    playerInfo.isAllIn = true;
  } else {
    gameInfo.coinPool[playerInfo.index] += coin;
    playerInfo.coin -= coin;
    realCoin = coin
  }

  if (gameInfo.coinPool[playerInfo.index] > gameInfo.nowCoin) {
    gameInfo.nowCoin = gameInfo.coinPool[playerInfo.index];
    gameInfo.lastRaise = playerInfo.index;
  }

  return realCoin
}

let shuffling = () => {
  let suitList = [1, 2, 3, 4];
  let numberList = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

  let cardList = [];
  for (let suit of suitList) {
    for (let value of numberList) {
      cardList.push({ suit: suit, value: value });
    }
  }

  let shufflingCardList = [];

  while (cardList.length) {
    let index = Math.floor(Math.random() * cardList.length);
    shufflingCardList.push(cardList[index]);
    cardList = cardList.slice(0, index).concat(cardList.slice(index + 1, cardList.length))
  }

  return shufflingCardList
}

let startGame = async (chatId, gameInfo) => {
  gameInfoMap[chatId] = gameInfo;

  let tempPlayerList = [];
  // 分配座位
  while (gameInfo.playerList.length) {
    let index = Math.floor(Math.random() * gameInfo.playerList.length);
    tempPlayerList.push(gameInfo.playerList[index]);
    gameInfo.playerList = gameInfo.playerList.slice(0, index).concat(gameInfo.playerList.slice(index + 1, gameInfo.playerList.length))
  }
  gameInfo.playerList = tempPlayerList;

  for (let i = 0; i < gameInfo.playerList.length; i++) {
    gameInfo.playerList[i].index = i;
  }

  startRound(chatId, 1);

  return gameInfoMap[chatId];
}
exports.startGame = startGame;

bot.on('message', async (msg) => {
  let pokerCommand = [
    'check',
    'raise',
    'fold',
    'all in',
  ]
  if (pokerCommand.includes(msg.text) || !isNaN(Number(msg.text))) {
    for (let chatId of Object.keys(gameInfoMap)) {
      let gameInfo = gameInfoMap[chatId];
      let player = gameInfoMap[chatId].playerList.find(el => el.userId === msg.from.id && gameInfo.nowIndex === el.index)
      if (player) {
        let gameInfo = gameInfoMap[chatId];

        if (gameInfo.nowIndex != player.index || player.isFold || player.isAllIn || player.coin === 0) {
          await utils.sendMessage(player.userId, '还没轮到你')
          return;
        }

        switch (msg.text) {
          case 'check': {
            playerIn(chatId, player, gameInfo.nowCoin - gameInfo.coinPool[player.index]);
            await broadMessage(chatId, `${player.userName} ${msg.text}`);
            gameInfo.gameContinue('check')
            break;
          };
          case 'raise': {
            await utils.sendMessage(player.userId, '请输入跟住后要 raise 的筹码数')
            break;
          };
          case 'fold': {
            player.isFold = true;
            await broadMessage(chatId, `${player.userName} ${msg.text}`);
            gameInfo.gameContinue('fold')
            break;
          };
          case 'all in': {
            playerIn(chatId, player, player.coin);
            await broadMessage(chatId, `${player.userName} ${msg.text}`);
            gameInfo.gameContinue('all in')
            break;
          }
          default: {
            let raiseCoin = Number(msg.text)
            if (isNaN(raiseCoin) || raiseCoin <= 0) {
              await utils.sendMessage(player.userId, '请输入跟住后要 raise 的筹码数')
              break;
            }
            let checkCoin = gameInfo.nowCoin - gameInfo.coinPool[player.index];
            playerIn(chatId, player, raiseCoin + checkCoin);
            await broadMessage(chatId, `${player.userName} raise ${raiseCoin}`);
            gameInfo.gameContinue('raise')
          }
        }
      }
    }
  }
})

let getMaxValue = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] > b[i]) return -1
    else if (a[i] < b[i]) return 1
  }
  return 0
}

let checkValue = (cardList) => {
  let tempCardList = JSON.parse(JSON.stringify(cardList));
  tempCardList.sort((a, b) => a.value - b.value)

  let tempSet;

  let valueSet = Array.from(new Set(tempCardList.map(el => el.value)));
  let maxRepeat = 0;
  for (let value of valueSet) {
    let tempRepeat = tempCardList.filter(el => el.value === value).length;
    maxRepeat = tempRepeat > maxRepeat ? tempRepeat : maxRepeat;
  }

  // check Flush
  let repeatSuit = Array.from(new Set(tempCardList.map(el => el.suit))).length;
  //check Straight
  let straightFlag = true;
  let straightCode = ''
  for (let i = 0; i < 5; i++) {
    if (tempCardList[i].value !== i + tempCardList[0].value) {
      straightFlag = false;
      break;
    }
  }
  if (straightFlag) straightCode = tempCardList.map(cardToString).map(el => el.slice(1)).join('')
  // A2345
  if (tempCardList[4].value === 14 && tempCardList[0].value === 2 && tempCardList[1].value === 3 && tempCardList[2].value === 4 && tempCardList[3].value === 5) {
    straightFlag = true;
    straightCode = 'A2345'
  }

  if (repeatSuit === 1 && straightFlag && tempCardList[0].value === 10) {
    return { value: [10, 10], name: '皇家同花顺' }
  }

  if (repeatSuit === 1 && straightFlag) {
    return { value: [9, tempCardList[4].value === 14 && tempCardList[0].value === 2 ? 1 : tempCardList[0]], name: '同花顺' + straightCode }
  }

  if (maxRepeat === 4) {
    let optValue = { name: '四条', value: [8, '', ''] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length === 4) {
        optValue.value[1] = value;
        optValue.name += cardToString({ suit: 1, value: value }).slice(1)
      }
      else optValue.value[2] = value;
    }
    return optValue;
  }

  if (maxRepeat === 3) {
    let fullHouseFlag = false;
    let optValue = { name: '葫芦', value: [7, '', ''] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length === 2) {
        fullHouseFlag = true;
        optValue.value[2] = value;
      }
      else optValue.value[1] = value;
    }
    if (fullHouseFlag) {
      optValue.name += ' ' + cardToString({ suit: 1, value: optValue.value[1] }).slice(1) + '-' + cardToString({ suit: 1, value: optValue.value[2] }).slice(1)
      return optValue
    }
  }

  if (repeatSuit === 1) {
    return { value: [6].concat(tempCardList.map(el => el.value).reverse()), name: '同花' + cardToString(tempCardList[0]).slice(0, 1) }
  }

  if (straightFlag) {
    return { value: [5, tempCardList[4].value === 14 && tempCardList[0].value === 2 ? 1 : tempCardList[0].value], name: '顺子' + straightCode }
  }

  if (maxRepeat === 3) {
    let lastCardValueList = [];
    let optValue = { name: '三条', value: [4, ''] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length !== 3) {
        lastCardValueList.push(value)
      }
      else optValue.value[1] = value;
    }
    optValue.value = optValue.value.concat(lastCardValueList.sort((a, b) => b - a))
    optValue.name += cardToString({ suit: 1, value: optValue.value[1] }).slice(1)
    return optValue;
  }

  if (maxRepeat === 2) {
    let cardValueList = [];
    let lastCard = [];
    let optValue = { name: '两对', value: [3] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length === 2) {
        cardValueList.push(value)
      }
      else lastCard.push(value);
    }
    if (lastCard.length === 1) {
      optValue.value = optValue.value.concat(cardValueList.sort((a, b) => b - a)).concat(lastCard)
      optValue.name += ' ' + cardToString({ suit: 1, value: optValue.value[1] }).slice(1) + '-' + cardToString({ suit: 1, value: optValue.value[2] }).slice(1)
      return optValue;
    }
  }

  if (maxRepeat === 2) {
    let cardValueList = [];
    let lastCard = [];
    let optValue = { name: '一对', value: [2] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length === 2) {
        cardValueList.push(value)
      }
      else lastCard.push(value);
    }
    optValue.value = optValue.value.concat(cardValueList).concat(lastCard.sort((a, b) => b - a))
    optValue.name += cardToString({ suit: 1, value: optValue.value[1] }).slice(1)
    return optValue;
  }

  return { name: '散牌 ' + tempCardList.map(cardToString).map(el => el.slice(1)).reverse().join(''), value: [1].concat(tempCardList.map(el => el.value).reverse()) }
}
exports.checkValue = checkValue

let checkHand = (handCardList) => {
  let value = { value: [0] };

  let pickFive = (pickCard, index) => {
    if (pickCard.length == 5) {
      let checkedValue = checkValue(pickCard);
      value = getMaxValue(checkedValue.value, value.value) === -1 ? checkedValue : value;
      return;
    }
    for (let i = index; i < handCardList.length; i++) {
      let card = handCardList[i];
      pickCard.push(card);
      pickFive(pickCard, i + 1);
      pickCard.pop();
    }
  }
  pickFive([], 0)

  return value;
}
exports.checkHand = checkHand

let passRound = async (chatId) => {
  let gameInfo = gameInfoMap[chatId];

  do {
    if (gameInfo.playerList.filter(el => !el.isFold).length === 1) {
      let winner = gameInfo.playerList.find(el => !el.isFold);
      winner.coin += gameInfo.coinPool.reduce((a, b) => a + b, 0)
      await broadMessage(chatId, `其余人全部弃牌，本局 ${winner.userName} 获胜！`)
      return true;
    };
    let nowPlayer = gameInfo.playerList.find(el => el.index === gameInfo.nowIndex);
    if (!checkPlayer(nowPlayer)) {
      gameInfo.nowIndex = (gameInfo.nowIndex + 1) % gameInfo.playerList.length;
      continue
    }
    let passType = await utils.sendUserKeyboard(gameInfo)
    if (passType === 'raise') {
      gameInfo.lastRaise = nowPlayer.index
    }
    if (gameInfo.playerList.filter(el => !el.isFold).length === 1) {
      let winner = gameInfo.playerList.find(el => !el.isFold);
      winner.coin += gameInfo.coinPool.reduce((a, b) => a + b, 0)
      await broadMessage(chatId, `其余人全部弃牌，本局 ${winner.userName} 获胜！`)
      return true;
    };
    gameInfo.nowIndex = (gameInfo.nowIndex + 1) % gameInfo.playerList.length;
  } while (gameInfo.lastRaise !== gameInfo.nowIndex)

  return false;
}

let startRound = async (chatId) => {
  let gameInfo = gameInfoMap[chatId]
  let playerNumber = gameInfo.playerList.length;
  let SB = config.SB;

  while (gameInfo.playerList.filter(el => el.coin > 0).length !== 1) {
    // 初始化
    for (let player of gameInfo.playerList) {
      player.isFold = player.coin === 0;
      player.isAllIn = false;
      player.index = (player.index + 1) % playerNumber;
    }
    gameInfo.cardList = shuffling();
    gameInfo.coinPool = new Array(playerNumber).fill(0);
    gameInfo.nowCoin = 2 * SB;
    gameInfo.nowIndex = gameInfo.playerList.length - 1;
    gameInfo.publicCardList = [];

    // 发底牌
    for (let i = 0; i < gameInfo.playerList.length; i++) {
      let playerInfo = gameInfo.playerList.find(el => el.index === i);
      if (checkPlayer(playerInfo)) {
        playerInfo.cardList = await pickCard(chatId, 2)
        await utils.sendMessage(playerInfo.userId, `你的底牌为 ${playerInfo.cardList.map(cardToString).join(', ')}`)
      }
    }

    if (gameInfo.playerList.filter(checkPlayer).length === 2) {
      // 大盲
      gameInfo.nowIndex = -1
      skipToValidPlayer(chatId)
      playerIn(chatId, gameInfo.playerList.find(el => el.index === gameInfo.nowIndex), 2 * SB)
      gameInfo.lastRaise = gameInfo.nowIndex;
      await broadMessage(chatId, `${gameInfo.playerList.find(el => el.index === gameInfo.nowIndex).userName} 已下大盲注`);

      // 小盲
      skipToValidPlayer(chatId)
      playerIn(chatId, gameInfo.playerList.find(el => el.index === gameInfo.nowIndex), SB)
      await broadMessage(chatId, `${gameInfo.playerList.find(el => el.index === gameInfo.nowIndex).userName} 已下小盲注`);
    }
    else {
      // 小盲
      gameInfo.nowIndex = -1
      skipToValidPlayer(chatId)
      playerIn(chatId, gameInfo.playerList.find(el => el.index === gameInfo.nowIndex), SB)
      await broadMessage(chatId, `${gameInfo.playerList.find(el => el.index === gameInfo.nowIndex).userName} 已下小盲注`);

      // 大盲
      skipToValidPlayer(chatId)
      playerIn(chatId, gameInfo.playerList.find(el => el.index === gameInfo.nowIndex), 2 * SB)
      gameInfo.lastRaise = gameInfo.nowIndex;
      await broadMessage(chatId, `${gameInfo.playerList.find(el => el.index === gameInfo.nowIndex).userName} 已下大盲注`);
    }

    for (let i = playerNumber - 1; i >= 0; i--) {
      let tempPlayer = gameInfo.playerList.find(el => el.index === i);
      if (checkPlayer(tempPlayer)) {
        gameInfo.nowIndex = tempPlayer.index
        break;
      }
    }
    if (await passRound(chatId)) continue;
    if (gameInfo.nowCoin === 2 * SB) {
      if (gameInfo.playerList.filter(el => checkPlayer(el)).length <= 3) {
        gameInfo.lastRaise += 1
      } else {
        for (let i = playerNumber - 1; i >= 0; i--) {
          let tempPlayer = gameInfo.playerList.find(el => el.index === i);
          if (checkPlayer(tempPlayer)) {
            gameInfo.lastRaise = tempPlayer.index
            break;
          }
        }
      }
      if (await passRound(chatId)) continue;
    }

    // 翻牌
    pickCard(chatId, 1)
    let flopCardList = pickCard(chatId, 3)
    gameInfo.publicCardList = gameInfo.publicCardList.concat(flopCardList);
    await broadMessage(chatId, `flop: ${flopCardList.map(cardToString).join(', ')}\n当前公共牌: ${gameInfo.publicCardList.map(cardToString).join(', ')}`)
    gameInfo.nowIndex = -1;
    skipToValidPlayer(chatId)
    gameInfo.lastRaise = gameInfo.nowIndex;
    if (await passRound(chatId)) continue;

    // 转牌
    pickCard(chatId, 1)
    let turnCardList = pickCard(chatId, 1)
    gameInfo.publicCardList = gameInfo.publicCardList.concat(turnCardList);
    await broadMessage(chatId, `turn: ${turnCardList.map(cardToString).join(', ')}\n当前公共牌: ${gameInfo.publicCardList.map(cardToString).join(', ')}`)
    gameInfo.nowIndex = -1;
    skipToValidPlayer(chatId)
    if (await passRound(chatId)) continue;

    // 河牌
    pickCard(chatId, 1)
    let riverCardList = pickCard(chatId, 1)
    gameInfo.publicCardList = gameInfo.publicCardList.concat(riverCardList);
    await broadMessage(chatId, `river: ${riverCardList.map(cardToString).join(', ')}\n当前公共牌: ${gameInfo.publicCardList.map(cardToString).join(', ')}`)
    gameInfo.nowIndex = -1;
    skipToValidPlayer(chatId)
    gameInfo.lastRaise = gameInfo.nowIndex;
    if (await passRound(chatId)) continue;

    // 结算
    for (let player of gameInfo.playerList) {
      if (player.isFold) player.value = [0];
      else {
        let tempCardList = player.cardList.concat(gameInfo.publicCardList)
        player.value = checkHand(tempCardList);
        console.log(`${player.userName} card: ${tempCardList.map(cardToString).join(', ')}`)
        console.log(tempCardList)
      }
    }
    await broadMessage(chatId, `开牌\n${gameInfo.playerList.filter(el => !el.isFold).map(el => `${el.userName}: ${el.cardList.map(cardToString).join(', ')} ${el.value.name}`).join('\n')}`)
    let tempPlayerList = Array.from(gameInfo.playerList)
    tempPlayerList.sort((a, b) => getMaxValue(a.value.value, b.value.value));
    tempPlayerList.forEach(el => el.rank = 1000)
    tempPlayerList[0].rank = 1
    let rankList = [
      [tempPlayerList[0]]
    ];
    for (let i = 1; i < playerNumber; i++) {
      if (getMaxValue(tempPlayerList[i].value.value, tempPlayerList[i - 1].value.value) === 0) {
        tempPlayerList[i].rank = tempPlayerList[i - 1].rank;
        rankList[tempPlayerList[i].rank - 1].push(tempPlayerList[i])
      } else {
        tempPlayerList[i].rank = tempPlayerList[i - 1].rank + 1;
        rankList.push([tempPlayerList[i]])
      }
    }

    let tempPlayerCoin = Array.from(gameInfo.coinPool);
    for (let playerList of rankList) {
      let allInPlayerList = playerList.filter(el => el.isAllIn);
      let notAllInPlayerList = playerList.filter(el => !el.isAllIn);
      for (let i = 0; i < allInPlayerList.length; i++) {
        let player = playerList[i];
        for (let j = 0; j < gameInfo.coinPool; j++) {
          let bones = Math.floor(Math.min(tempPlayerCoin[player.index], gameInfo.coinPool[j]) / playerList.length)
          gameInfo.coinPool[j] -= bones;
          player.coin += bones;
        }
      }
      let coin = gameInfo.coinPool.reduce((a, b) => a + b, 0)
      if (coin % notAllInPlayerList.length) {
        for (let i = 0; i < tempPlayerList.length; i++) {
          let tempPlayer = tempPlayerList.find(el => el.index === i)
          if (notAllInPlayerList.find(el => el.index === i)) {
            tempPlayer.coin += coin % notAllInPlayerList.length;
            coin -= coin % notAllInPlayerList.length;
            break;
          }
        }
      }
      for (let i = 0; i < notAllInPlayerList.length; i++) {
        let player = playerList[i];
        let bones = Math.floor(coin / notAllInPlayerList.length)
        player.coin += bones;
      }

      if (!notAllInPlayerList.length) continue;

      if (playerList.length === 1) {
        await broadMessage(chatId, `本局 ${playerList.map(el => el.userName).join('，')} 获胜。`)
        break;
      }
      if (playerList.length > 1) {
        await broadMessage(chatId, `本局 ${playerList.map(el => el.userName).join('，')} 获胜，${playerList.length}人平分彩池。`)
        break
      }
    }

    for (let player of gameInfo.playerList) {
      player.index = (player.index + 1) % gameInfo.playerList.length
    }
  }

  let winner = gameInfo.playerList.filter(el => el.coin > 0)[0].userName
  await broadMessage(chatId, `游戏结束 胜利者为 ${winner}`)
  gameInfoMap[chatId] = null;
}
