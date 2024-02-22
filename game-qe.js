'use strict';

exports = module.exports = {};

let utils = require('./utils');
let bot = require('./bot');
let config = require('./config');
const { message } = require('./mongo');
let gameInfoMap = {};

let countryMap = {
    3: ['日本', '中国', '欧盟', '美国'],
    4: ['日本', '中国', '欧盟', '美国'],
    5: ['日本', '中国', '欧盟', '美国', '英国'],
}

let industryMap = {
    3: ['金融', '工业', '农业', '住房'],
    4: ['金融', '工业', '农业', '住房'],
    5: ['金融', '工业', '农业', '政府', '住房'],
}

let baseCardList = [
    { country: '日本', industry: '金融', point: 1, remove: [5] },
    { country: '日本', industry: '工业', point: 2 },
    { country: '日本', industry: '农业', point: 3, remove: [5] },
    { country: '日本', industry: '政府', point: 3, remove: [3, 4] },
    { country: '日本', industry: '住房', point: 4 },
    { country: '中国', industry: '金融', point: 4, remove: [5] },
    { country: '中国', industry: '工业', point: 1, remove: [5] },
    { country: '中国', industry: '农业', point: 2 },
    { country: '中国', industry: '政府', point: 4, remove: [3, 4] },
    { country: '中国', industry: '住房', point: 3 },
    { country: '欧盟', industry: '金融', point: 3 },
    { country: '欧盟', industry: '工业', point: 4 },
    { country: '欧盟', industry: '农业', point: 1, remove: [5] },
    { country: '欧盟', industry: '住房', point: 2 },
    { country: '美国', industry: '金融', point: 2 },
    { country: '美国', industry: '工业', point: 3 },
    { country: '美国', industry: '农业', point: 4 },
    { country: '美国', industry: '住房', point: 1, remove: [5] },
    { country: '英国', industry: '金融', point: 4, remove: [3, 4] },
    { country: '英国', industry: '农业', point: 3, remove: [3, 4] },
    { country: '英国', industry: '政府', point: 2, remove: [3, 4] },
]

let nationalizedPointMap = {
    3: [0, 1, 3, 6, 10, 10],
    4: [0, 1, 3, 6, 10, 10],
    5: [0, 3, 6, 10, 10],
}

let monopolyPointMap = {
    3: [0, 0, 3, 6, 10, 10, 10],
    4: [0, 0, 3, 6, 10, 10, 10],
    5: [0, 0, 3, 10, 16, 16, 16],
}

let diversificationPointMap = {
    3: [0, 0, 0, 4, 8],
    4: [0, 0, 0, 4, 8],
    5: [0, 0, 0, 8, 12, 17],
}

let broadMessage = async (chatId, message) => {
    await Promise.all(gameInfoMap[chatId].playerList.map(el => utils.sendMessage(el.userId, message)));
    await utils.sendMessage(chatId, message)
}

let endGame = async (chatId) => {
    delete gameInfoMap[chatId];
}
exports.endGame = endGame;

let startGame = async (chatId, gameInfo) => {
    gameInfoMap[chatId] = gameInfo;
    if (gameInfo.playerList.length < 3 || gameInfo.playerList.length > 5) {
        await utils.sendMessage(chatId, '需要的玩家数量为3-5人。当前仅有' + gameInfo.playerList.length + '人。');
        return;
    }

    // 玩家洗牌
    gameInfo.playerList = utils.shufflingArray(gameInfo.playerList);
    gameInfo.playerList.forEach((el, index) => el.index = index);

    // 卡片洗牌
    gameInfo.publicCardList = JSON.parse(JSON.stringify(baseCardList));
    gameInfo.publicCardList = gameInfo.publicCardList.filter(el => !el.remove || !el.remove.includes(gameInfo.playerList.length));
    gameInfo.publicCardList = utils.shufflingArray(gameInfo.publicCardList);

    // 国家洗牌
    gameInfo.countryList = JSON.parse(JSON.stringify(countryMap[gameInfo.playerList.length]));
    gameInfo.countryList = utils.shufflingArray(gameInfo.countryList);
    for (let i = 0; i < gameInfo.playerList.length; i++) {
        gameInfo.playerList[i].country = gameInfo.countryList[i];
    }

    // 私有产业洗牌
    gameInfo.industryList = JSON.parse(JSON.stringify(industryMap[gameInfo.playerList.length]));
    gameInfo.industryList = utils.shufflingArray(gameInfo.industryList);
    for (let i = 0; i < gameInfo.playerList.length; i++) {
        gameInfo.playerList[i].industry = gameInfo.industryList[i];
    }

    gameInfo.playerList.forEach(el => {
        el.price = 0
        el.cardList = []
        el.roundZeroPoint = []
        el.minPrice = false
        el.maxPrice = false
    });


    startRound(chatId, 0);

    await utils.sendMessage(chatId, '游戏开始');
    return;
}
exports.startGame = startGame;

