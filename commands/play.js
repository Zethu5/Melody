const {
    isSongExistsInQueue,
    getHelperVars,
    setHelperVar,
    getSongsQueueLength
} = require("../functions/general");

const { 
    getYoutubePlaylistId,
    getYoutubeVideoNameByUrl,
    getYoutubeVideoId,
    getVideoIdByKeyWords
} = require("../functions/youtube");

const {
    addYoutubeVideoToQueueById,
    addYoutubePlaylistToQueueById,
    playQueue
} = require("../functions/ytdl-core");

const { 
    getSpotifyTrackIdFromUrl,
    getSpotifyTrack,
} = require("../functions/spotify");

const {
    sendSongAddedEmbedMsg, sendPlaylistAddedEmbedMsg
} = require("../functions/discord");

function determinePlayType(search) {
    if(search.match(/[&?]list=([^&]+)/)) {
        return 'youtube-playlist';
    } else if(search.match(/\?v=.+/)) {
        return 'youtube-song';
    } else if(search.match(/open\.spotify\.com\/track\/[a-zA-Z0-9]+/)) {
        return 'spotify-song';
    }
    return 'youtube-search';
}

async function handleYoutubePlaylist(msg, search) {
    const youtubePlaylistId = await getYoutubePlaylistId(search);

    if(youtubePlaylistId == null) {
        msg.channel.send(`\`[❓] Playlist wasn't found\``);
        return;
    }

    await sendPlaylistAddedEmbedMsg(msg, search);
    await addYoutubePlaylistToQueueById(youtubePlaylistId);
}

async function handleYoutubeVideo(msg, search) {
    const youtubeVideoName = await getYoutubeVideoNameByUrl(search);

    // video couldn't be reached or already exists in queue
    if(!youtubeVideoName) {
        msg.channel.send(`\`[❌] There was a problem accessing the song\``);
        return;
    } else if(isSongExistsInQueue(search)) {
        msg.channel.send(`\`[♻️] ${youtubeVideoName} already exists in queue\``);
        return;
    }

    // play song or add it to queue
    await sendSongAddedEmbedMsg(msg, search);
    await addYoutubeVideoToQueueById(getYoutubeVideoId(search));
}

async function handleSpotifySong(msg, search) {
    const spotifySongId = await getSpotifyTrackIdFromUrl(search);
    const track         = await getSpotifyTrack(spotifySongId)

    if(track == null) {
        msg.channel.send(`\`[❌] No song was found\``);
    }

    const youtubeVideoId = await getVideoIdByKeyWords(track.name);

    if(youtubeVideoId == null) {
        msg.channel.send(`\`[❌] No song was found\``);
        return;
    } else if (youtubeVideoId === 403) {
        msg.channel.send(`\`[❌] Youtube API reached it's quota for today, try again later\``);
        return;
    }
    
    // play song or add it to queue
    await sendSongAddedEmbedMsg(msg, `https://www.youtube.com/watch?v=${youtubeVideoId}`);
    await addYoutubeVideoToQueueById(youtubeVideoId);
}

async function handleYoutubeSearch(msg, search) {
    const youtubeVideoId = await getVideoIdByKeyWords(search);

    if(youtubeVideoId == null) {
        msg.channel.send(`\`[❌] No video was found\``);
        return;
    } else if (youtubeVideoId === 403) {
        msg.channel.send(`\`[❌] Youtube API reached it's quota for today, try again later\``);
        return;
    }

    await sendSongAddedEmbedMsg(msg, `https://www.youtube.com/watch?v=${youtubeVideoId}`);
    await addYoutubeVideoToQueueById(youtubeVideoId);
}

async function handleSongType(msg, search) {
    const playType = determinePlayType(search);

    switch(playType) {
        case 'youtube-playlist':
            await handleYoutubePlaylist(msg, search);
        break;

        case 'youtube-song':
            await handleYoutubeVideo(msg, search);
        break;

        case 'spotify-playlist':
            msg.channel.send(`\`[❗] Spotify playlist are not supported due to high network usage\``);
            return;
        break;

        case 'spotify-song':
            await handleSpotifySong(msg, search);
        break;

        case 'youtube-search':
            await handleYoutubeSearch(msg, search);
        break;
    }
}

async function _play(msg) {
    // check if user is connected to a voice channel
    if(!msg.member.voice.channel) {
        msg.channel.send(`\`[❗] You're not connected to a voice channel\``);
        return;
    }

    // try to play the song
    const search = msg.content.replace(/^(\!p|\!play)\s/,'');
    await msg.channel.send(`\`[🔎] Searching ${search}\``);
    await handleSongType(msg, search);

    // start playing queue in nothing is playing now
    const { isBotPlayingSongs } = getHelperVars();

    if(!isBotPlayingSongs && getSongsQueueLength() > 0) {
        console.log('[INFO] Started playing queue');
        setHelperVar('isBotPlayingSongs', true);
        await playQueue(msg);
    }
}

exports.determinePlayType   = determinePlayType;
exports.play                = _play;