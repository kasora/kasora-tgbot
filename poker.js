'use strict';

exports = module.exports = {};

let utils = require('./utils');
let template = require('./template');
let alarmUtils = require('./alarm-utils');

let startGame = () => {

}
exports.startGame = startGame;

let getMaxValue = (valueList) => {
  let maxValue = valueList[0];
  for (let value of valueList) {
    for (let i = 0; i < checkedValue.value.length; i++) {
      if (value.value[i] > maxValue.value[i]) { maxValue = value; break; }
    }
  }

  return maxValue;
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
exports.shuffling = shuffling;

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
  for (let i = 0; i < 5; i++) {
    if (tempCardList[i].value !== i + tempCardList[0].value) {
      straightFlag = false;
      break;
    }
  }
  // A2345
  if (tempCardList[4].value === 14 && tempCardList[0].value === 2 && tempCardList[1].value === 3 && tempCardList[2].value === 4 && tempCardList[3].value === 5) {
    straightFlag = true;
  }

  if (repeatSuit === 1 && straightFlag && tempCardList[0].value === 10) {
    return { value: [10, 10], name: '皇家同花顺' }
  }

  if (repeatSuit === 1 && straightFlag) {
    return { value: [9, tempCardList[4].value === 14 && tempCardList[0].value === 2 ? 1 : tempCardList[0]], name: '同花顺' }
  }

  if (maxRepeat === 4) {
    let optValue = { name: '四条', value: [8, '', ''] }
    for (let value of valueSet) {
      if (tempCardList.filter(el => el.value === value).length === 4) optValue.value[1] = value;
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
    if (fullHouseFlag) return optValue
  }

  if (repeatSuit === 1) {
    return { value: [6].concat(tempCardList.map(el => el.value).reverse()), name: '同花' }
  }

  if (straightFlag) {
    return { value: [5, tempCardList[4].value === 14 && tempCardList[0].value === 2 ? 1 : tempCardList[0].value], name: '顺子' }
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
    return optValue;
  }

  return { name: '散牌', value: [1].concat(tempCardList.map(el => el.value).reverse()) }
}
exports.checkValue = checkValue

let checkHand = (handCardList) => {
  let value = { level: 0, value: 0 };

  let pickFive = (pickedCard, index) => {
    if (pickedCard.length == 5) {
      let checkedValue = checkValue(pickedCard);
      value = getMaxValue([checkedValue, value]);
      return;
    }
    for (let i = index; i < handCardList.length; i++) {
      let card = handCardList[i];
      pickedCard.push(card);
      pickFive(pickedCard, i + 1);
      pickedCard.pop();
    }
  }
  pickFive([], 0)

  return value;
}
exports.checkHand = checkHand