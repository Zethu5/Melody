const ytdl          = require('ytdl-core');
const discordYtdl   = require('discord-ytdl-core');

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
    getHelperVars,
    initHelperVars,
    initSongsQueue,
    clearQueue
} = require('./general');

const {
    getYoutubePlaylistSongs,
    getVideoLengthInSeconds
} = require('./youtube');

const { 
    isBotAloneInVC,
} = require('./discord');

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
    let botAloneInVcCounter = 0;

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
    console.log(`[INFO] Playing song: ${getSongsQueue()[0].name}`)

    // wait for 2 minutes after becoming idle, and then exit
    for(let i = 0; i < 40; i++) {
        // play queue while it exists
        while(getSongsQueueLength() > 0) {
            // wait for song to finish to switch to another one
            if(player.state.status == 'idle') {
                console.log(`[INFO] Player is idle`)
                const { isLoopingEnabled } = getHelperVars();
                !isLoopingEnabled ? removePlayedSongFromQueue() : console.log('[INFO] Looping is enabled');

                // check if there is another song in the queue to switch to
                if(getSongsQueueLength() > 0) {
                    await playSong(connection, player, getSongsQueue()[0].id)
                    console.log(`[INFO] Playing song: ${getSongsQueue()[0].name}`)
                }
            }

            await new Promise(resolve => setTimeout(resolve, 3000))
            const { isBotDisconnected } = getHelperVars();

            if (isBotDisconnected) {
                console.log(`[WARN] Bot disconnected`)
                initSongsQueue();
                initHelperVars();
            }

            // meaning 30 seconds have passed and bot was all alone
            if(botAloneInVcCounter == 10) {
                console.log(`[WARN] Bot was alone in vc for 30 seconds`)
                botAloneInVcCounter = 0;
                clearQueue('clear');
                await skipSong();
            }

            const isBotAlone = await isBotAloneInVC(msg.guild.id);
            isBotAlone ? botAloneInVcCounter++ : botAloneInVcCounter = 0;
        }

        await new Promise(resolve => setTimeout(resolve, 3000))

        if(getSongsQueueLength() > 0) {
            console.log(`[INFO] Returning to playing queue`)
            globalPlayer = player;
            globalConnection = connection;
            await playSong(connection, player, getSongsQueue()[0].id)
        } else {
            setHelperVar('isBotPlayingSongs', false);
        }
    }

    // disconnect and clean memory
    player.stop();
    if (connection.state.status != 'destroyed') connection.destroy();
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

async function resumeSong() {
    await globalPlayer.unpause();
}

async function skipSong() {
    await globalPlayer.stop();
}

async function skipToSong(index) {
    let songsQueue = getSongsQueue();
    let songId = songsQueue[index].id;

    while(songsQueue[0].id != songId) {
        removePlayedSongFromQueue();
        songsQueue = getSongsQueue();
    }

    await skipSong();
    setHelperVar('queueDisplayPageIndex',0);
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
    if(getSongsQueueLength() == 0) return false;
    const playingSongLengthInSeconds = await getVideoLengthInSeconds(getSongsQueue()[0].id);

    if(secondsToGoTo > playingSongLengthInSeconds) {
        return false;
    }

    setHelperVar('positionInSong', secondsToGoTo);
    await playSong(globalConnection,globalPlayer,getSongsQueue()[0].id,secondsToGoTo);
    return true;
}

async function loop(msg) {
    let { isLoopingEnabled } = getHelperVars();
    isLoopingEnabled = !isLoopingEnabled;
    setHelperVar('isLoopingEnabled', isLoopingEnabled);
}


exports.getSongResource               = getSongResource;
exports.playSong                      = playSong;
exports.playQueue                     = playQueue;
exports.addPlaylistToQueue            = addPlaylistToQueue;
exports.stopSong                      = stopSong;
exports.resumeSong                    = resumeSong;
exports.skipSong                      = skipSong;
exports.skipToSong                    = skipToSong;
exports.getPlayingSongCurrentPosition = getPlayingSongCurrentPosition;
exports.forwardPlayingSong            = forwardPlayingSong;
exports.rewindPlayingSong             = rewindPlayingSong;
exports.goToTimeInPlayingSong         = goToTimeInPlayingSong;
exports.loop                          = loop;