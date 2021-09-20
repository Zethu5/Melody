const ytdl                 = require('ytdl-core');
const discordYtdl          = require('discord-ytdl-core');

const { 
    joinVoiceChannel,       
    createAudioPlayer,      
    createAudioResource
} = require('@discordjs/voice');

const {
    removePlayedSongFromQueue, 
    addSongToQueue,
    setHelperVar,
    getSongsQueueLength,
    getSongsQueue,
    getHelperVars
} = require('./general');

const {
    getYoutubePlaylistSongs,
    getVideoLengthInSeconds
} = require('./youtube');

let globalPlayer = null;
let globalConnection = null;

function getSongResource(youtubeVideoId, seek=null) {
    let stream = undefined;

    if(seek == null) {
        stream = ytdl(youtubeVideoId, {
            filter: 'audioonly',
            quality: 'lowestaudio',
        });
    } else {
        stream = discordYtdl(youtubeVideoId, {
            opusEncoded: true,
            seek: seek
        });
    }

    return createAudioResource(stream);
}

async function playSong(connection, player, youtubeVideoId, seek=null) {
    const resource = getSongResource(youtubeVideoId, seek);
    player.play(resource);
    connection.subscribe(player);

    if(seek == null) {
        setHelperVar('positionInSong',0);
    }
}

async function playQueue(msg) {
    // bot join vc
    const connection = joinVoiceChannel({
        channelId: msg.member.voice.channel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator
    });

    // build player
    const player = createAudioPlayer();
    globalPlayer = player;
    globalConnection = connection;
    await playSong(connection, player, getSongsQueue()[0].id)

    // play queue while it exists
    while(getSongsQueueLength() > 0) {
        // wait for song to finish to switch to another one
        if(player.state.status == 'idle') {
            removePlayedSongFromQueue()

            // check if there is another song in the queue to switch to
            if(getSongsQueueLength() > 0) {
                await playSong(connection, player, getSongsQueue()[0].id)
            }
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // disconnect and clean memory
    player.stop();
    connection.destroy();
    setHelperVar('isBotPlayingSongs', false);
}

async function addPlaylistToQueue(youtubePlaylistId) {
    const youtubePlaylistSongs = await getYoutubePlaylistSongs(youtubePlaylistId)
    
    youtubePlaylistSongs.forEach((video) => {
        addSongToQueue(video.snippet.resourceId.videoId,video.snippet.title)
    });
}

async function stopSong() {
    await globalPlayer.pause();
}

async function continueSong() {
    await globalPlayer.unpause();
}

async function skipSong() {
    await globalPlayer.stop();
}

async function getPlayingSongCurrentPosition() {
    return Number(globalPlayer.state.resource.playbackDuration/1000);
}

async function forwardPlayingSong(secondsToAdd) {
    const playingSongLengthInSeconds = await getVideoLengthInSeconds(getSongsQueue()[0].id);
    const playingSongCurrentPosition = await getPlayingSongCurrentPosition();
    const { positionInSong }         = await getHelperVars()

    if(positionInSong + playingSongCurrentPosition + secondsToAdd >= playingSongLengthInSeconds) {
        return false;
    }

    const timeAfterForwardInSeconds = Number(positionInSong + playingSongCurrentPosition + secondsToAdd);
    setHelperVar('positionInSong', timeAfterForwardInSeconds);
    await playSong(globalConnection,globalPlayer,getSongsQueue()[0].id,timeAfterForwardInSeconds);
    return true;
}

async function rewindPlayingSong(secondsToRewind) {
    const playingSongCurrentPosition = await getPlayingSongCurrentPosition();
    const { positionInSong }         = await getHelperVars()

    if(positionInSong + playingSongCurrentPosition - secondsToRewind < 0) {
        return false;
    }

    const timeAfterRewindInSeconds = positionInSong + playingSongCurrentPosition - secondsToRewind;
    setHelperVar('positionInSong', timeAfterRewindInSeconds);
    await playSong(globalConnection,globalPlayer,getSongsQueue()[0].id,timeAfterRewindInSeconds);
    return true;
}

async function goToTimeInPlayingSong(secondsToGoTo) {
    const playingSongLengthInSeconds = await getVideoLengthInSeconds(getSongsQueue()[0].id);

    if(secondsToGoTo > playingSongLengthInSeconds) {
        return false;
    }

    setHelperVar('positionInSong', secondsToGoTo);
    await playSong(globalConnection,globalPlayer,getSongsQueue()[0].id,secondsToGoTo);
    return true;
}


exports.getSongResource               = getSongResource;
exports.playSong                      = playSong;
exports.playQueue                     = playQueue;
exports.addPlaylistToQueue            = addPlaylistToQueue;
exports.stopSong                      = stopSong;
exports.continueSong                  = continueSong;
exports.skipSong                      = skipSong;
exports.getPlayingSongCurrentPosition = getPlayingSongCurrentPosition;
exports.forwardPlayingSong            = forwardPlayingSong;
exports.rewindPlayingSong             = rewindPlayingSong;
exports.goToTimeInPlayingSong         = goToTimeInPlayingSong;