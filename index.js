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
    goToTimeInPlayingSong
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
    getNowPlaying
} = require('./discord')

const { Client, Intents }         = require('discord.js');
const { MELODY_ID, MELODY_TOKEN } = require('./config.json');
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
    regexHelpCmd
} = require('./commands');


client.once('ready', () => {
    initSongsQueue();
    initHelperVars();
    console.log("Melody Online!");
});

client.on('messageCreate', async msg => {
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
    } else if (msg.content.match(regexNowPlayingCmd)) {
        if(!isSongsQueueEmpty()) {
            await getNowPlaying(msg);
        } else {
            msg.channel.send(`\`[❌] No song is currently playing\``);
        }
    } else if(msgContent.match(regexHelpCmd)) {
        await sendHelpEmbedMsg(msg);
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    if (user.id != MELODY_ID) {
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

        queueEmbedReactionUsersIds.push(user.id);
        setHelperVar('queueEmbedReactionUsersIds',queueEmbedReactionUsersIds);
    }
});

client.login(MELODY_TOKEN);

// for docker container...
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write('MELODY ONLINE!');
  res.end();
}).listen(8080);