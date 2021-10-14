const {
    sendSongAddedEmbedMsg
} = require("../functions/discord");

const {
    isSongExistsInQueue, getHelperVars, getSongsQueueLength, setHelperVar
} = require("../functions/general");

const {
    getSpotifyTrackIdFromUrl,
    getSpotifyTrack
} = require("../functions/spotify");

const {
    getYoutubeVideoNameByUrl,
    getYoutubeVideoId,
    getVideoIdByKeyWords
} = require("../functions/youtube");

const {
    addYoutubeVideoToQueueFirstPositionById, playQueue
} = require("../functions/ytdl-core");

const {
    determinePlayType
} = require("./play");

async function handleYoutubeVideoPlayTop(msg, search) {
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
    await addYoutubeVideoToQueueFirstPositionById(getYoutubeVideoId(search));
}

async function handleSpotifySongPlayTop(msg, search) {
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
    await addYoutubeVideoToQueueFirstPositionById(youtubeVideoId);
}

async function handleYoutubeSearchPlayTop(msg, search) {
    const youtubeVideoId = await getVideoIdByKeyWords(search);

    if(youtubeVideoId == null) {
        msg.channel.send(`\`[❌] No video was found\``);
        return;
    } else if (youtubeVideoId === 403) {
        msg.channel.send(`\`[❌] Youtube API reached it's quota for today, try again later\``);
        return;
    }

    await sendSongAddedEmbedMsg(msg, `https://www.youtube.com/watch?v=${youtubeVideoId}`);
    await addYoutubeVideoToQueueFirstPositionById(youtubeVideoId);
}

async function _playTop(msg) {
    const search = msg.content.replace(/^(\!pt|\!playtop)\s/,'');
    msg.channel.send(`\`[🔎] Searching ${search}\``);
    const playType = determinePlayType(search);

    switch(playType) {
        case 'youtube-playlist':
            msg.channel.send(`\`[❌] '!playtop' command doesn not support playlists\``);
        break;

        case 'youtube-song':
            await handleYoutubeVideoPlayTop(msg, search);
        break;

        case 'spotify-playlist':
            msg.channel.send(`\`[❗] Spotify playlist are not supported due to high network usage\``);
            return;
        break;

        case 'spotify-song':
            await handleSpotifySongPlayTop(msg, search);
        break;

        case 'youtube-search':
            await handleYoutubeSearchPlayTop(msg, search);
        break;
    }

    // start playing queue in nothing is playing now
    const { isBotPlayingSongs } = getHelperVars();

    if(!isBotPlayingSongs && getSongsQueueLength() > 0) {
        console.log('[INFO] Started playing queue');
        setHelperVar('isBotPlayingSongs', true);
        await playQueue(msg);
    }
}

exports.playTop = _playTop;