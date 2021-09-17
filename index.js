const fs                       = require('fs')
const { Client, Intents }      = require('discord.js')
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource
}                              = require('@discordjs/voice');
const { google }               = require('googleapis')
const ytdl                     = require('ytdl-core');
const { url }                  = require('inspector');
const { SSL_OP_EPHEMERAL_RSA } = require('constants');


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

const regexPlayCmd      = /^(\!p|\!play)\s((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
const regexStopCmd      = /^(\!s|\!stop)$/
const regexContinueCmd  = /^(\!c|\!continue)$/
const regexSkipCmd      = /^(\!fs|\!skip)$/

const songsQueue = []
const songsNamesQueue = []
let globalPlayer = null

let isBotPlayingSongs = false


client.once('ready', () => {
    console.log("Melody Online!")
});

client.on('messageCreate', async msg => {
    const msgContent = msg.content
    const guild = client.guilds.cache.get(msg.guild.id)
    const user = guild.members.cache.get(msg.member.id)
    
    if(msgContent.match(regexPlayCmd)) {
        // check if user is connected to a voice channel
        if(msg.member.voice.channel) {
            // try to play the youtube video
            const youtubeUrl = msgContent.replace(/^(\!p|\!play)\s/,'')
            msg.channel.send(`Searching \`${youtubeUrl}\``)
            const youtubeVideoName = await getYoutubeVideoName(youtubeUrl)

            if(!youtubeVideoName) {
                msg.channel.send(`There was a problem playing \`${youtubeUrl}\``)
            } else {
                if(songsQueue.length > 0) {
                    msg.channel.send(`Added \`${youtubeVideoName}\` to queue`)
                } else {
                    msg.channel.send(`Playing \`${youtubeVideoName}\``)
                }
                songsQueue.push(getYoutubeVideoId(youtubeUrl))
                songsNamesQueue.push(youtubeVideoName)

                if(!isBotPlayingSongs) {
                    isBotPlayingSongs = true
                    await playQueue(msg)
                }
            }
        } else {
            msg.channel.send(`\`You're not connected to a voice channel\``)
        }

    } else if(msgContent.match(regexStopCmd)) {
        msg.channel.send(`Paused \`${songsNamesQueue[0]}\``)
        await stopSong()
    } else if (msgContent.match(regexContinueCmd)) {
        msg.channel.send(`Continued \`${songsNamesQueue[0]}\``)
        await continueSong()
    } else if(msgContent.match(regexSkipCmd)) {
        msg.channel.send(`Skipped \`${songsNamesQueue[0]}\``)
        await skipSong()
    }
});

client.login(privateJsonData.MELODY_TOKEN)