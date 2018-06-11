#!/bin/bash
tar -czvf tgbot.tar.gz $(find . ! -type d -not \( -path "./node_modules/*" -o -path "./.git/*" \))
scp ./tgbot.tar.gz kasora.moe:~/prototype/
ssh kasora.moe 2>&1 << eeooff
cd ~/prototype
tar -xzvf tgbot.tar.gz
./start.sh
exit
eeooff
