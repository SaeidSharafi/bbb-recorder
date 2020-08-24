#!/bin/bash
. /home/kuro/.bashrc
# Check if we are root
uid=$(id -u)
if [ $uid -ne 0 ]
then
    echo "Please run as root"
    exit 1
fi
mkdir "/etc/bbb-recorder"

cp .env.example /etc/bbb-recorder/.env
ln -s /etc/bbb-recorder/.env .env
chmod 0755 /etc/bbb-recorder/.env
