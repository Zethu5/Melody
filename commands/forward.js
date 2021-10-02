const { forwardPlayingSong } = require("../functions/ytdl-core");

async function _forward(msg) {
    const secondsToAdd = Number(msg.content.replace(/^(!fw|!forward)\s/,''));
    const succeeded = await forwardPlayingSong(secondsToAdd);
    
    if(!succeeded) {
        msg.channel.send(`\`[❌] Added time exceeded song duration\``);
    } else {
        msg.channel.send(`\`[✔️] Forwarded ${secondsToAdd} seconds\``);
    }
}

exports.forward = _forward;