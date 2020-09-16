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

echo "re-writing xml files"
lockdir="${baseLockDir}/bbb-recorder-lockdir-xml"
if [[ -d $lockdir ]]; then
  echo "directory is locked, stopping script"
  exit 1
else
  mkdir $lockdir
  echo "[$(date)] ${lockdir} created"
  echo "[$(date)] starting xml re-write"
  cd "${recorderDir}"
  nohup /usr/local/bin/node export.js --lockdir "${lockdir}" --index -1 --xml >"${appLog}/app-single.log" 2>&1 &
fi


#trap 'rm -rf $lockdir' EXIT INT TERM

# take pains to remove lock directory when script terminates

# Create a file with current PID to indicate that process is running.
#echo $$ 2>>"${lockdir}/$$"
