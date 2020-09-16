#!/bin/bash
. /root/.bashrc
envFile=/etc/bbb-recorder/.env
if [ -f "$envFile" ]; then
  export $(cat "$envFile" | sed 's/#.*//g' | xargs)
else
  echo ".env file cannot be found"
  exit 1
fi
while true; do
  read -p "Warning! make sure no recording job is active in background and run stop.sh before running this script, do you want to continue? Y/n" yn
  case $yn in
  [Yy]*)
    for ((i = 1; i <= SPAWNS; i++)); do
      lockdir="${baseLockDir}/bbb-recorder-lockdir-${i}"
      if [[ -d $lockdir ]]; then
        rm -rf "${lockdir}"
        echo "${lockdir} removed!"
      fi
    done
    rm -rf "${baseLockDir}/bbb-recorder-lockdir-single"
    echo "${baseLockDir}/bbb-recorder-lockdir-single removed!"
    rm -rf "${baseLockDir}/bbb-recorder-lockdir-xml"
    echo "${baseLockDir}/bbb-recorder-lockdir-single removed!"
    break
    ;;
  [Nn]*) exit ;;
  *) echo "Please answer yes or no." ;;
  esac
done