let startRound = async (chatId, round) => {
    let gameInfo = gameInfoMap[chatId];

    // 游戏结束
    if (round >= gameInfo.publicCardList.length) {
        await countPoint(chatId);
        return;
    }

    if (round % gameInfo.playerList.length === 0 && Math.floor(round / gameInfo.playerList.length) !== 0) {
        await broadMessage(chatId, `第${Math.floor(round / gameInfo.playerList.length)}轮竞价结束。当前各国产业结构为:\n\n` + (await Promise.all(gameInfo.playerList.map(el => showPlayer(el, gameInfo.playerList.length, "private")))).join('\n\n------------\n\n'));
    }

    // 新一轮提示
    if (round % gameInfo.playerList.length === 0 && gameInfo.playerList.length > 3) {
        await broadMessage(chatId, `第${Math.floor(round / gameInfo.playerList.length) + 1}轮竞价开始，0元出价加分已重制。`);
        gameInfo.playerList.forEach(el => { el.roundZeroPoint.push(0) })
    }

    gameInfo.nowCard = gameInfo.publicCardList[round];
    gameInfo.playerList.forEach(el => { el.roundDone = false });

    // 主持人出价
    if (round !== gameInfo.publicCardList.length - 1 || gameInfo.playerList.length !== 3) {
        // 普通流程
        gameInfo.nowDealer = gameInfo.playerList[round % gameInfo.playerList.length];

        // 主持人出价
        gameInfo.nowProcess = "dealer_price";
        gameInfo.nowDealer.waitPromise = new Promise((resolve, reject) => {
            gameInfo.nowDealer.continueFunc = resolve
        });
        await utils.sendMessage(gameInfo.nowDealer.userId, await showPlayer(gameInfo.nowDealer, gameInfo.playerList.length) + `\n\n------------\n\n${gameInfo.nowCard.country}-${gameInfo.nowCard.industry}(${gameInfo.nowCard.point}分)\n\n请出价。`);

        await gameInfo.nowDealer.waitPromise;
        await Promise.all(gameInfo.playerList.filter(el => el !== gameInfo.nowDealer).map(async (el) => utils.sendMessage(el.userId, await showPlayer(el, gameInfo.playerList.length) + `\n\n------------\n\n${gameInfo.nowCard.country}-${gameInfo.nowCard.industry}(${gameInfo.nowCard.point}分)\n${gameInfo.nowDealer.country} 出价 ${gameInfo.nowDealer.roundPrice}\n\n竞价开始，请出价。`)));
    } else {
        // 三人最后一张产业主持人不出价
        gameInfo.nowDealer = null;
        await Promise.all(gameInfo.playerList.filter(el => el !== gameInfo.nowDealer).map(async (el) => utils.sendMessage(el.userId, await showPlayer(el, gameInfo.playerList.length) + `\n\n------------\n\n${gameInfo.nowCard.country}-${gameInfo.nowCard.industry}(${gameInfo.nowCard.point}分)\n\n最后一张产业，没有主持人，请直接出价。`)));
    }
    // 竞价
    gameInfo.nowProcess = "player_price";
    gameInfo.playerList.forEach(el => { el.waitPromise = new Promise((resolve, reject) => { el.continueFunc = resolve }) });
    let zeroPricePlayer = []
    let maxPricePlayer = []
    let maxRoundPrice = 0
    while (true) {
        await Promise.all(gameInfo.playerList.filter(el => el !== gameInfo.nowDealer).map(async (el) => el.waitPromise));

        if (gameInfo.nowDealer) {
            await utils.sendMessage(gameInfo.nowDealer.userId, `${gameInfo.nowCard.country}-${gameInfo.nowCard.industry}(${gameInfo.nowCard.point}分):\n` + gameInfo.playerList.map(el => `${el.country} 出价 ${el.roundPrice}`).join('\n'));
        }
        maxPricePlayer = []
        maxRoundPrice = 0
        zeroPricePlayer = []
        gameInfo.playerList.forEach(el => {
            if (el.roundPrice === 0) {
                zeroPricePlayer.push(el);
            }

            if (el.roundPrice > maxRoundPrice) {
                maxPricePlayer = [el];
                maxRoundPrice = el.roundPrice;
            } else if (el.roundPrice === maxRoundPrice) {
                maxPricePlayer.push(el);
            }
        });

        if (maxPricePlayer.length === 1) {
            gameInfo.nowCard.price = maxRoundPrice;
            maxPricePlayer[0].cardList.push(gameInfo.nowCard);
            break;
        }

        if (maxPricePlayer.length > 1) {
            maxPricePlayer.forEach(el => {
                el.roundPrice = 0
                el.roundDone = false
                el.waitPromise = new Promise((resolve, reject) => { el.continueFunc = resolve });
            });

            await broadMessage(chatId, `${maxPricePlayer.map(el => el.country).join('、')} 出价相同，重新竞价。`);
        }
    }

    if (gameInfo.playerList.length > 3) zeroPricePlayer.forEach(el => { el.roundZeroPoint[el.roundZeroPoint.length - 1] = 2 });

    await broadMessage(chatId, `${gameInfo.nowCard.country}-${gameInfo.nowCard.industry}(${gameInfo.nowCard.point}分)\n` + (zeroPricePlayer.length ? `零元出价: ${zeroPricePlayer.map(el => el.country).join('、')}\n` : '') + `最高出价: ${maxPricePlayer.map(el => el.country).join('、')}`);

    startRound(chatId, round + 1);
}

