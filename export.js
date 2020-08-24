const puppeteer = require('puppeteer');
const Xvfb = require('xvfb');
const fs = require('fs');
const os = require('os');
const yargs = require('yargs');
const homedir = os.homedir();
const platform = os.platform();
const argv = yargs
    .usage('Usage: $0 --lockdir [proccess-lock directory]')
    .alias('l','lockdir')
    .nargs('l',1)
    .describe('l','proccess-lock directory address (without')
    .alias('n','name')
    .nargs('n',1)
    .describe('n','file name')
    .default('n','output')
    .alias('d','duration')
    .nargs('d',1)
    .describe('d','recording duration')
    .alias('r','rebuild')
    .boolean('r')
    .boolean('c')
    .nargs('r',0)
    .describe('r','rebuild all recordings')
    .alias('c','mp4')
    .nargs('c',0)
    .describe('c','save files as mp4')
    .argv;

process.title="bbbrecorder"
process.on('SIGQUIT', function() {
    console.warn("Force Closing");
    try {
        fs.unlinkSync(argv.lockdir+"/"+process.pid)
        //file removed
    } catch(err) {
        console.error(err)
    }
    process.exit(1);
});
console.debug(process.title)
console.debug('Giving process a custom name: bbbrecorder')
process.title = "bbbrecorder"
console.debug('Process started. PID: ' + process.pid + ' | name: ' + process.title)
console.debug(argv.lockdir+"/"+process.pid)
fs.writeFileSync(argv.lockdir+"/"+process.pid,"")

const {copyToPath, playbackFile, bbbUrl, recordingsPath} = require('./env');

const spawn = require('child_process').spawn;
const path = require('path');


var xvfb = new Xvfb({
    silent: true,
    xvfb_args: ["-screen", "0", "1280x800x24", "-ac", "-nolisten", "tcp", "-dpi", "96", "+extension", "RANDR"]
});
var width = 1280;
var height = 720;
var options = {
    headless: false,
    args: [
        '--enable-usermedia-screen-capturing',
        '--allow-http-screen-capture',
        '--auto-select-desktop-capture-source=bbbrecorder',
        '--load-extension=' + __dirname,
        '--disable-extensions-except=' + __dirname,
        '--disable-infobars',
        '--no-sandbox',
        '--shm-size=1gb',
        '--disable-dev-shm-usage',
        '--start-fullscreen',
        '--app=https://www.google.com/',
        `--window-size=${width},${height}`,
    ],
}
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss' });
if (platform == "linux") {
    options.executablePath = "/usr/bin/google-chrome"
} else if (platform == "darwin") {
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
} else {
    options.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
}

