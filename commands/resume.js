const { getSongsQueue } = require("../functions/general");
const { resumeSong } = require("../functions/ytdl-core");

async function _resume(msg) {
    await resumeSong();
    msg.channel.send(`\`[▶️] Resumed ${getSongsQueue()[0].name}\``);
}

exports.resume = _resume;