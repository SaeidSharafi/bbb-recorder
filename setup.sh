#!/bin/bash
. /home/kuro/.bashrc
# Check if we are root
uid=$(id -u)
if [ $uid -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi
if [[ ! -d "/etc/bbb-recorder" ]]; then
  mkdir "/etc/bbb-recorder"
fi
echo "removing current .env file"
rm .env
echo "copied .env.example file to  /etc/bbb-recorder/.env"
cp .env.example /etc/bbb-recorder/.env
echo "checking if symlink exist"
if [[ ! -L .env ]]; then
  ln -s /etc/bbb-recorder/.env .env
fi
chmod 0755 /etc/bbb-recorder/.env
echo "adding cron jobs (start every night at 10:00 PM and stop at 07:00 AM)"
command="${PWD}/start.sh > ${PWD}/logs/script.log 2>&1"
job="0 22 * * * $command"
cat <(fgrep -i -v "$command" <(crontab -l)) <(echo "$job") | crontab -
command="${PWD}/stop.sh > ${PWD}/logs/script.log 2>&1"
job="0 07 * * * $command"
cat <(fgrep -i -v "$command" <(crontab -l)) <(echo "$job") | crontab -