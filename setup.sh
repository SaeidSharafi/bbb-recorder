#!/bin/bash
. /home/kuro/.bashrc
# Check if we are root
uid=$(id -u)
if [ $uid -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi
if [[ ! -d $templockdir ]]; then
  mkdir "/etc/bbb-recorder"
fi
rm .env
cp .env.example /etc/bbb-recorder/.env
if [[ ! -L .env ]]; then
  ln -s /etc/bbb-recorder/.env .env
fi
chmod 0755 /etc/bbb-recorder/.env