async function main() {
    try {


        const dirs = fs.readdirSync(recordingsPath, {
            withFileTypes: true
        }).filter(c => c.isDirectory()).map(c => c.name);
        console.log(dirs);

        asyncForEach(dirs, async (element) => {
            if (platform == "linux") {
                xvfb.startSync()
            }

            url = bbbUrl + "/playback/presentation/2.0/" + playbackFile + "?meetingId=" + element;
            var meeting_id = element;
            console.log("Initializing options for meeting"+ meeting_id)

            var rebuild = argv.rebuild;
            var exportname = argv.name;
            var convert = argv.mp4
            if(!rebuild){

                let extension = convert ? ".mp4" : ".webm";

                let destinationPath = copyToPath + "/";
                if (meeting_id)
                    destinationPath = copyToPath + "/" + meeting_id + "/";
                let target = destinationPath + exportname + extension;
                if (fs.existsSync(target)){
                    console.warn(target + ' Already exist! skipping...');
                    return;
                }
            }else {
                console.log("Rebuilding all recordings")
            }

            if (!url) {
                console.warn('URL undefined!');
                process.exit(1);
            }
            console.log("Checking for url");
            // Verify if recording URL has the correct format
            var urlRegex = new RegExp('^https?:\\/\\/.*\\/playback\\/presentation\\/2\\.0\\/' + playbackFile + '\\?meetingId=[a-z0-9]{40}-[0-9]{13}');
            if (!urlRegex.test(url)) {
                console.warn('Invalid recording URL!');
                process.exit(1);
            }


            exportname += ".webm";
            // Use meeting ID as export name if it isn't defined or if its value is "MEETING_ID"
            if (!exportname || exportname == "MEETING_ID") {
                exportname = element + '.webm';
            }

            var duration = argv.duration;
            // If duration isn't defined, set it in 0
            if (!duration) {
                duration = 0;
                // Check if duration is a natural number
            } else if (!Number.isInteger(Number(duration)) || duration < 0) {
                console.warn('Duration must be a natural number!');
                process.exit(1);
            }

            if (!convert) {
                convert = false
            } else if (convert !== true && convert !== true) {
                console.warn("Invalid convert value!" + convert);
                process.exit(1);
            }
            console.log("Opening Browser");
            const browser = await puppeteer.launch(options)
            const pages = await browser.pages()

            const page = pages[0]

            page.on('console', msg => {
                var m = msg.text();
                //console.log('PAGE LOG:', m) // uncomment if you need
            });

            await page._client.send('Emulation.clearDeviceMetricsOverride')
            // Catch URL unreachable error
            await page.goto(url, {waitUntil: 'networkidle2'}).catch(e => {
                console.error('Recording URL unreachable!');
                process.exit(2);
            })
            await page.setBypassCSP(true)

            // Check if recording exists (search "Recording not found" message)
            var loadMsg = await page.evaluate(() => {
                return document.getElementById("load-msg").textContent;
            });
            if (loadMsg == "Recording not found") {
                console.warn("Recording not found!");
                process.exit(1);
            }

            // Get recording duration
            var recDuration = await page.evaluate(() => {
                return document.getElementById("video").duration;
            });
            // If duration was set to 0 or is greater than recDuration, use recDuration value
            if (duration == 0 || duration > recDuration) {
                duration = recDuration;
            }

            await page.waitForSelector('button[class=acorn-play-button]');
            await page.$eval('#navbar', element => element.style.display = "none");
            await page.$eval('#copyright', element => element.style.display = "none");
            await page.$eval('.acorn-controls', element => element.style.opacity = "0");
            await page.click('button[class=acorn-play-button]', {waitUntil: 'domcontentloaded'});
            console.log("Start recording");
            await page.evaluate((x) => {
                console.log("REC_START");
                window.postMessage({type: 'REC_START'}, '*')
            })

            // Perform any actions that have to be captured in the exported video
            await page.waitFor((duration * 1000))

            await page.evaluate(filename => {
                window.postMessage({type: 'SET_EXPORT_PATH', filename: filename}, '*')
                window.postMessage({type: 'REC_STOP'}, '*')
            }, exportname)

            // Wait for download of webm to complete
            console.log("stop recording");
            console.log("waiting for download to complete");
            await page.waitForSelector('html.downloadComplete', {timeout: 0})
            await page.close()
            await browser.close()
            console.log("terminating browser");

            if (convert) {
                console.log("Converting to mp4");
                convertAndCopy(exportname, meeting_id)
            } else {
                console.log("moving to target destination");
                copyOnly(exportname, meeting_id)
            }
            if (platform == "linux") {
                xvfb.stopSync()
            }
        });

    } catch (err) {
        console.log(err)
    }

}

main()
function killScript(){
    console.warn("Force Closing");
    process.exit(1);
}
function convertAndCopy(filename, meeting_id = "") {

    var copyFromPath = homedir + "/Downloads";
    var onlyfileName = filename.split(".webm")
    var mp4File = onlyfileName[0] + ".mp4"
    var copyFrom = copyFromPath + "/" + filename + ""
    let destinationPath = copyToPath + "/";
    if (meeting_id)
        destinationPath = copyToPath + "/" + meeting_id + "/";

    var copyTo = destinationPath + mp4File;

    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath);
    }

    console.log(copyTo);
    console.log(copyFrom);

    const ls = spawn('ffmpeg',
        ['-y',
            '-i "' + copyFrom + '"',
            '-c:v libx264',
            '-preset veryfast',
            '-movflags faststart',
            '-profile:v high',
            '-level 4.2',
            '-max_muxing_queue_size 9999',
            '-vf mpdecimate',
            '-vsync vfr "' + copyTo + '"'
        ],
        {
            shell: true
        }
    );

    ls.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    ls.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
        if (code == 0) {
            console.log("Convertion done to here: " + copyTo)
            fs.unlinkSync(copyFrom);
            console.log('successfully deleted ' + copyFrom);
        }

    });

}

function copyOnly(filename, meeting_id = "") {
    var onlyfileName = filename.split(".webm")
    var copyFrom = homedir + "/Downloads/" + filename;
    let destinationPath = copyToPath + "/";
    if (meeting_id)
        destinationPath = copyToPath + "/" + meeting_id + "/";
    var copyTo = destinationPath + filename;

    if (!fs.existsSync(destinationPath)) {
        fs.mkdirSync(destinationPath);
    }

    try {

        fs.copyFileSync(copyFrom, copyTo)
        console.log('successfully copied ' + copyTo);

        fs.unlinkSync(copyFrom);
        console.log('successfully delete ' + copyFrom);
    } catch (err) {
        console.log(err)
    }
}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}