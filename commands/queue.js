const { sendQueueEmbededMsg } = require("../functions/discord");
const { setHelperVar } = require("../functions/general");

async function _queue(msg) {
    setHelperVar('queueDisplayPageIndex', 0);
    await sendQueueEmbededMsg(0, msg, false);
}

exports.queue = _queue;