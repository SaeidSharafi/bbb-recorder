#!/bin/bash
. /home/kuro/.bashrc

lockdir1=/tmp/bbb-record-script-pid-1
lockdir2=/tmp/bbb-record-script-pid-2
lockdir3=/tmp/bbb-record-script-pid-3

mkdir $lockdir1
if [ $? -ne 0 ]; then
  mkdir $lockdir2
  if [ $? -ne 0 ]; then
    mkdir $lockdir3
    if [ $? -ne 0 ]; then
      echo "All dir locker"
    else
      lockdir=$lockdir3
      echo "[$(date)] lockdir3 created"
    fi
  else
    lockdir=$lockdir2
    echo "[$(date)] lockdir2 created"
  fi
else
  lockdir=$lockdir1
  echo "[$(date)] lockdir1 created"
fi
# take pains to remove lock directory when script terminates
trap 'rm -rf $lockdir' EXIT INT TERM
# Create a file with current PID to indicate that process is running.
echo $$ >>"${lockdir}/$$"

echo "[$(date)] Cron task started" >>sc.log

echo "[$(date)] starting recording script" >>sc.log
cd /home/kuro/bbb-recorder /usr/local/bin/node export.js --rebuild f >app.log 2>&1

