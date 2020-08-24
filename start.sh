#!/bin/bash
. /home/kuro/.bashrc
echo "[$(date)] Cron task started" 2>>sc.log
envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found" 2>>sc.log
  exit 1
fi
lockdir=""
for ((i = 1; i <= SPAWNS; i++)); do
  templockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
  if [[ -d $templockdir ]]; then
    continue
  else
    lockdir=$templockdir
    mkdir $lockdir
    echo "[$(date)] ${lockdir} created" 2>>sc.log
    break
  fi
done
trap 'rm -rf $lockdir' EXIT INT TERM

if [ -z "${lockdir}" ]; then
  echo "All dir locked, stopping script" 2>>sc.log
  exit 1
else
  echo "[$(date)] starting recording script" 2>>sc.log
  cd /home/kuro/bbb-recorder
  /usr/local/bin/node export.js --lockdir "${lockdir}" --rebuild >app.log 2>&1
fi

# take pains to remove lock directory when script terminates

# Create a file with current PID to indicate that process is running.
#echo $$ 2>>"${lockdir}/$$"
