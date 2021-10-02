const {
    isSongExistsInQueue,
    isSongsQueueEmpty,
    addSongToQueue,
    getHelperVars,
    setHelperVar
} = require("../functions/general");

const { 
    getYoutubePlaylistId,
    getYoutubePlaylistName,
    getYoutubeVideoName,
    getYoutubeVideoNameById,
    getYoutubeVideoId,
    getVideoByKeyWords
} = require("../functions/youtube");

const {
    addPlaylistToQueue,
    playQueue
} = require("../functions/ytdl-core");

async function _play(msg) {
    // check if user is connected to a voice channel
    if(!msg.member.voice.channel) {
        msg.channel.send(`\`[❗] You're not connected to a voice channel\``);
        return;
    }

    // try to play the youtube video
    const search = msg.content.replace(/^(\!p|\!play)\s/,'');
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
    const { isBotPlayingSongs } = getHelperVars();

    if(!isBotPlayingSongs) {
        console.log('[INFO] Started playing queue');
        setHelperVar('isBotPlayingSongs', true);
        await playQueue(msg);
    }
}

exports.play = _play;