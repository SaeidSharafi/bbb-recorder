#!/bin/bash
. /home/kuro/.bashrc
envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found" 2>>sc.log
  exit 1
fi
echo "[$(date)] Cron task started" 2>>sc.log

for ((i = 1; i <= SPAWNS; i++)); do
  lockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
  if [[ -d $lockdir ]]; then
    for entry in "${lockdir}"/*; do
      echo $(basename "${entry}")
      pid=$(basename "${entry}")
      echo "entry: ${entry}"
      echo "pid: ${pid}"
      sudo kill -QUIT "${pid}" &
      echo "stoped"
    done
  fi
done
