const { rewindPlayingSong } = require("../functions/ytdl-core");

async function _rewind(msg) {
    const secondsToRewind = Number(msg.content.replace(/^(!rw|!rewind)\s/,''));
    const succeeded = await rewindPlayingSong(secondsToRewind);

    if(!succeeded) {
        msg.channel.send(`\`[❌] Rewind time exceeded song beggining\``);
    } else {
        msg.channel.send(`\`[✔️] Rewinded ${secondsToRewind} seconds\``);
    }
}

exports.rewind = _rewind;