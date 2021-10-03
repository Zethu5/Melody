const {
    isSongExistsInQueue,
    isSongsQueueEmpty,
    getHelperVars,
    setHelperVar,
    addSongToQueue
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

const { 
    getSpotifyTrackIdFromUrl,
    getSpotifyTrack
} = require("../functions/spotify");

function determinePlayType(search) {
    if(search.match(/[&?]list=([^&]+)/)) {
        return 'youtube-playlist';
    } else if(search.match(/\?v=.+/)) {
        return 'youtube-song';
    } else if(search.match(/open\.spotify\.com\/track\/.+/)) {
        return 'spotify-song';
    }
    return 'youtube-search';
}

async function handleYoutubePlaylist(msg, search) {
    const youtubePlaylistId = await getYoutubePlaylistId(search);
    let youtubePlaylistName = null;

    if(youtubePlaylistId != null) {
        youtubePlaylistName = await getYoutubePlaylistName(youtubePlaylistId);
        msg.channel.send(`\`[🎶] Playing playlist: ${youtubePlaylistName}\``);
        await addPlaylistToQueue(youtubePlaylistId);
    } else {
        msg.channel.send(`\`[❓] Playlist wasn't found\``);
    }
}

async function handleYoutubeSong(msg, search) {
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
}

async function handleSpotifySong(msg, search) {
    const spotifySongId = await getSpotifyTrackIdFromUrl(search);
    const track         = await getSpotifyTrack(spotifySongId)

    if(track != null) {
        const youtubeVideoId = await getVideoByKeyWords(track.name);
        const youtubeVideoName = await getYoutubeVideoNameById(youtubeVideoId);
        
        // play song or add it to queue
        if(!isSongsQueueEmpty()) {
            msg.channel.send(`\`[✔️] Added ${youtubeVideoName}\``);
        } else {
            msg.channel.send(`\`[🎶] Playing ${youtubeVideoName}\``);
        }

        addSongToQueue(youtubeVideoId, youtubeVideoName);
    } else {
        msg.channel.send(`\`[❌] No song was found\``);
    }
}

async function handleYoutubeSearch(msg, search) {
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

async function _play(msg) {
    // check if user is connected to a voice channel
    if(!msg.member.voice.channel) {
        msg.channel.send(`\`[❗] You're not connected to a voice channel\``);
        return;
    }

    // try to play the song
    const search = msg.content.replace(/^(\!p|\!play)\s/,'');
    const playType = determinePlayType(search);
    msg.channel.send(`\`[🔎] Searching ${search}\``);

    switch(playType) {
        case 'youtube-playlist':
            await handleYoutubePlaylist(msg, search);
        break;

        case 'youtube-song':
            await handleYoutubeSong(msg, search);
        break;

        case 'spotify-song':
            await handleSpotifySong(msg, search);
        break;

        case 'youtube-search':
            await handleYoutubeSearch(msg, search);
        break;
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