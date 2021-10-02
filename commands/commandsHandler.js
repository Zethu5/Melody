const { 
    regexPlayCmd, 
    regexStopCmd, 
    regexResumeCmd, 
    regexSkipCmd, 
    regexSkipToSongCmd, 
    regexLoopCmd, 
    regexForwardCmd, 
    regexRewindCmd, 
    regexSeekCmd, 
    regexClearCmd, 
    regexQueueCmd, 
    regexNowPlayingCmd, 
    regexHelpCmd
} = require('./commandsRegex');

const { play }          = require('./play');
const { stop }          = require('./stop');
const { resume }        = require('./resume');
const { skip }          = require('./skip');
const { skipTo }        = require('./skipto');
const { loop }          = require('./loop');
const { forward }       = require('./forward');
const { rewind }        = require('./rewind');
const { seek }          = require('./seek');
const { clear }         = require('./clear');
const { queue }         = require('./queue');
const { nowPlaying }    = require('./nowPlaying');
const { help }          = require('./help');

async function _commandsHandler(msg) {
    const command = msg.content;

    if(command.match(regexPlayCmd)) {
        await play(msg);
    } else if(command.match(regexStopCmd)) {
        await stop(msg);
    } else if (command.match(regexResumeCmd)) {
        await resume(msg);
    } else if (command.match(regexSkipCmd)) {
        await skip(msg);
    } else if (command.match(regexSkipToSongCmd)) {
        await skipTo(msg);
    } else if (command.match(regexLoopCmd)) {
        await loop(msg);
    } else if (command.match(regexForwardCmd)) {
        await forward(msg);
    } else if (command.match(regexRewindCmd)) {
        await rewind(msg);
    } else if (command.match(regexSeekCmd)) {
        await seek(msg);
    } else if (command.match(regexClearCmd)) {
        await clear(msg);
    } else if (command.match(regexQueueCmd)) {
        await queue(msg);
    } else if (command.match(regexNowPlayingCmd)) {
        await nowPlaying(msg);
    } else if (command.match(regexHelpCmd)) {
        await help(msg);
    }
}

exports.commandsHandler = _commandsHandler;