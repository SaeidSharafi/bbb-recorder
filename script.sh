#!/bin/bash
. /home/kuro/.bashrc
date | tee sc.log
cd /home/kuro/bbb-recorder
/usr/local/bin/node export.js --rebuild > app.log 2>&1