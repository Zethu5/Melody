const { MessageEmbed }  = require('discord.js');
const { MELODY_ICON }   = require("./config.json");
const { getSongsQueueLength, getSongsQueue, setHelperVar, getHelperVars } = require('./general');
const { MELODY_ID } = require('./config.json');


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
    let lastPage = false;

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
                lastPage = true;
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
                lastPage = true;
            }
        }


        embed = new MessageEmbed();

        if(startIndex == 0) {
            embed.addFields(
                { name: 'Now Playing', value: `**1.** \`${songsQueue[0].name}\``}
            );
        }

        embed
        .setColor('#0099ff')
        .setTitle('Queue')
        .setThumbnail(MELODY_ICON)
        .addFields(
            { name: 'In Queue', value: queueString }
        )
        .setTimestamp();
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

exports.sendQueueEmbededMsg = sendQueueEmbededMsg;