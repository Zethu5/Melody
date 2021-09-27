const { 
    getYoutubePlaylistId, 
    getYoutubeVideoName,
    getYoutubeVideoNameById,
    getYoutubePlaylistName, 
    getYoutubeVideoId,
    getVideoByKeyWords
} = require('./youtube')

const {
    playQueue,
    addPlaylistToQueue,
    stopSong,
    continueSong,
    skipSong,
    skipToSong,
    forwardPlayingSong,
    rewindPlayingSong,
    goToTimeInPlayingSong,
    loop
} = require('./ytdl-core')

const {
    addSongToQueue,
    clearQueue,
    isSongExistsInQueue,
    initSongsQueue,
    initHelperVars,
    isSongsQueueEmpty,
    getHelperVars,
    getSongsQueueLength,
    setHelperVar,
    getSongsQueue
} = require('./general')

const {
    sendQueueEmbededMsg,
    sendHelpEmbedMsg,
    getNowPlaying,
    isMsgFromDevServer
} = require('./discord')

const { Client, Intents }         = require('discord.js');
const { MELODY_ID, MELODY_DEV_ID, MELODY_TOKEN, MELODY_DEV_TOKEN, DEV } = require('./config.json');
const http                        = require('http');

const client = new Client({ intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_PRESENCES, 
        Intents.FLAGS.GUILD_VOICE_STATES
]});

const {
    regexPlayCmd,
    regexStopCmd,
    regexContinueCmd,
    regexSkipCmd,
    regexQueueCmd,
    regexClearCmd,
    regexSkipToSongCmd, 
    regexForwardCmd,
    regexRewindCmd,
    regexSeekCmd,
    regexNowPlayingCmd,
    regexHelpCmd,
    regexLoopCmd
} = require('./commands');


client.once('ready', () => {
    initSongsQueue();
    initHelperVars();

    const melodyStatuses = ['Developed by Zethus', '!help'];
    let index = 0;

    setInterval(() => {
        if(index === melodyStatuses.length) index = 0;
        const status = melodyStatuses[index];
        client.user.setActivity(status);
        index++;
    }, 5000);

    DEV ? console.log("Melody DEV Online!"): console.log("Melody Online!");
});

