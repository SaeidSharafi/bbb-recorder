const puppeteer = require('puppeteer');
const Xvfb = require('xvfb');
const fs = require('fs');
const os = require('os');
const yargs = require('yargs');
const parseString = require("xml2js").parseString;
const xml2js = require("xml2js");
const homedir = os.homedir();
const platform = os.platform();
const argv = yargs
    .usage('Usage: $0 --lockdir [proccess-lock directory]')
    .alias('l', 'lockdir')
    .nargs('l', 1)
    .describe('l', 'proccess-lock directory address')
    .alias('i', 'index')
    .nargs('i', 1)
    .describe('i', 'spawn index')
    .alias('n', 'name')
    .nargs('n', 1)
    .describe('n', 'file name')
    .default('n', 'output')
    .alias('d', 'duration')
    .nargs('d', 1)
    .describe('d', 'recording duration')
    .alias('r', 'rebuild')
    .boolean('r')
    .boolean('c')
    .nargs('r', 0)
    .describe('r', 'rebuild all recordings')
    .alias('c', 'mp4')
    .nargs('c', 0)
    .describe('c', 'save files as mp4')
    .argv;


process.on('SIGQUIT', function () {
    console.warn("Force Closing");

    process.exit(1);
});


console.debug(process.title)
console.debug('Giving process a custom name: bbbrecorder')
process.title = "bbbrecorder"
console.debug('Process started. PID: ' + process.pid + ' | name: ' + process.title)
console.debug(argv.lockdir + "/" + process.pid)
fs.writeFileSync(argv.lockdir + "/" + process.pid, "")

const {copyToPath, playbackFile, bbbUrl, recordingsPath, keepBBBRecording, SPAWNS} = require('./env');

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
require('console-stamp')(console, {pattern: 'dd/mm/yyyy HH:MM:ss'});
if (platform == "linux") {
    options.executablePath = "/usr/bin/google-chrome"
} else if (platform == "darwin") {
    options.executablePath = "/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
} else {
    options.executablePath = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
}

async function main() {
    try {

        var rebuild = argv.rebuild;
        var exportname = argv.name;
        var convert = argv.mp4

        const dirs = fs.readdirSync(recordingsPath, {
            withFileTypes: true
        }).filter(c => c.isDirectory()).map(c => c.name);

        if (!rebuild) {
            let extension = convert ? ".mp4" : ".webm";
            dirs.forEach((dir, index, object) => {
                let target = copyToPath + "/" + dir + "/" + exportname + extension;
                if (fs.existsSync(target)) {
                    console.warn(target + ' Already exist! skipping...');
                    object.splice(index, 1);
                }
            });

        } else {
            console.log("Rebuilding all recordings")
        }
        console.log("All recordings: \n\t\t\t\t" + dirs.join("\n\t\t\t\t"));
        var slicedDirs = [];
        if (argv.index != -1 && argv.index > 0) {
            console.log("Number of recordings: " + dirs.length);

            let max_rooms = Math.floor(dirs.length / SPAWNS);
            console.log("Number of recordings to process: " + max_rooms);

            var index = Math.floor((argv.index - 1) * max_rooms);
            console.log("starting index (of all recordings): " + index);

            var lastIndex = Math.floor((argv.index) * max_rooms);
            console.log("last index (of all recordings): " + lastIndex);

            if (lastIndex >= dirs.length || (argv.index == SPAWNS)) {
                lastIndex = dirs.length
            }


            for (; index < lastIndex; index++) {
                let lockFile = recordingsPath + "/" + dirs[index] + "/.locked";
                if (!fs.existsSync(lockFile)) {
                    console.log("locking " + dirs[index]);
                    fs.writeFileSync(lockFile, "")
                    slicedDirs.push(dirs[index]);
                } else {
                    console.log(dirs[index] + " is already locked, skiping ..");
                }

            }
            console.log("recordings to process :\n\t\t\t\t" + slicedDirs.join("\n\t\t\t\t"));
        } else {
            for (index = 0; index < dirs.length; index++) {
                let lockFile = recordingsPath + "/" + dirs[index] + "/.locked";
                if (!fs.existsSync(lockFile)) {
                    console.log("locking " + dirs[index]);
                    fs.writeFileSync(lockFile, "")
                    slicedDirs.push(dirs[index]);
                } else {
                    console.log(dirs[index] + " is already locked, skiping ..");
                }

            }
        }
        console.log(exportname);
        asyncForEach(slicedDirs, async (element) => {
            if (platform == "linux") {
                xvfb.startSync()
            }
            exportname = argv.name;
            url = bbbUrl + "/playback/presentation/2.0/" + playbackFile + "?meetingId=" + element;
            var meeting_id = element;
            console.log("Initializing options for meeting" + meeting_id)

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
            console.log("duration to record:" + duration);
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
            if (platform == "linux") {
                xvfb.stopSync()
            }
            if (convert) {
                console.log("Converting to mp4");
                convertAndCopy(exportname, meeting_id)
            } else {
                console.log("moving to target destination");
                copyOnly(exportname, meeting_id)
            }



            // let lockFile = copyToPath + "/" + meeting_id + "/.locked";
            // if (fs.existsSync(lockFile)) {
            //     fs.unlinkSync(lockFile);
            // }
        });

    } catch (err) {
        console.log(err)
    }

}

