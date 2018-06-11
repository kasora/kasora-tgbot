#!/bin/bash
pm2 stop app.js -n tgbot
npm i
pm2 start app.js -n tgbot