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
      echo "All dir locked, stopping script" 2>>sc.log
      exit 1
    else
      mkdir $lockdir3
      echo "[$(date)] lockdir3 created" 2>>sc.log
    fi
  else
    mkdir $lockdir2
    echo "[$(date)] lockdir2 created" 2>>sc.log
  fi
else
  mkdir $lockdir1
  echo "[$(date)] lockdir1 created" 2>>sc.log
fi


# take pains to remove lock directory when script terminates
trap 'rm -rf $lockdir' EXIT INT TERM
# Create a file with current PID to indicate that process is running.
echo $$ 2>>"${lockdir}/$$"

echo "[$(date)] Cron task started" 2>>sc.log

echo "[$(date)] starting recording script" 2>>sc.log
cd /home/kuro/bbb-recorder
/usr/local/bin/node export.js --lockdir "${lockdir}" --rebuild >app.log 2>&1

