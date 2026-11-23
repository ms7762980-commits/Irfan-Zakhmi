/**
 * Bot Core File
 * Owner & Creator: شہزاد زخمی (923256326517)
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('Bot is online and connected as شہزاد زخمی!');
        } else if (connection === 'close') {
            console.log('Connection closed. Reconnecting...');
            startBot();
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
        } catch (err) {
            console.log(err);
        }
    });
}

startBot();
