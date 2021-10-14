const { MessageEmbed, MessageActionRow, MessageButton, ButtonInteraction }  = require('discord.js');
const CONFIG_FILE       = '../config.json';

const {
    DEV,
    MELODY_ICON,
    MELODY_ID,
    MELODY_DEV_ID,
    MELODY_TOKEN,
    MELODY_DEV_TOKEN,
    EMBED_MSG_COLOR_SCHEME
} = require(CONFIG_FILE);

const { 
    getSongsQueueLength,
    getSongsQueue,
    setHelperVar,
    getHelperVars,
    initSongsQueue,
    initHelperVars
} = require('./general');

const {
    getYoutubeVideoDataByUrl,
    youtubeVideoDurationFormatToSeconds,
    getYoutubePlayistDataByUrl,
    getYoutubeVideoDataById
} = require('./youtube');

async function sendQueueEmbededMsg(startIndex, originalMsg, editEmbed=false) {
    let embed = new MessageEmbed();
    let embedMsg = undefined;
    let songsQueue = getSongsQueue();
    let songsQueueLength = getSongsQueueLength();
    let collector = undefined;
    let pageHasOver10Songs = false;

    if(songsQueueLength - startIndex * 10 >= 10) pageHasOver10Songs = true;
    
    if(songsQueueLength > 0) {
        let queueString = '';
        counter = startIndex * 10 + 1;

        if(startIndex == 0) {
            counter++;
            if(pageHasOver10Songs) {
                songsQueue
                .slice(startIndex * 10 + 1, startIndex * 10 + 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n\n`); counter++});
            } else {
                songsQueue
                .slice(startIndex * 10 + 1, startIndex * 10 + songsQueueLength - startIndex * 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n\n`); counter++});
            }
        } else {
            if(pageHasOver10Songs) {
                songsQueue
                .slice(startIndex * 10, startIndex * 10 + 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n\n`); counter++});
            } else {
                songsQueue
                .slice(startIndex * 10, startIndex * 10 + songsQueueLength - startIndex * 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n\n`); counter++});
            }
        }

        embed = new MessageEmbed();

        if(startIndex == 0) {
            embed
            .setColor(EMBED_MSG_COLOR_SCHEME)
            .setTitle('Queue')
            .setThumbnail(MELODY_ICON)
            .addFields(
                { name: 'Now Playing', value: `**1. ${songsQueue[0].name}**`}
            )
        }

        // check if queue string is empty
        if (queueString.trim()) {
            embed
            .setThumbnail(MELODY_ICON)
            .addFields(
                { name: 'In Queue', value: queueString }
            )
        }

    } else {
        embed = new MessageEmbed()
        .setColor(EMBED_MSG_COLOR_SCHEME)
        .setTitle('Queue')
        .setThumbnail(MELODY_ICON)
        .addFields(
            { name: 'Songs', value: '\`No songs in queue\`' }
        )
    }

    let btnRow = new MessageActionRow();
    if(getSongsQueueLength() > 10) {
        if(startIndex != 0) {
            btnRow.addComponents(
                new MessageButton()
                .setCustomId('previousQueuePageBtn')
                .setLabel('Previous Page')
                .setEmoji('⬅️')
                .setStyle('PRIMARY'),
            )
        }

        if(pageHasOver10Songs) {
            btnRow.addComponents(
                new MessageButton()
                .setCustomId('nextQueuePageBtn')
                .setLabel('Next Page')
                .setEmoji('➡️')
                .setStyle('PRIMARY')
            );
        }
    }

    if(editEmbed) {
        let { embedMsg } = getHelperVars();

        try {
            await embedMsg.edit({ embeds: [embed], components: [btnRow] });
        } catch(error) { console.log(error) };

        collector = await embedMsg.channel.createMessageComponentCollector({
            max: 1,
            time: 5000
        });
    } else {
        if(pageHasOver10Songs) {
            embedMsg = await originalMsg.channel.send({ embeds: [embed], components: [btnRow]})
        } else {
            embedMsg = await originalMsg.channel.send({ embeds: [embed] });
        }
        
        setHelperVar('embedMsg',embedMsg);

        const { interactionCollector } = getHelperVars();
        if(interactionCollector != null && interactionCollector.constructor.name === 'InteractionCollector') {
            try {
                interactionCollector.stop();
            } catch(error) { console.log(error) };
        }

        collector = await embedMsg.channel.createMessageComponentCollector({
            max: 1,
            time: 5000
        });
    }
    
    collector.on("collect", async (button) => {
        try {
            await button.deferUpdate();
        } catch(error) { console.log(error) };
    });

    setHelperVar('interactionCollector', collector);
}

