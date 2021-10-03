const { sendQueueEmbededMsg } = require("../functions/discord");

async function _queue(msg) {
    await sendQueueEmbededMsg(0, msg, false);
}

exports.queue = _queue;