const {
    isSongsQueueEmpty,
    getSongsQueueLength,
    getSongsQueue
} = require('../functions/general');

const { skipToSong } = require('../functions/ytdl-core');

async function _skipTo(msg) {
    const index = Number(msg.content.replace(/(\!st|\!skipto)\s/,''));
    const numSongs = getSongsQueueLength();
    
    if(isSongsQueueEmpty()) {
        msg.channel.send(`\`[❗] No songs in queue\``);
    } else if(numSongs < index) {
        msg.channel.send(`\`[❗] Queue has only ${numSongs} songs\``);
    } else {
        msg.channel.send(`\`[↪️] Skipping to song #${index}: ${getSongsQueue()[index - 1].name}\``);
        await skipToSong(index - 2);
    }
}

exports.skipTo = _skipTo;