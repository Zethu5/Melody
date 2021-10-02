const {
    getSongsQueue,
    getSongsQueueLength
} = require("../functions/general");

const { skipSong } = require("../functions/ytdl-core");

async function _skip(msg) {
    if(getSongsQueueLength() > 0) {
        await skipSong();
        msg.channel.send(`\`[↪️] Skipped ${getSongsQueue()[0].name}\``);
    } else {
        msg.channel.send(`\`[❌] No songs in queue\``);
    }
}

exports.skip = _skip;