main()
process.on('exit', (code) => {
    console.log('Process exit event with code: ', code);
    try {
        var slicedDirs = []
        // Removing lock files in recording directories
        const dirs = fs.readdirSync(recordingsPath, {
            withFileTypes: true
        }).filter(c => c.isDirectory()).map(c => c.name);
        if (argv.index != -1 && argv.index != 0) {
            let max_rooms = Math.floor(dirs.length / SPAWNS);

            var index = Math.floor((argv.index - 1) * max_rooms);
            console.log("starting index (of all recordings): " + index);

            var lastIndex = Math.floor((argv.index) * max_rooms);
            console.log("last index (of all recordings): " + lastIndex);

            if (lastIndex >= dirs.length || (argv.index == SPAWNS)) {
                lastIndex = dirs.length
            }
            slicedDirs = dirs.slice(index, lastIndex);
        } else {
            slicedDirs = dirs;
        }
        slicedDirs.forEach((dir) => {
            let lockFile = recordingsPath + "/" + dir + "/.locked";
            console.log("removing: " + lockFile);
            if (fs.existsSync(lockFile)) {

                fs.unlinkSync(lockFile);
            }
        });

        // Removing lock directories and proccess id
        console.log("removing processlock: " + process.pid);
        fs.unlinkSync(argv.lockdir + "/" + process.pid)
        console.log("removing lockdir: " + argv.lockdir);
        fs.rmdirSync(argv.lockdir, {recursive: true}, (err) => {
            if (err) {
                throw err;
            }
            console.log(`${argv.lockdir} is deleted!`);
        });
        //file removed
    } catch (err) {
        console.error(err)
    }
});

function killScript() {
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
            if (meeting_id)
                changeMeta(meeting_id, mp4File);
        }

    });


}

function copyOnly(filename, meeting_id = "") {
    var onlyfileName = filename.split(".webm");
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
        if (meeting_id)
            changeMeta(meeting_id, filename);
    } catch (err) {
        console.log(err)
    }
}

function changeMeta(meeting_id, filename) {
    let xmlFilePath = copyToPath + "/" + meeting_id + "/metadata.xml";
    let dirPath = copyToPath + "/" + meeting_id;
    console.log("xml Path:" + xmlFilePath);
    //var parsString = require("xml2js").parseString;

    try {
        let data = fs.readFileSync(xmlFilePath, "utf-8");
        //console.log("data");
        //console.log(data);
        parseString(data, function (err, result) {
                if (err) console.log(err);

                //console.log(result);
                var json = result;
                if (keepBBBRecording == 'false') {
                    console.log("changing thumbnail address");
                    thumbPath = path.join(recordingsPath, meeting_id, "presentation");
                    if (fs.existsSync(thumbPath)) {
                        let dirs = fs.readdirSync(thumbPath, {withFileTypes: true});
                        let copyFrom = "";
                        dirs.forEach(dir => {
                            if (dir.isDirectory()) {
                                copyFrom = path.join(recordingsPath, meeting_id, "presentation", dir.name, "thumbnails", "thumb-1.png");
                            }
                        });
                        let copyTo = path.join(recordingsPath, meeting_id, "thumb.png");

                        if (fs.existsSync(copyFrom)) {
                            fs.copyFileSync(copyFrom, copyTo)
                            json.recording.playback[0].extensions[0].preview[0].images[0].image[0]._ =
                                bbbUrl + "/download/presentation/" + meeting_id + "/" + "thumb.png";
                        }
                    }
                    console.log("setting presentaion address to point video file");
                    json.recording.playback[0].format = "download";
                    json.recording.playback[0].link =
                        bbbUrl + "/download/presentation/" + meeting_id + "/" + filename;

                    let files = fs.readdirSync(dirPath, {withFileTypes: true});
                    files.forEach(file => {
                        const fileDir = path.join(dirPath, file.name)
                        if (file.name != 'metadata.xml' && file.name != filename && file.name != 'thumb.png') {
                            if (file.isDirectory()) {
                                console.info("Deleting Directory: " + fileDir)
                                fs.rmdirSync(fileDir, {recursive: true})
                            } else {
                                console.info("Deleting File: " + fileDir)
                                fs.unlinkSync(fileDir);
                            }
                        }
                    })
                    var builder = new xml2js.Builder();
                    var xml = builder.buildObject(json);
                    console.log("re-writing xml file");
                    var resualt = fs.writeFileSync(xmlFilePath, xml);
                }



            }
        );
    } catch (err) {
        console.error(err)

    }


}

async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}