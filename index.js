const { 
    getYoutubePlaylistId, 
    getYoutubeVideoName, 
    getYoutubePlaylistName 
} = require('./youtube')

const {
    playQueue,
    addPlaylistToQueue,
    stopSong,
    continueSong,
    skipSong,
    forwardPlayingSong
} = require('./ytdl-core')

const {
    addSongToQueue,
    clearQueue,
    isSongExistsInQueue,
    skipToSong,
    initSongsQueue,
    initHelperVars,
    isSongsQueueEmpty,
    getHelperVars,
    getSongsQueueLength,
    setHelperVar,
    getSongsQueue
} = require('./general')

const {
    sendQueueEmbededMsg
} = require('./discord')

const { Client, Intents }         = require('discord.js');
const { MELODY_ID, MELODY_TOKEN } = require('./config.json');

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
    regexForwardCmd
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
        const youtubeUrl = msgContent.replace(/^(\!p|\!play)\s/,'');
        msg.channel.send(`\`[🔎] Searching ${youtubeUrl}\``);

        // url was a youtube playlist and not a single song
        if(youtubeUrl.match(/[&?]list=([^&]+)/)) {
            const youtubePlaylistId = getYoutubePlaylistId(youtubeUrl);
            const youtubePlaylistName = await getYoutubePlaylistName(youtubePlaylistId);

            msg.channel.send(`\`[🎶] Playing playlist: ${youtubePlaylistName}\``);
            await addPlaylistToQueue(youtubePlaylistId);
        } else {
            const youtubeVideoName = await getYoutubeVideoName(youtubeUrl);

            // video couldn't be reached or already exists in queue
            if(!youtubeVideoName) {
                msg.channel.send(`\`[❌] There was a problem playing ${youtubeUrl}\``);
                return;
            } else if(isSongExistsInQueue(youtubeUrl)) {
                msg.channel.send(`\`[♻️] ${youtubeVideoName} already exists in queue\``);
                return;
            }

            // play song or add it to queue
            if(!isSongsQueueEmpty()) {
                msg.channel.send(`\`[✔️] Added ${youtubeVideoName}\``);
            } else {
                msg.channel.send(`\`[🎶] Playing ${youtubeVideoName}\``);
            }

            addSongToQueue(youtubeUrl, youtubeVideoName);
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
            await skipToSong(index - 1);
            msg.channel.send(`\`[↪️] Skipping to song #${index}\``);
        }
    } else if(msgContent.match(regexForwardCmd)) {
        const secondsToAdd = msgContent.replace(/^(!fw|!forward)\s/,'');
        forwardPlayingSong(secondsToAdd);
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