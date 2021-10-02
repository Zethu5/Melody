const { goToTimeInPlayingSong } = require("../functions/ytdl-core");

async function _seek(msg) {
    const secondsToGoTo = Number(msg.content.replace(/^(!sk|!seek)\s/,''));
    const succeeded = await goToTimeInPlayingSong(secondsToGoTo);

    if(!succeeded) {
        msg.channel.send(`\`[❌] Time to go to wasn't in song length range\``);
    } else {
        msg.channel.send(`\`[✔️] Song current play time: ${secondsToGoTo} seconds\``);
    }
}

exports.seek = _seek;