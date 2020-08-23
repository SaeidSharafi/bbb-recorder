#!/bin/bash
. /home/kuro/.bashrc
echo "[`date`] Cron task started" >> sc.log
result=`ps aux | grep -i "script.sh" | grep -v "grep" | wc -l`
echo $result
if [ $result -ge 3 ]
   then
        echo "[${date}] script is already running" >> sc.log
        echo "[${date}] exiting" >> sc.log
   else
        echo "[`date`] starting recording script" >> sc.log
        cd /home/kuro/bbb-recorder                                                                                                                                                                                                                                                        /usr/local/bin/node export.js --rebuild > app.log 2>&1                                                                                                                                                                                                                    f
fi