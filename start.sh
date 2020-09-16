#!/bin/bash
. /root/.bashrc

envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found"
  exit 1
fi
if [ ! -d "$recorderDir" ]; then
  echo "installation directory could not be found, check .env file"
  exit 1
fi
exec 2>>"${scriptLog}" 2>&1
count=$(ls -d "${recordingsPath}"/* | wc -l)
echo "[$(date)] Cron task started"
lockdir=""
if [ "$count" -le 0 ]; then
  echo "Nothing to process. exiting.."
  exit 0
fi
if [ "$count" -gt "$SPAWNS" ]; then
  echo "number of recordings is ${count} and more than number of spawns(${SPAWNS})"
  echo "multiple processes will be launched"
  for ((i = 1; i <= SPAWNS; i++)); do
    templockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
    if [[ -d $templockdir ]]; then
      continue
    else
      lockdir=$templockdir
      mkdir $lockdir
      echo "[$(date)] ${lockdir} created"
      echo "[$(date)] starting recording script"
      cd "${recorderDir}"
      nohup /usr/local/bin/node export.js --lockdir "${lockdir}" --index "${i}" >"${appLog}/app${i}.log" 2>&1 &
      sleep 2
    fi
  done
  if [ -z "${lockdir}" ]; then
    echo "All directories are locked, stopping script"
    exit 1
  else
    echo "Started ${SPAWNS} jobs, use stop.sh to kill the processes"
  fi
else
  echo "number of recordings is ${count} and smaller than number of spawns(${SPAWNS})"
  echo "only one process will be launched"
  lockdir="${baseLockDir}/bbb-recorder-lockdir-single"
  if [[ -d $lockdir ]]; then
    echo "directory is locked, stopping script"
    exit 1
  else
    mkdir $lockdir
    echo "[$(date)] ${lockdir} created"
    echo "[$(date)] starting recording script"
    cd "${recorderDir}"
    /usr/local/bin/node export.js --lockdir "${lockdir}" --index -1 >"${appLog}/app-single.log" 2>&1
  fi

  echo "Started recording process, use stop.sh to kill the process"
fi

#trap 'rm -rf $lockdir' EXIT INT TERM

# take pains to remove lock directory when script terminates

# Create a file with current PID to indicate that process is running.
#echo $$ 2>>"${lockdir}/$$"
