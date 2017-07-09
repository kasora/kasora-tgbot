#!/usr/bin/expect
spawn scp ./index.js kasora.moe:~/code/kasora-bot/
expect 'index'
spawn ssh kasora.moe
send "pm2 restart telegram\r"
send "pm2 log telegram\r"
interact