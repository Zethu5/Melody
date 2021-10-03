const { getNowPlaying } = require('../functions/discord');
const { isSongsQueueEmpty } = require('../functions/general');

async function _nowPlaying(msg) {
    if(!isSongsQueueEmpty()) {
        await getNowPlaying(msg);
    } else {
        msg.channel.send(`\`[❌] No song is currently playing\``);
    }    
}

exports.nowPlaying = _nowPlaying;