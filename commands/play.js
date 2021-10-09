const {
    isSongExistsInQueue,
    isSongsQueueEmpty,
    getHelperVars,
    setHelperVar,
    addSongToQueue,
    getSongsQueueLength
} = require("../functions/general");

const { 
    getYoutubePlaylistId,
    getYoutubePlaylistName,
    getYoutubeVideoNameByUrl,
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
    getSpotifyTrack,
    getSpotifyPlaylistTracksById,
    getSpotifyPlaylistIdFromUrl,
    getSpotifyPlaylistNameById
} = require("../functions/spotify");

const {
    sendSongAddedEmbedMsg
} = require("../functions/discord");

function determinePlayType(search) {
    if(search.match(/[&?]list=([^&]+)/)) {
        return 'youtube-playlist';
    } else if(search.match(/\?v=.+/)) {
        return 'youtube-song';
    } else if (search.match(/open\.spotify\.com\/playlist\/[a-zA-Z0-9]+/)) {
        return 'spotify-playlist';
    } else if(search.match(/open\.spotify\.com\/track\/[a-zA-Z0-9]+/)) {
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
    addSongToQueue(getYoutubeVideoId(search), youtubeVideoName);
}

async function handleSpotifySong(msg, search) {
    const spotifySongId = await getSpotifyTrackIdFromUrl(search);
    const track         = await getSpotifyTrack(spotifySongId)

    if(track != null) {
        const youtubeVideoId = await getVideoByKeyWords(track.name);

        if(youtubeVideoId == null) {
            msg.channel.send(`\`[❌] No song was found\``);
            return;
        } else if (youtubeVideoId === 403) {
            msg.channel.send(`\`[❌] Youtube API reached it's quota for today, try again later\``);
            return;
        }

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

// leaving spotify playlist handler function here
// until there will be a way to handle spotify playlists
// without making so much network usage
async function handleSpotifyPlaylist(msg, search) {
    const spotifyPlaylistId = await getSpotifyPlaylistIdFromUrl(search);

    if(spotifyPlaylistId == null) {
        msg.channel.send(`\`[❌] No playlist was found\``);
        return;
    }

    const playlistName   = await getSpotifyPlaylistNameById(spotifyPlaylistId)
    const playlistTracks = await getSpotifyPlaylistTracksById(spotifyPlaylistId);

    for (let playlistTrack of playlistTracks) {
        const youtubeVideoId = await getVideoByKeyWords(playlistTrack.name);
        const youtubeVideoName = await getYoutubeVideoNameById(youtubeVideoId);
        addSongToQueue(youtubeVideoId, youtubeVideoName);
      }

    msg.channel.send(`\`[✔️] Added ${playlistName}\``);
}

async function handleYoutubeSearch(msg, search) {
    const youtubeVideoId = await getVideoByKeyWords(search);

    if(youtubeVideoId == null) {
        msg.channel.send(`\`[❌] No video was found\``);
        return;
    } else if (youtubeVideoId === 403) {
        msg.channel.send(`\`[❌] Youtube API reached it's quota for today, try again later\``);
        return;
    }

    const youtubeVideoName = await getYoutubeVideoNameById(youtubeVideoId);
    
    // play song or add it to queue
    if(!isSongsQueueEmpty()) {
        msg.channel.send(`\`[✔️] Added ${youtubeVideoName}\``);
    } else {
        msg.channel.send(`\`[🎶] Playing ${youtubeVideoName}\``);
    }

    addSongToQueue(youtubeVideoId, youtubeVideoName);
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

    // start playing queue in nothing is playing now
    const { isBotPlayingSongs } = getHelperVars();

    if(!isBotPlayingSongs && getSongsQueueLength() > 0) {
        console.log('[INFO] Started playing queue');
        setHelperVar('isBotPlayingSongs', true);
        await playQueue(msg);
    }
}

exports.play = _play;