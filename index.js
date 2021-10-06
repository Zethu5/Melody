

const { Client, Intents } = require('discord.js');

const client = new Client({ intents: [
        Intents.FLAGS.GUILDS, 
        Intents.FLAGS.GUILD_MESSAGES, 
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS, 
        Intents.FLAGS.GUILD_PRESENCES, 
        Intents.FLAGS.GUILD_VOICE_STATES
]});

const {
    commandsHandler
} = require('./commands/commandsHandler');

const {
    DEV
} = require('./config.json');

const {
    voiceStateUpdateHandler,
    swapMelodyActivity,
    clientLogin
} = require('./functions/discord');

const {
    initSongsQueue,
    initHelperVars,
} = require('./functions/general')

const {
    queueButtonHandler,
    isMsgFromDevServer
} = require('./functions/discord')

client.once('ready', async () => {
    initSongsQueue();
    initHelperVars();
    await swapMelodyActivity(client);
    DEV ? console.log("Melody DEV Online!"): console.log("Melody Online!");
});

client.on('messageCreate', async msg => {
    // check if in development or not
    if(DEV) {
        const result = await isMsgFromDevServer(msg);
        if(!result) {
            return;
        }
    }

    await(commandsHandler(msg));
});

client.on('voiceStateUpdate', async (oldVoiceState, newVoiceState) => {
    await voiceStateUpdateHandler(oldVoiceState, newVoiceState);
});

client.on('interactionCreate', async (interaction) => {
    await queueButtonHandler(interaction);
});

clientLogin(client);