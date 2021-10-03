const { getHelperVars } = require("../functions/general");
const { loop } = require("../functions/ytdl-core");

async function _loop(msg) {
    await loop(msg);
    const { isLoopingEnabled } = getHelperVars();
    isLoopingEnabled ? msg.channel.send(`\`Looping enabled\``) : msg.channel.send(`\`Looping disabled\``);
}

exports.loop = _loop;