async function sendHelpEmbedMsg(originalMsg) {
    const helpString = `\
    **!p  / !play**                    - \`Play song/playlist\`
    **!s  / !stop**                    - \`Stop song\`
    **!rs / !resume**                  - \`Resumes song\`
    **!fs / !skip**                    - \`Skip song\`
    **!q  / !queue**                   - \`Show queue\`
    **!cl / !clear**                   - \`Clear queue\`
    **!st / !skipto <song_position>**  - \`Skip to song in queue\`
    **!fw / !forward <seconds>**       - \`Forward song\`
    **!rw / !rewind <seconds>**        - \`Rewind song\`
    **!sk / !seek <seconds>**          - \`Go to specific time in the song\`
    **!np / !nowplaying**              - \`Shows currently playing song\`
    **!lp / !loop**                    - \`Loops song\`
    **!pt / !playtop**                 - \`Moves the song to first position in queue\`
    **!h  / !help**                    - \`See this help\`
    `
    
    const embed = new MessageEmbed()
    .setColor(EMBED_MSG_COLOR_SCHEME)
    .setTitle('Help')
    .setThumbnail(MELODY_ICON)
    .addFields(
        { name: 'Commands', value: helpString}
    )

    originalMsg.channel.send({ embeds: [embed] });
}

async function isMsgFromDevServer(msg) {
    const { DEV_SERVER_ID } = require(CONFIG_FILE);

    if(msg.guild.id == DEV_SERVER_ID) {
        return true;
    }
    return false;
}

async function isBotAloneInVC(guildId) {
    const { client } = getHelperVars();
    const { DEV, MELODY_ID, MELODY_DEV_ID } = require(CONFIG_FILE);

    let botId = undefined;
    DEV ? botId = MELODY_DEV_ID : botId = MELODY_ID;

    const melody = client.guilds.cache.get(guildId).members.cache.get(botId);
    const channel = client.channels.cache.get(melody?.voice?.channel?.id);
    
    if(channel != null && channel.members.size == 1) {
        return true;
    }
    return false;
}

async function swapMelodyStatus(client) {
    const melodyStatuses = ['Developed by Zethus', '!help'];
    let index = 0;

    setInterval(() => {
        if(index === melodyStatuses.length) index = 0;
        const status = melodyStatuses[index];
        client.user.setActivity(status);
        index++;
    }, 30000);
}

async function setMelodyStatus(oldVoiceState, newVoiceState) {
    if(oldVoiceState.member.id == MELODY_ID && newVoiceState.member.id == MELODY_ID ||
        oldVoiceState.member.id == MELODY_DEV_ID && newVoiceState.member.id == MELODY_DEV_ID) {
        if(newVoiceState.channel) {
            setHelperVar('isBotDisconnected', false);
        } else if (oldVoiceState.channel) {
            setHelperVar('isBotDisconnected', true);
            initSongsQueue();
            initHelperVars();
        }
    }
}

function clientLogin(client) {
    if(DEV){
        setHelperVar('client',client);
        client.login(MELODY_DEV_TOKEN);
    } else {
        setHelperVar('client',client);
        client.login(MELODY_TOKEN);    
    }
}

async function queueButtonHandler(interaction) {
    if (!interaction.isButton()) return;

    let  { queueDisplayPageIndex } = getHelperVars();

    if(interaction.customId === 'previousQueuePageBtn') {
        if(queueDisplayPageIndex > 0) {
            await sendQueueEmbededMsg(--queueDisplayPageIndex, null, true);
            setHelperVar('queueDisplayPageIndex',queueDisplayPageIndex);
        }
    } else if(interaction.customId === 'nextQueuePageBtn') {
        if(queueDisplayPageIndex < Number(getSongsQueueLength()/10-1)) {
            await sendQueueEmbededMsg(++queueDisplayPageIndex, null, true);
            setHelperVar('queueDisplayPageIndex',queueDisplayPageIndex);
        }
    }
}

