const fs = require('fs');
const CONFIG_FILE = '../config.json';

let { 
    SONGS_QUEUE_FILE,
    HELPER_VARS_FILE
} = require(CONFIG_FILE);

const {
    getYoutubeVideoId,
} = require('./youtube');


// relative path correction
SONGS_QUEUE_FILE = `${__dirname}/../${SONGS_QUEUE_FILE}`;
HELPER_VARS_FILE = `${__dirname}/../${HELPER_VARS_FILE}`;


function getSongsQueue() {
    const songsQueue =  JSON.parse(fs.readFileSync(SONGS_QUEUE_FILE));
    return songsQueue;
}

function setSongsQueue(songsQueue) {
    fs.writeFileSync(SONGS_QUEUE_FILE, JSON.stringify(songsQueue));
}

function initSongsQueue() {
    clearQueue('init');
}

function isSongsQueueEmpty() {
    const songsQueue = getSongsQueue();
    return songsQueue.length == 0 ? true : false;
}

function getSongsQueueLength() {
    const songsQueue = getSongsQueue();
    return songsQueue.length;
}

function getHelperVars() {
    return require(HELPER_VARS_FILE);
}

function setHelperVars(helperVars) {
    fs.writeFileSync(HELPER_VARS_FILE, JSON.stringify(helperVars));
}

function setHelperVar(variable, value) {
    let helperVars = getHelperVars();
    helperVars[variable] = value;
    setHelperVars(helperVars);
}

function initHelperVars() {
    let helperVars                              = {};
    helperVars['isBotPlayingSongs']             = false;
    helperVars['queueDisplayPageIndex']         = 0;
    helperVars['queueEmbedReactionUsersIds']    = [];
    helperVars['positionInSong']                = 0;
    helperVars['embedMsg']                      = {}
    helperVars['isBotDisconnected']             = true;
    helperVars['client']                        = {};
    helperVars['isLoopingEnabled']              = false;
    setHelperVars(helperVars);
}

function removePlayedSongFromQueue() {
    let songsQueue = getSongsQueue();
    songsQueue.shift();
    setSongsQueue(songsQueue);
}

function addSongToQueue(youtubeVideoId, youtubeVideoName) {
    let songsQueue = getSongsQueue();
    songsQueue.push({'id': youtubeVideoId, 'name': youtubeVideoName})
    setSongsQueue(songsQueue);
}

function clearQueue(mode) {
    // clear the queue except the song playing
    // else just init the queue
    if(mode == 'clear') {
        setSongsQueue([getSongsQueue()[0]]);
    } else if (mode == 'init') {
        setSongsQueue([]);
    }
}

function isSongExistsInQueue(youtubeVideoUrl) {
    const youtubeVideoId = getYoutubeVideoId(youtubeVideoUrl);
    const songsQueue = getSongsQueue();
    return songsQueue.some(x => x.id == youtubeVideoId);
}

<<<<<<< HEAD
function base64Encode(str) {
    return Buffer.from(str).toString('base64');
}

=======
>>>>>>> 79fccfed628d35af2d49802b0d9f4f4ada5c5386
exports.getSongsQueue                   = getSongsQueue;
exports.setSongsQueue                   = setSongsQueue;
exports.initSongsQueue                  = initSongsQueue;
exports.isSongsQueueEmpty               = isSongsQueueEmpty;
exports.getSongsQueueLength             = getSongsQueueLength;
exports.getHelperVars                   = getHelperVars;
exports.setHelperVars                   = setHelperVars;
exports.setHelperVar                    = setHelperVar;
exports.initHelperVars                  = initHelperVars;
exports.removePlayedSongFromQueue       = removePlayedSongFromQueue;
exports.addSongToQueue                  = addSongToQueue;
exports.clearQueue                      = clearQueue;
<<<<<<< HEAD
exports.isSongExistsInQueue             = isSongExistsInQueue;
exports.base64Encode                    = base64Encode;
=======
exports.isSongExistsInQueue             = isSongExistsInQueue;
>>>>>>> 79fccfed628d35af2d49802b0d9f4f4ada5c5386
