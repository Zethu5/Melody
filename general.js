const fs                                     = require('fs');
const { SONGS_QUEUE_FILE, HELPER_VARS_FILE } = require('./config.json');
const {
    getYoutubeVideoId,
} = require('./youtube');


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
exports.isSongExistsInQueue             = isSongExistsInQueue;