async function voiceStateUpdateHandler(oldVoiceState, newVoiceState) {
    if(oldVoiceState.member.id == MELODY_ID && newVoiceState.member.id == MELODY_ID ||
        oldVoiceState.member.id == MELODY_DEV_ID && newVoiceState.member.id == MELODY_DEV_ID) {
        if(newVoiceState.channel) {
            setHelperVar('isBotDisconnected', false);
        } else if (oldVoiceState.channel) {
            setHelperVar('isBotDisconnected', true);
            initSongsQueue();
            initHelperVars();
        }
    }
}

async function swapMelodyActivity(client) {
    const melodyStatuses = ['Developed by Zethus', '!help'];
    let index = 0;

    setInterval(() => {
        if(index === melodyStatuses.length) index = 0;
        const status = melodyStatuses[index];
        client.user.setActivity(status);
        index++;
    }, 30000);
}

async function clientLogin(client) {
    if(DEV){
        setHelperVar('client',client);
        client.login(MELODY_DEV_TOKEN);
    } else {
        setHelperVar('client',client);
        client.login(MELODY_TOKEN);    
    }
}

function getTimelineString(currentTime, totalTime) {
    const ratio = parseInt(currentTime / totalTime * 10);
    let string = "";

    for(let i = 1; i <= 10; i++) {
        if(i == ratio) {
            string = string.concat("#");
        } else {
            string = string.concat("▬");
        }
    }

    return string;
}

async function convertSecondsToDurationString(seconds, sendCurrentPosition=false) {
    const totalTimeString = new Date(seconds * 1000).toISOString().substr(11, 8);

    if(!sendCurrentPosition) {
        return `   ▬▬▬▬▬▬▬▬▬▬  ${totalTimeString}`
    }

    const { songCurrentPosition } = getHelperVars();
    const songCurrentPositionInSeconds = parseInt(songCurrentPosition);

    try {
        const currentTimeString = new Date(songCurrentPositionInSeconds * 1000).toISOString().substr(11, 8)
        const timelineString = getTimelineString(songCurrentPositionInSeconds, seconds);
        return `    ${timelineString}   ${currentTimeString}/${totalTimeString}`;
    } catch (error) { return null }
}

function getHighestResImage(thumbnails) {
    if(thumbnails.hasOwnProperty('maxres')) {
        return thumbnails.maxres.url;
    } else if(thumbnails.hasOwnProperty('standard')) {
        return thumbnails.standard.url;
    } else if(thumbnails.hasOwnProperty('high')) {
        return thumbnails.high.url;
    } else if(thumbnails.hasOwnProperty('medium')) {
        return thumbnails.medium.url;
    } else if(thumbnails.hasOwnProperty('default')) {
        return thumbnails.default.url;
    }
}

async function sendSongAddedEmbedMsg(msg, youtubeVideoUrl) {
    const youtubeVideoData = await getYoutubeVideoDataByUrl(youtubeVideoUrl)

    if(youtubeVideoData == null) return;

    const youtubeVideoTitle          = youtubeVideoData.snippet.title;
    const youtubeVideoChannelName    = youtubeVideoData.snippet.channelTitle;
    const youtubeVideoThumbnail      = getHighestResImage(youtubeVideoData.snippet.thumbnails);
    const youtubeVideoDurationString = await convertSecondsToDurationString(youtubeVideoDurationFormatToSeconds(youtubeVideoData.contentDetails.duration));

    if(youtubeVideoDurationString == null) { return }

    const status = getSongsQueueLength() == 0 ? 'Playing' : 'Added to queue';

    const embed = new MessageEmbed()
    .setColor(EMBED_MSG_COLOR_SCHEME)
    .setTitle(status + ' ' + youtubeVideoDurationString)
    .setThumbnail(youtubeVideoThumbnail)
    .addFields(
        { name: 'Title', value: youtubeVideoTitle }
    )
    .addFields(
        { name: 'Video', value: `[${youtubeVideoUrl}](${youtubeVideoUrl})`, inline: true }
    )
    .addFields(
        { name: 'Channel', value: youtubeVideoChannelName, inline: true }
    );

    msg.channel.send({ embeds: [embed] });
}