bot.on('message', async (msg) => {
    if (!isNaN(Number(msg.text))) {
        for (let chatId of Object.keys(gameInfoMap)) {
            let gameInfo = gameInfoMap[chatId];
            let player = gameInfoMap[chatId].playerList.find(el => el.userId === msg.from.id && !el.roundDone && ((gameInfo.nowProcess === "dealer_price" && el === gameInfo.nowDealer) || (gameInfo.nowProcess === "player_price" && el !== gameInfo.nowDealer)))
            if (player) {
                let gameInfo = gameInfoMap[chatId];
                let playerPrice = 0
                try {
                    playerPrice = Math.floor(Number(msg.text));
                } catch (e) {
                    await utils.sendMessage(player.userId, '请输入数字');
                    return;
                }

                // 检查是否是当前玩家
                if (gameInfo.nowProcess === "dealer_price" && player !== gameInfo.nowDealer) {
                    await utils.sendMessage(player.userId, '还不是你出价');
                    return;
                }
                if (gameInfo.nowProcess === "player_price" && player === gameInfo.nowDealer) {
                    await utils.sendMessage(player.userId, '还不是你出价');
                    return;
                }

                if (playerPrice < 0) {
                    await utils.sendMessage(player.userId, '请输入大于等于0的数字');
                    break;
                }
                player.roundPrice = playerPrice;
                player.roundDone = true;
                player.continueFunc()
                return;
            }
        }
    }
});

