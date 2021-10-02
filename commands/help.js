const { sendHelpEmbedMsg } = require("../functions/discord");

async function _help(msg) {
    await sendHelpEmbedMsg(msg);
}

exports.help = _help;