async function sendPlaylistAddedEmbedMsg(msg, youtubePlaylistUrl) {
    const youtubePlaylistData = await getYoutubePlayistDataByUrl(youtubePlaylistUrl)

    if(youtubePlaylistData == null) return;

    const youtubePlaylistTitle          = youtubePlaylistData.snippet.title;
    const youtubePlaylistChannelName    = youtubePlaylistData.snippet.channelTitle;
    const youtubePlaylistThumbnail      = getHighestResImage(youtubePlaylistData.snippet.thumbnails.high.url);
    const numberOfSongs                 = youtubePlaylistData.contentDetails.itemCount;

    const status = getSongsQueueLength() == 0 
                    ? `Playing ${numberOfSongs} songs`
                    : `Added ${numberOfSongs} songs to queue`;

    const embed = new MessageEmbed()
    .setColor(EMBED_MSG_COLOR_SCHEME)
    .setTitle(status)
    .setThumbnail(youtubePlaylistThumbnail)
    .addFields(
        { name: 'Title', value: youtubePlaylistTitle }
    )
    .addFields(
        { name: 'Playlist', value: `[${youtubePlaylistUrl}](${youtubePlaylistUrl})`, inline: true }
    )
    .addFields(
        { name: 'Channel', value: youtubePlaylistChannelName, inline: true }
    );

    msg.channel.send({ embeds: [embed] });
}

async function sendNowPlayingEmbedMsg(originalMsg) {
    const video = (getSongsQueue())[0];
    const youtubeVideoUrl               = `https://www.youtube.com/watch?v=${video.id}`;
    const youtubeVideoData              = await getYoutubeVideoDataById(video.id);
    const youtubeVideoTitle             = youtubeVideoData.snippet.title;
    const youtubeVideoChannelName       = youtubeVideoData.snippet.channelTitle;
    const youtubeVideoThumbnail         = getHighestResImage(youtubeVideoData.snippet.thumbnails);
    const youtubeVideoDurationString    = await convertSecondsToDurationString(youtubeVideoDurationFormatToSeconds(youtubeVideoData.contentDetails.duration), true);

    const embed = new MessageEmbed()
    .setColor(EMBED_MSG_COLOR_SCHEME)
    .setTitle(youtubeVideoTitle)
    .setThumbnail(youtubeVideoThumbnail)
    .addFields(
        { name: 'Status', value: youtubeVideoDurationString }
    )
    .addFields(
        { name: 'Video', value: `[${youtubeVideoUrl}](${youtubeVideoUrl})`, inline: true }
    )
    .addFields(
        { name: 'Channel', value: youtubeVideoChannelName, inline: true }
    );

    originalMsg.channel.send({ embeds: [embed] });
}

function userHasRole(msg, roleName) {
    return msg.member.roles.cache.some(role => role.name === roleName);
}

exports.sendQueueEmbededMsg         = sendQueueEmbededMsg;
exports.sendHelpEmbedMsg            = sendHelpEmbedMsg;
exports.sendNowPlayingEmbedMsg      = sendNowPlayingEmbedMsg;
exports.isMsgFromDevServer          = isMsgFromDevServer;
exports.isBotAloneInVC              = isBotAloneInVC;
exports.swapMelodyStatus            = swapMelodyStatus;
exports.setMelodyStatus             = setMelodyStatus;
exports.clientLogin                 = clientLogin;
exports.queueButtonHandler          = queueButtonHandler;
exports.voiceStateUpdateHandler     = voiceStateUpdateHandler;
exports.swapMelodyActivity          = swapMelodyActivity;
exports.sendSongAddedEmbedMsg       = sendSongAddedEmbedMsg;
exports.sendPlaylistAddedEmbedMsg   = sendPlaylistAddedEmbedMsg
exports.userHasRole                 = userHasRole;