let showPlayer = async (player, playerCount, method) => {
    // 产业垄断
    let monopolyPoint = 0
    let monopolyStr = industryMap[playerCount].map(industry => {
        let industryCount = player.cardList.filter(card => card.industry === industry).length;
        if (player.industry === industry) industryCount++;
        let industryPoint = monopolyPointMap[playerCount][industryCount];
        monopolyPoint += industryPoint;
        return `\t${industry}(${industryCount}家): ${industryPoint}分`
    }).join('\n');
    //产业多样化
    let playerIndustries = {}
    industryMap[playerCount].forEach(el => playerIndustries[el] = 0);
    player.cardList.forEach(card => playerIndustries[card.industry]++);
    //追加私有产业
    playerIndustries[player.industry]++;
    let diversificationPoint = 0;
    for (let i = 0; i < 6; i++) {
        let tempCount = 0;
        for (let industry in playerIndustries) {
            if (playerIndustries[industry] > i) tempCount++;
        }
        if (tempCount > 0) {
            diversificationPoint += diversificationPointMap[playerCount][tempCount];
        }
        else {
            break;
        }
    }
    // 国有化
    let nationalizedCount = player.cardList.filter(el => el.country === player.country).length
    // 已有产业
    let cardPoint = player.cardList.reduce((a, b) => a + b.point, 0);

    // 总分
    player.point = cardPoint + nationalizedPointMap[playerCount][nationalizedCount] + player.roundZeroPoint.reduce((a, b) => a + b, 0) + monopolyPoint + diversificationPoint;

    let message = [
        `国家: ${player.country}`,
    ]
    if (method !== "private") message.push(`私有产业: ${player.industry}`)

    if (playerCount > 3) {
        message.push(`零出价加分: ${player.roundZeroPoint.reduce((a, b) => a + b, 0)}分(${player.roundZeroPoint.join('/')})`)
    }
    if (player.cardList.length > 0) {
        message.push(`已有产业: ${cardPoint}分\n${player.cardList.map(el => `\t${el.country}-${el.industry}(${el.point}分` + (method !== "private" ? `/${el.price})` : ')')).join('\n')}`,);
    }
    message.push(`国有化分值: ${nationalizedCount}家(${nationalizedPointMap[playerCount][nationalizedCount]}分)`)

    if (method !== "private") {
        message.push(`垄断分值:\n${monopolyStr}`)
        message.push(`多样化分值: ${diversificationPoint}`)
    }

    player.price = player.cardList.reduce((a, b) => a + b.price, 0)
    if (method !== 'private') {
        if (player.minPrice || player.maxPrice) {
            if (player.minPrice) {
                message.push(`总出价: ${player.price}(最低出价！)`);
                if (playerCount < 5) {
                    message.push(`总分: ${player.point} + 6 = ${player.point + 6}分`);
                    player.point = player.point + 6;
                }
                else {
                    message.push(`总分: ${player.point} + 7 = ${player.point + 7}分`);
                    player.point = player.point + 7;
                }
            }
            if (player.maxPrice) {
                message.push(`总出价: ${player.price}(最高出价！)`);
                message.push(`总分: 0分，爆仓(${player.point}分)`);
                player.point = 0;
            }
        } else {
            message.push(`总出价: ${player.price}`);
            message.push(`总分: ${player.point}分`);
        }
    }

    return message.join('\n');
}

let countPoint = async (chatId) => {
    let gameInfo = gameInfoMap[chatId];

    let minPricePlayer = [gameInfo.playerList[0]]
    let maxPricePlayer = [gameInfo.playerList[0]]
    for (let i = 1; i < gameInfo.playerList.length; i++) {
        await showPlayer(gameInfo.playerList[i], gameInfo.playerList.length);

        if (gameInfo.playerList[i].price < minPricePlayer[0].price) {
            minPricePlayer = [gameInfo.playerList[i]]
        } else if (gameInfo.playerList[i].price === minPricePlayer[0].price) {
            minPricePlayer.push(gameInfo.playerList[i]);
        }

        if (gameInfo.playerList[i].price > maxPricePlayer[0].price) {
            maxPricePlayer = [gameInfo.playerList[i]]
        } else if (gameInfo.playerList[i].price === maxPricePlayer[0].price) {
            maxPricePlayer.push(gameInfo.playerList[i]);
        }
    }

    minPricePlayer.forEach(el => el.minPrice = true);
    maxPricePlayer.forEach(el => el.maxPrice = true);

    // 重新计算得分
    gameInfo.playerList.map(el => showPlayer(el, gameInfo.playerList.length));
    let message = (await Promise.all(gameInfo.playerList.map(el => showPlayer(el, gameInfo.playerList.length)))).join('\n\n------------\n\n');

    let winner = [gameInfo.playerList[0]];
    for (let i = 1; i < gameInfo.playerList.length; i++) {
        if (gameInfo.playerList[i].point > winner[0].point) {
            winner = [gameInfo.playerList[i]];
        } else if (gameInfo.playerList[i].point === winner[0].point) {
            winner.push(gameInfo.playerList[i]);
        }
    }

    message += "\n\n------------\n\n" + winner.map(el => `${el.country}`).join('、') + '获胜！\n';
    await broadMessage(chatId, message);

    delete gameInfoMap[chatId];
}