client.on('messageCreate', async msg => {    
    // check if in development or not
    if(DEV) {
        const result = await isMsgFromDevServer(msg);
        if(!result) {
            return;
        }
    }

    let { isBotPlayingSongs, queueDisplayPageIndex } = getHelperVars()
    const msgContent = msg.content;

    if(msgContent.match(regexPlayCmd)) {
        // check if user is connected to a voice channel
        if(!msg.member.voice.channel) {
            msg.channel.send(`\`[❗] You're not connected to a voice channel\``);
            return;
        }

        // try to play the youtube video
        const search = msgContent.replace(/^(\!p|\!play)\s/,'');
        msg.channel.send(`\`[🔎] Searching ${search}\``);

        // url was a youtube playlist and not a single song
        if(search.match(/[&?]list=([^&]+)/)) {
            const youtubePlaylistId = await getYoutubePlaylistId(search);
            let youtubePlaylistName = null;

            if(youtubePlaylistId != null) {
                youtubePlaylistName = await getYoutubePlaylistName(youtubePlaylistId);
                msg.channel.send(`\`[🎶] Playing playlist: ${youtubePlaylistName}\``);
                await addPlaylistToQueue(youtubePlaylistId);
            } else {
                msg.channel.send(`\`[❓] Playlist wasn't found\``);
                return;
            }
        } else if (search.match(/\?v=.+/)){
            const youtubeVideoName = await getYoutubeVideoName(search);

            // video couldn't be reached or already exists in queue
            if(!youtubeVideoName) {
                msg.channel.send(`\`[❌] There was a problem accessing the song\``);
                return;
            } else if(isSongExistsInQueue(search)) {
                msg.channel.send(`\`[♻️] ${youtubeVideoName} already exists in queue\``);
                return;
            }

            // play song or add it to queue
            if(!isSongsQueueEmpty()) {
                msg.channel.send(`\`[✔️] Added ${youtubeVideoName}\``);
            } else {
                msg.channel.send(`\`[🎶] Playing ${youtubeVideoName}\``);
            }

            addSongToQueue(getYoutubeVideoId(search), youtubeVideoName);
        } else {
            const youtubeVideoId = await getVideoByKeyWords(search);

            if(youtubeVideoId == null) {
                msg.channel.send(`\`[❌] No video was found\``);
                return;
            }

            const youtubeVideoName = await getYoutubeVideoNameById(youtubeVideoId);
            
            // play song or add it to queue
            if(!isSongsQueueEmpty()) {
                msg.channel.send(`\`[✔️] Added ${youtubeVideoName}\``);
            } else {
                msg.channel.send(`\`[🎶] Playing ${youtubeVideoName}\``);
            }

            addSongToQueue(await getVideoByKeyWords(youtubeVideoId), youtubeVideoName);
        }

        // start playing queue in nothing is playing now
        if(!isBotPlayingSongs) {
            console.log('[INFO] Started playing queue');
            setHelperVar('isBotPlayingSongs', true);
            await playQueue(msg);
        }
    } else if(msgContent.match(regexStopCmd)) { //pause song
        await stopSong();
        msg.channel.send(`\[⏸️] Paused ${getSongsQueue()[0].name}\``);
    } else if (msgContent.match(regexContinueCmd)) { //continue song
        await continueSong();
        msg.channel.send(`\`[▶️] Continued ${getSongsQueue()[0].name}\``);
    } else if(msgContent.match(regexSkipCmd)) { //skip song
        await skipSong();
        msg.channel.send(`\`[↪️] Skipped ${getSongsQueue()[0].name}\``);
    } else if(msgContent.match(regexQueueCmd)) {     
        queueDisplayPageIndex = 0;
        await sendQueueEmbededMsg(queueDisplayPageIndex, msg, false);
    } else if(msgContent.match(regexClearCmd)) {
        clearQueue('clear');
        msg.channel.send(`\`[🧹] Cleared queue\``);
    } else if(msgContent.match(regexSkipToSongCmd)) {
        const index = Number(msgContent.replace(/(\!st|\!skipto)\s/,''));
        if(isSongsQueueEmpty()) {
            msg.channel.send(`\`[❗] No songs in queue\``);
        } else if(getSongsQueueLength() < index) {
            msg.channel.send(`\`[❗] Queue has fewer than ${index} songs - ${getSongsQueueLength}\``);
        } else {
            await skipToSong(index - 2);
            msg.channel.send(`\`[↪️] Skipping to song #${index}\``);
        }
    } else if(msgContent.match(regexForwardCmd)) {
        const secondsToAdd = Number(msgContent.replace(/^(!fw|!forward)\s/,''));
        const succeeded = await forwardPlayingSong(secondsToAdd);

        if(!succeeded) {
            msg.channel.send(`\`[❌] Added time exceeded song duration\``);
        } else {
            msg.channel.send(`\`[✔️] Forwarded ${secondsToAdd} seconds\``);
        }
    } else if(msgContent.match(regexRewindCmd)) {
        const secondsToRewind = Number(msgContent.replace(/^(!rw|!rewind)\s/,''));
        const succeeded = await rewindPlayingSong(secondsToRewind);

        if(!succeeded) {
            msg.channel.send(`\`[❌] Rewind time exceeded song beggining\``);
        } else {
            msg.channel.send(`\`[✔️] Rewinded ${secondsToRewind} seconds\``);
        }
    } else if(msgContent.match(regexSeekCmd)) {
        const secondsToGoTo = Number(msgContent.replace(/^(!sk|!seek)\s/,''));
        const succeeded = await goToTimeInPlayingSong(secondsToGoTo);

        if(!succeeded) {
            msg.channel.send(`\`[❌] Time to go to wasn't in song length range\``);
        } else {
            msg.channel.send(`\`[✔️] Song current play time: ${secondsToGoTo} seconds\``);
        }
    } else if(msg.content.match(regexNowPlayingCmd)) {
        if(!isSongsQueueEmpty()) {
            await getNowPlaying(msg);
        } else {
            msg.channel.send(`\`[❌] No song is currently playing\``);
        }
    } else if(msg.content.match(regexLoopCmd)) {
        await loop(msg);
        const { isLoopingEnabled } = getHelperVars();
        isLoopingEnabled ? msg.channel.send(`\`Looping enabled\``) : msg.channel.send(`\`Looping disabled\``);
    } else if(msgContent.match(regexHelpCmd)) {
        await sendHelpEmbedMsg(msg);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.id != MELODY_ID && user.id != MELODY_DEV_ID) {
        let { queueDisplayPageIndex, queueEmbedReactionUsersIds } = getHelperVars();

        if(reaction.emoji.name == '⬅️') {
            if(queueDisplayPageIndex > 0) {
                queueDisplayPageIndex--;
                sendQueueEmbededMsg(queueDisplayPageIndex, null, true);
                setHelperVar('queueDisplayPageIndex',queueDisplayPageIndex);
            }
        } else if(reaction.emoji.name == '➡️') {
            if(queueDisplayPageIndex < Number(getSongsQueueLength()/10-1)) {
                queueDisplayPageIndex++;
                sendQueueEmbededMsg(queueDisplayPageIndex, null, true);
                setHelperVar('queueDisplayPageIndex',queueDisplayPageIndex);
            }
        }

        if(!queueEmbedReactionUsersIds.includes(user.id)) {
            queueEmbedReactionUsersIds.push(user.id);
            setHelperVar('queueEmbedReactionUsersIds',queueEmbedReactionUsersIds);
        }
    }
});

client.on('voiceStateUpdate', (oldVoiceState, newVoiceState) => {
    if(oldVoiceState.member.id == MELODY_ID && newVoiceState.member.id == MELODY_ID ||
        oldVoiceState.member.id == MELODY_DEV_ID && newVoiceState.member.id == MELODY_DEV_ID) {
        if(newVoiceState.channel) {
            setHelperVar('isBotDisconnected', false);
        } else if (oldVoiceState.channel) {
            setHelperVar('isBotDisconnected', true);
            initSongsQueue();
            initHelperVars();
        }
    }
});


if(DEV){
    setHelperVar('client',client);
    client.login(MELODY_DEV_TOKEN);
} else {
    setHelperVar('client',client);
    client.login(MELODY_TOKEN);    
}