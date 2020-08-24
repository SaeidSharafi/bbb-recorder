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
lockdir=""
for ((i = 0; i < SPAWNS; i++)); do
  templockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
  if [[ -d $templockdir ]]; then
    continue
  else
    lockdir=$templockdir
    mkdir $lockdir
    echo "[$(date)] ${lockdir} created" 2>>"${scriptLog}"
    echo "[$(date)] starting recording script" 2>>"${scriptLog}"
  cd /home/kuro/bbb-recorder
  nohup /usr/local/bin/node export.js --lockdir "${lockdir}" --index "${i}" >"${appLog}${i}app.log" 2>&1 &
  fi
done
#trap 'rm -rf $lockdir' EXIT INT TERM

if [ -z "${lockdir}" ]; then
  echo "All dir locked, stopping script" 2>>"${scriptLog}"
  exit 1
else
  echo "Started ${SPAWNS} jobs, use stop.sh to kill the process" 2>>"${scriptLog}"
fi

# take pains to remove lock directory when script terminates

# Create a file with current PID to indicate that process is running.
#echo $$ 2>>"${lockdir}/$$"
