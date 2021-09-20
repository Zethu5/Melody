const { SONGS_QUEUE_FILE } = require('./config.json')
const ytdl                 = require('ytdl-core');

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
    msIntoReadableTime
} = require('./general');

const {
    getYoutubePlaylistSongs,
    getVideoLengthInMS
} = require('./youtube');

let globalPlayer = null;
let globalConnection = null;

function getSongResource(youtubeVideoId, begin=null) {
    let stream = undefined;

    if(begin == null) {
        stream = ytdl(youtubeVideoId, {
            filter: 'audioonly',
            quality: 'lowestaudio',
        });
    } else {
        stream = ytdl(youtubeVideoId, {
            filter: 'audioonly',
            quality: 'lowestaudio',
            begin: begin
        });
    }

    return createAudioResource(stream);
}

async function playSong(connection, player, youtubeVideoId, begin=null) {
    const resource = getSongResource(youtubeVideoId, begin);
    player.play(resource);
    connection.subscribe(player);
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
    await playSong(connection, player, getSongsQueue()[0].id)
    globalPlayer = player;
    globalConnection = connection;

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
    return globalPlayer.state.resource.playbackDuration;
}

async function forwardPlayingSong(secondsToAdd) {
    const playingSongLengthInMs      = await getVideoLengthInMS(getSongsQueue()[0].id);
    const playingSongCurrentPosition = await getPlayingSongCurrentPosition();
    
    if(playingSongCurrentPosition + secondsToAdd * 1000 >= playingSongLengthInMs) {
        return false;
    }

    const timeAfterForwardInMs = playingSongCurrentPosition + secondsToAdd * 1000;
    const readableTime = msIntoReadableTime(timeAfterForwardInMs);
    console.log(readableTime);

    playSong(globalConnection, globalPlayer, getSongsQueue()[0].id, readableTime);
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