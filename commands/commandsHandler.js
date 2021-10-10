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
const { skipTo }        = require('./skipTo');
const { loop }          = require('./loop');
const { forward }       = require('./forward');
const { rewind }        = require('./rewind');
const { seek }          = require('./seek');
const { clear }         = require('./clear');
const { queue }         = require('./queue');
const { nowPlaying }    = require('./nowPlaying');
const { help }          = require('./help');

const {
    userHasRole
} = require('../functions/discord');

const roleNeeded = 'ADMINS';

async function _commandsHandler(msg) {
    const command = msg.content;

    if(command.match(regexPlayCmd)) {
        await play(msg);
    } else if(command.match(regexStopCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await stop(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexResumeCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await resume(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexSkipCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await skip(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexSkipToSongCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await skipTo(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexLoopCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await loop(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexForwardCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await forward(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexRewindCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await rewind(msg);
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexSeekCmd)) {
        if(userHasRole(msg, roleNeeded)) {
         await seek(msg);   
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexClearCmd)) {
        if(userHasRole(msg, roleNeeded)) {
            await clear(msg);   
        } else {
            msg.channel.send(`\`[❌] You do not have the appropriate role - ${roleNeeded}\``);
        }
    } else if (command.match(regexQueueCmd)) {
        await queue(msg);
    } else if (command.match(regexNowPlayingCmd)) {
        await nowPlaying(msg);
    } else if (command.match(regexHelpCmd)) {
        await help(msg);
    }
}

exports.commandsHandler = _commandsHandler;