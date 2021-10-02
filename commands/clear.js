const { clearQueue } = require("../functions/general");

async function _clear(msg) {
    clearQueue('clear');
    msg.channel.send(`\`[🧹] Cleared queue\``);
}

exports.clear = _clear;