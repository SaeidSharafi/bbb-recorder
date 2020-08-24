#!/bin/bash
. /home/kuro/.bashrc
envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found"
  exit 1
fi
echo "[$(date)] Cron task started" 2>>"${scriptLog}"

for ((i = 1; i <= SPAWNS; i++)); do
  lockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
  if [[ -d $lockdir ]]; then
    for entry in "${lockdir}"/*; do
      echo "stopping job" 2>>"${scriptLog}"
      echo $(basename "${entry}") 2>>"${scriptLog}"
      pid=$(basename "${entry}")
      echo "Loc Directory: ${entry}" 2>>"${scriptLog}"
      echo "job pid: ${pid}" 2>>"${scriptLog}"
      kill -QUIT "${pid}" &
      echo "${pid} stopped" 2>>"${scriptLog}"
    done
  fi
done
