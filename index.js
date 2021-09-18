const fs                                = require('fs')
const { Client, Intents, MessageEmbed } = require('discord.js')
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource
}                                       = require('@discordjs/voice');
const { google }                        = require('googleapis')
const ytdl                              = require('ytdl-core');


const privateFile = 'private.json'
const privateRawData = fs.readFileSync(privateFile)
const privateJsonData = JSON.parse(privateRawData)

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_VOICE_STATES] })

function getYoutubeVideoId(url) {
    if(url.match(/watch\?v=.+?&/)) {
        return url.match(/watch\?v=.+?&/)[0].replace(/^watch\?v=/,'').replace(/\&$/,'')
    }
    return ''
}

function getYoutubePlaylistId(url) {
    if(url.match(/list\=.+?&/)) {
        return url.match(/list\=.+?&/)[0].replace(/^list\=/,'').replace(/\&$/,'')
    }
    return ''
}

async function getYoutubeVideoName(url) {
    const youtubeVideoId = getYoutubeVideoId(url)

    const youtubeResponse = await google.youtube('v3').videos.list({
        key: privateJsonData.YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    })

    if(youtubeResponse.data.items.length > 0) {
        return youtubeResponse.data.items[0].snippet.title
    }
    return null
}

async function addPlaylistToQueue(playlistId) {
    let nextPageToken = null;

    do {
        const videosResult = await google.youtube('v3').playlistItems.list({
            key: privateJsonData.YOUTUBE_TOKEN,
            maxResults: 50,
            pageToken: nextPageToken,
            part: ['snippet', 'status'],
            playlistId: playlistId
        })

        nextPageToken = videosResult.data.nextPageToken

        videosResult.data.items.forEach((video) => {
            addSongToQueue(`https://www.youtube.com/watch?v=${video.snippet.resourceId.videoId}&`,video.snippet.title)
        })
    } while(nextPageToken)
}

function getSongResource() {
    const stream = ytdl(songsQueue[0], {
        filter: 'audioonly',
        quality: 'lowestaudio'
    })
    
    return createAudioResource(stream)
}

async function playSong(connection, player) {
    const resource = getSongResource()
    player.play(resource)
    globalPlayer = player
    connection.subscribe(player)
}

function removePlayedSongFromQueue() {
    songsQueue.shift()
    songsNamesQueue.shift()
}

function addSongToQueue(youtubeUrl, youtubeVideoName) {
    songsQueue.push(getYoutubeVideoId(youtubeUrl))
    songsNamesQueue.push(youtubeVideoName)
}

function clearQueue() {
    songsQueue = []
    songsNamesQueue = []
}

