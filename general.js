const fs                                     = require('fs');
const { SONGS_QUEUE_FILE, HELPER_VARS_FILE } = require('./config.json');
const {
    getYoutubeVideoId,
} = require('./youtube')


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
    return songsQueue > 0 ? true : false;
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
    let helperVars                           = {};
    helperVars['isBotPlayingSongs']          = false;
    helperVars['queueDisplayPageIndex']      = 0;
    helperVars['queueEmbedReactionUsersIds'] = [];
    setHelperVars(helperVars);
}

function clearQueueEmbedUsersReactions(embedMsg) {
    const { queueEmbedReactionUsersIds } = getHelperVars();
    queueEmbedReactionUsersIds.forEach(userId => {
        embedMsg.reactions.resolve('⬅️').users.remove(userId);
        embedMsg.reactions.resolve('➡️').users.remove(userId);
    });
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

async function skipToSong(index) {
    let songsQueue = getSongsQueue();

    while(songsIdsQueue[0].id != songsQueue[index]) {
        removePlayedSongFromQueue();
    }

    setHelperVar('queueDisplayPageIndex',0);
}

function msIntoReadableTime(milliseconds){
    //Get hours from milliseconds
    var hours = milliseconds / (1000*60*60);
    var absoluteHours = Math.floor(hours);
    var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;
  
    //Get remainder from hours and convert to minutes
    var minutes = (hours - absoluteHours) * 60;
    var absoluteMinutes = Math.floor(minutes);
    var m = absoluteMinutes > 9 ? absoluteMinutes : '0' +  absoluteMinutes;
  
    //Get remainder from minutes and convert to seconds
    var seconds = (minutes - absoluteMinutes) * 60;
    var absoluteSeconds = Math.floor(seconds);
    var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;
  
  
    return h + ':' + m + ':' + s;
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
exports.clearQueueEmbedUsersReactions   = clearQueueEmbedUsersReactions;
exports.removePlayedSongFromQueue       = removePlayedSongFromQueue;
exports.addSongToQueue                  = addSongToQueue;
exports.clearQueue                      = clearQueue;
exports.isSongExistsInQueue             = isSongExistsInQueue;
exports.skipToSong                      = skipToSong;
exports.msIntoReadableTime              = msIntoReadableTime;