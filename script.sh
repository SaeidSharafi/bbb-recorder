#!/bin/bash
. /home/kuro/.bashrc

lockdir1=/tmp/bbb-record-script-pid-1
lockdir2=/tmp/bbb-record-script-pid-2
lockdir3=/tmp/bbb-record-script-pid-3

if [[ -d $lockdir1 ]]
then
  if [[ -d $lockdir2 ]]
  then
    if [[ -d $lockdir3 ]]
    then
      echo "All dir locked, stopping script"
      exit 1
    else
      mkdir $lockdir3
      echo "[$(date)] lockdir3 created"
    fi
  else
    mkdir $lockdir2
    echo "[$(date)] lockdir2 created"
  fi
else
  mkdir $lockdir1
  echo "[$(date)] lockdir2 created"
fi


# take pains to remove lock directory when script terminates
trap 'rm -rf $lockdir' EXIT INT TERM
# Create a file with current PID to indicate that process is running.
echo $$ >>"${lockdir}/$$"

echo "[$(date)] Cron task started" >>sc.log

echo "[$(date)] starting recording script" >>sc.log
cd /home/kuro/bbb-recorder /usr/local/bin/node export.js --lockdir $lockdir --rebuild f >app.log 2>&1

