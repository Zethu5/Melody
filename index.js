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

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_VOICE_STATES] })

function getYoutubeVideoId(url) {
    return url.match(/watch\?v=.+?&/)[0].replace(/^watch\?v=/,'').replace(/\&$/,'')
}

async function getYoutubeVideoName(url) {
    const youtubeVideoId = getYoutubeVideoId(url)

    const youtubeResponse = await google.youtube('v3').videos.list({
        key: privateJsonData.YOUTUBE_TOKEN,
        part: 'snippet',
        id: youtubeVideoId
    })

    return youtubeResponse.data.items[0].snippet.title
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
        console.log(songsQueue)

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


const regexPlayCmd      = /^(\!p|\!play)\s((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
const regexStopCmd      = /^(\!s|\!stop)$/
const regexContinueCmd  = /^(\!c|\!continue)$/
const regexSkipCmd      = /^(\!fs|\!skip)$/
const regexQueueCmd      = /^(\!q|\!queue)$/


const songsQueue = []
const songsNamesQueue = []
let globalPlayer = null
let isBotPlayingSongs = false


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
        msg.channel.send(`Searching \`${youtubeUrl}\``)
        const youtubeVideoName = await getYoutubeVideoName(youtubeUrl)

        // video couldn't be reached or already exists in queue
        if(!youtubeVideoName) {
            msg.channel.send(`There was a problem playing \`${youtubeUrl}\``)
            return
        } else if(isSongExistsInQueue(youtubeUrl)) {
            msg.channel.send(`\`${youtubeVideoName}\` already exists in queue`)
            return
        }

        // play song or add it to queue
        if(songsQueue.length > 0) {
            msg.channel.send(`Added \`${youtubeVideoName}\` to queue`)
        } else {
            msg.channel.send(`Playing \`${youtubeVideoName}\``)
        }

        addSongToQueue(youtubeUrl, youtubeVideoName)

        // start playing queue in nothing is playing now
        if(!isBotPlayingSongs) {
            isBotPlayingSongs = true
            await playQueue(msg)
        }
    } else if(msgContent.match(regexStopCmd)) { //pause song
        msg.channel.send(`Paused \`${songsNamesQueue[0]}\``)
        await stopSong()
    } else if (msgContent.match(regexContinueCmd)) { //continue song
        msg.channel.send(`Continued \`${songsNamesQueue[0]}\``)
        await continueSong()
    } else if(msgContent.match(regexSkipCmd)) { //skip song
        msg.channel.send(`Skipped \`${songsNamesQueue[0]}\``)
        await skipSong()
    } else if(msgContent.match(regexQueueCmd)) {     
        let embed = new MessageEmbed()
        if(songsQueue.length > 0) {
            let songsString = ''
            songsNamesQueue.map(x => `${songsNamesQueue.indexOf(x) + 1}. ${x}`).forEach(x => songsString = songsString.concat(`\`${x}\`\n`))
            embed = new MessageEmbed()
            .setColor('#0099ff')
            .setTitle('Queue')
            .setThumbnail('https://cdn.discordapp.com/app-icons/887726494623866920/bc81047c78e10e582253ffbffd8980bc.png')
            .addFields(
                { name: 'Songs', value: songsString }
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

        msg.channel.send({ embeds: [embed] })
    }
});

client.login(privateJsonData.MELODY_TOKEN)