#!/bin/bash
. /root/.bashrc
envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found"
  exit 1
fi
exec 2>>"${scriptLog}" 2>&1
echo "[$(date)] Cron task started"

for ((i = 1; i <= SPAWNS; i++)); do
  lockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
  if [[ -d $lockdir ]]; then
    for entry in "${lockdir}"/*; do
      echo "stopping job"
      echo $(basename "${entry}")
      pid=$(basename "${entry}")
      echo "Loc Directory: ${entry}"
      echo "job pid: ${pid}"
      kill -QUIT "${pid}" &
      echo "${pid} stopped"
    done
  fi
done
lockdir="${baseLockDir}/bbb-recorder-lockdir-single"
if [[ -d $lockdir ]]; then
  for entry in "${lockdir}"/*; do
    echo "stopping job"
    echo $(basename "${entry}")
    pid=$(basename "${entry}")
    echo "Loc Directory: ${entry}"
    echo "job pid: ${pid}"
    kill -QUIT "${pid}" &
    echo "${pid} stopped"
  done
fi
