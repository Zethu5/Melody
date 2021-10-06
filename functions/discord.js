const { MessageEmbed, MessageActionRow, MessageButton, ButtonInteraction }  = require('discord.js');
const CONFIG_FILE       = '../config.json';

const {
    DEV,
    MELODY_ICON,
    MELODY_ID,
    MELODY_DEV_ID,
    MELODY_TOKEN,
    MELODY_DEV_TOKEN
} = require(CONFIG_FILE);

const { 
    getSongsQueueLength,
    getSongsQueue,
    setHelperVar,
    getHelperVars,
    initSongsQueue,
    initHelperVars
} = require('./general');

async function sendQueueEmbededMsg(startIndex, originalMsg, editEmbed=false) {
    let embed = new MessageEmbed();
    let songsQueue = getSongsQueue();
    let songsQueueLength = getSongsQueueLength();
    let collector = undefined;
    
    if(songsQueueLength > 0) {
        let queueString = '';
        counter = startIndex * 10 + 1;

        if(startIndex == 0) {
            counter++;
            if(songsQueueLength - startIndex * 10 >= 10) {
                songsQueue
                .slice(startIndex * 10 + 1, startIndex * 10 + 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n`); counter++});
            } else {
                songsQueue
                .slice(startIndex * 10 + 1, startIndex * 10 + songsQueueLength - startIndex * 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n`); counter++});
            }
        } else {
            if(songsQueueLength - startIndex * 10 >= 10) {
                songsQueue
                .slice(startIndex * 10, startIndex * 10 + 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n`); counter++});
            } else {
                songsQueue
                .slice(startIndex * 10, startIndex * 10 + songsQueueLength - startIndex * 10)
                .forEach(x => {queueString = queueString.concat(`**${counter}.** \`${x.name}\`\n`); counter++});
            }
        }

        embed = new MessageEmbed();

        if(startIndex == 0) {
            embed
            .setColor('#0099ff')
            .setTitle('Queue')
            .setThumbnail(MELODY_ICON)
            .addFields(
                { name: 'Now Playing', value: `**1.** \`${songsQueue[0].name}\``}
            )
            .setTimestamp();
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
        .setColor('#0099ff')
        .setTitle('Queue')
        .setThumbnail(MELODY_ICON)
        .addFields(
            { name: 'Songs', value: '\`No songs in queue\`' }
        )
        .setTimestamp();
    }

    const btnRow = new MessageActionRow()
    .addComponents(
        new MessageButton()
            .setCustomId('previousQueuePageBtn')
            .setLabel('Previous Page')
            .setEmoji('⬅️')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('nextQueuePageBtn')
            .setLabel('Next Page')
            .setEmoji('➡️')
            .setStyle('PRIMARY')
    );
    
    if(editEmbed) {
        let { embedMsg } = getHelperVars();
        await embedMsg.edit({ embeds: [embed]});

        collector = await embedMsg.channel.createMessageComponentCollector({
            max: 1,
            time: 15000
        });
    } else {
        embedMsg = await originalMsg.channel.send({ embeds: [embed], components: [btnRow]})
        setHelperVar('embedMsg',embedMsg);

        const { interactionCollector, isInteractionCollectorInitiated } = getHelperVars();
        if(isInteractionCollectorInitiated) {
            try {
                interactionCollector.stop();
            } catch(error) {}
        }
    }

    collector = await embedMsg.channel.createMessageComponentCollector({
        max: 1,
        time: 15000
    });
    
    collector.on("collect", async (button) => {
        await button.deferUpdate();
    });

    setHelperVar('isInteractionCollectorInitiated', true);
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
    **!h  / !help**                    - \`See this help\`
    `
    
    const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Help')
    .setThumbnail(MELODY_ICON)
    .addFields(
        { name: 'Commands', value: helpString}
    )

    originalMsg.channel.send({ embeds: [embed] });
}

async function getNowPlaying(originalMsg) {
    const song = (await getSongsQueue())[0];

    const embed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle('Now Playing')
    .setThumbnail(MELODY_ICON)
    .addFields(
        { name: 'Song', value: `\`${song.name}\``}
    )
    .addFields(
        { name: 'Link', value: `[https://www.youtube.com/watch?v=${song.id}](https://www.youtube.com/watch?v=${song.id})`}
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
    }, 5000);
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
    }, 5000);
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

exports.sendQueueEmbededMsg     = sendQueueEmbededMsg;
exports.sendHelpEmbedMsg        = sendHelpEmbedMsg;
exports.getNowPlaying           = getNowPlaying;
exports.isMsgFromDevServer      = isMsgFromDevServer;
exports.isBotAloneInVC          = isBotAloneInVC;
exports.swapMelodyStatus        = swapMelodyStatus;
exports.setMelodyStatus         = setMelodyStatus;
exports.clientLogin             = clientLogin;
exports.queueButtonHandler      = queueButtonHandler;
exports.voiceStateUpdateHandler = voiceStateUpdateHandler;
exports.swapMelodyActivity      = swapMelodyActivity;
