const { MessageEmbed }  = require('discord.js');
const { MELODY_ICON }   = require("./config.json");
const { getSongsQueueLength, getSongsQueue, setHelperVar, getHelperVars } = require('./general');


async function clearQueueEmbedUsersReactions(embedMsg) {
    const { queueEmbedReactionUsersIds } = getHelperVars();
    queueEmbedReactionUsersIds.forEach(userId => {
        if(embedMsg.reactions.resolve('⬅️') != null) {
            embedMsg.reactions.resolve('⬅️').users.remove(userId);
        }
        if(embedMsg.reactions.resolve('➡️') != null) {
            embedMsg.reactions.resolve('➡️').users.remove(userId);
        }
    });
}

async function sendQueueEmbededMsg(startIndex, originalMsg, editEmbed=false) {
    let embed = new MessageEmbed();
    let songsQueue = getSongsQueue();
    let songsQueueLength = getSongsQueueLength();

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

    if(editEmbed) {
        let { embedMsg } = getHelperVars();
        await embedMsg.edit({ embeds: [embed] }).then(editedEmbedMsg => {
            clearQueueEmbedUsersReactions(editedEmbedMsg);
        });
    } else {
        const embedMsg = await originalMsg.channel.send({ embeds: [embed] }).then(embedMsg => {
            if(getSongsQueueLength() > 10) {
                embedMsg.react('⬅️');
                embedMsg.react('➡️');
            }
            return embedMsg;
        });

        setHelperVar('embedMsg',embedMsg);
    }
}

async function sendHelpEmbedMsg(originalMsg) {
    const helpString = `\
    **!p  / !play**                    - \`Play video/playlist\`
    **!s  / !stop**                    - \`Stop video\`
    **!cn / !continue**                - \`Continue video\`
    **!fs / !skip**                    - \`Skip video\`
    **!q  / !queue**                   - \`Show queue\`
    **!cl / !clear**                   - \`Clear queue\`
    **!st / !skipto <song_position>**  - \`Skip to song in queue\`
    **!fw / !forward <seconds>**       - \`Forward song\`
    **!rw / !rewind <seconds>**        - \`Rewind song\`
    **!sk / !seek <seconds>**          - \`Go to specific time in the song\`
    **!np / !nowplaying**              - \`Shows currently playing song\`
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
        { name: 'Song', value: song.name}
    )
    .addFields(
        { name: 'Link', value: `[https://www.youtube.com/watch?v=${song.id}](https://www.youtube.com/watch?v=${song.id})`}
    )

    originalMsg.channel.send({ embeds: [embed] });
}

async function isMsgFromDevServer(msg) {
    const { DEV_SERVER_ID } =  require('./config.json');

    if(msg.guild.id == DEV_SERVER_ID) {
        return true;
    }
    return false;
}

exports.sendQueueEmbededMsg = sendQueueEmbededMsg;
exports.sendHelpEmbedMsg    = sendHelpEmbedMsg;
exports.getNowPlaying       = getNowPlaying;
exports.isMsgFromDevServer  = isMsgFromDevServer;