async function playQueue(msg) {
    // bot join vc
    const connection = joinVoiceChannel({
        channelId: msg.member.voice.channel.id,
        guildId: msg.guild.id,
        adapterCreator: msg.guild.voiceAdapterCreator
    })

    // build player and play initial song
    const player = createAudioPlayer()
    await playSong(connection, player)

    // while there are songs in queue
    while(songsQueue.length > 0) {
        // wait for song to finish to switch to another one
        if(player.state.status == 'idle') {
            removePlayedSongFromQueue()

            // check if there is another song in the queue to switch to
            if(songsQueue.length > 0) {
                await playSong(connection, player)
            }
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // disconnect and clean memory
    player.stop()
    connection.destroy()
    isBotPlayingSongs = false
}

async function stopSong() {
    await globalPlayer.pause()
}

async function continueSong() {
    await globalPlayer.unpause()
}

async function skipSong() {
    await globalPlayer.stop()
}

function isSongExistsInQueue(url) {
    const youtubeVideoId = getYoutubeVideoId(url)

    if(songsQueue.includes(youtubeVideoId)) {
        return true
    }
    return false
}

async function sendQueueEmbededMsg(startIndex, originalMsg, editEmbed=false) {
    let embed = new MessageEmbed()

    if(songsQueue.length > 0) {
        let queueString = ''

        if(songsQueue.length - startIndex * 10 >= 10) {
            songsNamesQueue.slice(startIndex * 10, startIndex * 10 + 10)
            .map(x => queueString = queueString.concat(`**${songsNamesQueue.indexOf(x) + 1}.** \`${x}\`\n`))
        } else {
            songsNamesQueue.slice(startIndex * 10, startIndex * 10 + songsQueue.length - startIndex * 10)
            .map(x => queueString = queueString.concat(`**${songsNamesQueue.indexOf(x) + 1}.** \`${x}\`\n`))
        }

        embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Queue')
        .setThumbnail('https://cdn.discordapp.com/app-icons/887726494623866920/bc81047c78e10e582253ffbffd8980bc.png')
        .addFields(
            { name: 'Songs', value: queueString }
        )
        .setTimestamp()
    } else {
        embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle('Queue')
        .setThumbnail('https://cdn.discordapp.com/app-icons/887726494623866920/bc81047c78e10e582253ffbffd8980bc.png')
        .addFields(
            { name: 'Songs', value: '\`No songs in queue\`' }
        )
        .setTimestamp()
    }

    if(editEmbed) {
        await queueDisplayMsg.edit({ embeds: [embed] }).then(m => {
            reactionUserIds.forEach(userId => {
                m.reactions.resolve('⬅️').users.remove(userId);
                m.reactions.resolve('➡️').users.remove(userId);
            })
        })
    } else {
        await originalMsg.channel.send({ embeds: [embed] }).then(m => {
            m.react('⬅️')
            m.react('➡️')
            queueDisplayMsg = m
            reactionUserIds = []
        })
    }
}

async function skipToSong(index) {
    const songId = songsQueue[index]
    while(songsQueue[0] != songId) {
        removePlayedSongFromQueue()
    }

    queueDisplayPageIndex = 0
    await skipSong()
}


const regexPlayCmd      = /^(\!p|\!play)\s((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
const regexStopCmd      = /^(\!s|\!stop)$/
const regexContinueCmd  = /^(\!c|\!continue)$/
const regexSkipCmd      = /^(\!fs|\!skip)$/
const regexQueueCmd     = /^(\!q|\!queue)$/
const regexClearCmd     = /^(\!clear)$/
const regexSkipToCmd     = /^(\!st|\!skipto)\s\d+$/


const melodyId = '887726494623866920'
let songsQueue = []
let songsNamesQueue = []
let globalPlayer = null
let isBotPlayingSongs = false
let queueDisplayPageIndex = 0
let queueDisplayMsg = null
let reactionUserIds = []

client.once('ready', () => {
    console.log("Melody Online!")
});

client.on('messageCreate', async msg => {
    const msgContent = msg.content

    if(msgContent.match(regexPlayCmd)) {
        // check if user is connected to a voice channel
        if(!msg.member.voice.channel) {
            msg.channel.send(`\`You're not connected to a voice channel\``)
            return
        }

        // try to play the youtube video
        const youtubeUrl = msgContent.replace(/^(\!p|\!play)\s/,'')
        msg.channel.send(`\`Searching ${youtubeUrl}\``)

        // url was a youtube playlist and not a single song
        if(youtubeUrl.match(/\&list\=.+?&/)) {
            msg.channel.send(`\`Detected playlist\``)
            const youtubePlaylistId = getYoutubePlaylistId(youtubeUrl)
            await addPlaylistToQueue(youtubePlaylistId)
        } else {
            const youtubeVideoName = await getYoutubeVideoName(youtubeUrl)

            // video couldn't be reached or already exists in queue
            if(!youtubeVideoName) {
                msg.channel.send(`\`There was a problem playing ${youtubeUrl}\``)
                return
            } else if(isSongExistsInQueue(youtubeUrl)) {
                msg.channel.send(`\`${youtubeVideoName} already exists in queue`)
                return
            }

            // play song or add it to queue
            if(songsQueue.length > 0) {
                msg.channel.send(`\`Added ${youtubeVideoName} to queue\``)
            } else {
                msg.channel.send(`\`Playing ${youtubeVideoName}\``)
            }

            addSongToQueue(youtubeUrl, youtubeVideoName)
        }

        // start playing queue in nothing is playing now
        if(!isBotPlayingSongs) {
            isBotPlayingSongs = true
            await playQueue(msg)
        }
    } else if(msgContent.match(regexStopCmd)) { //pause song
        msg.channel.send(`\`Paused ${songsNamesQueue[0]}\``)
        await stopSong()
    } else if (msgContent.match(regexContinueCmd)) { //continue song
        msg.channel.send(`\`Continued ${songsNamesQueue[0]}\``)
        await continueSong()
    } else if(msgContent.match(regexSkipCmd)) { //skip song
        msg.channel.send(`\`Skipped ${songsNamesQueue[0]}\``)
        await skipSong()
    } else if(msgContent.match(regexQueueCmd)) {     
        queueDisplayPageIndex = 0
        sendQueueEmbededMsg(queueDisplayPageIndex,msg)
    } else if(msgContent.match(regexClearCmd)) {
        clearQueue()
        msg.channel.send(`\`Cleared queue\``)
    } else if(msgContent.match(regexSkipToCmd)) {
        const index = Number(msgContent.replace(/(\!st|\!skipto)\s/,''))

        if(songsQueue.length == 0) {
            msg.channel.send(`\`No songs in queue\``)
        } else if(songsQueue.length < index) {
            msg.channel.send(`\`Queue has fewer than ${index} songs - ${songsQueue.length}\``)
        } else {
            msg.channel.send(`\`Skipping to song #${index}\``)
            await skipToSong(index - 2)
        }
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    if (user.id != melodyId) {
        if(reaction.emoji.name == '⬅️') {
            if(queueDisplayPageIndex > 0) {
                queueDisplayPageIndex--
                sendQueueEmbededMsg(queueDisplayPageIndex, null, true)
            }
        } else if(reaction.emoji.name == '➡️') {
            if(queueDisplayPageIndex < Number(songsQueue.length/10-1)) {
                queueDisplayPageIndex++
                sendQueueEmbededMsg(queueDisplayPageIndex, null, true)
            }
        }

        reactionUserIds.push(user.id)
    }
});

client.login(privateJsonData.MELODY_TOKEN)