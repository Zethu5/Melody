const { getSongsQueue } = require("../functions/general");
const { stopSong } = require("../functions/ytdl-core");

async function _stop(msg) {
    await stopSong();
    msg.channel.send(`\`[⏸️] Paused ${getSongsQueue()[0].name}\``);
}

exports.stop = _stop;