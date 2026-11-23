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

    // Pairing Code Logic
    if (!sock.authState.creds.registered) {
        const phoneNumber = "923256326517"; // آپ کا واٹس ایپ نمبر
        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(`\n========================================`);
            console.log(` YOUR PAIRING CODE IS: ${code}`);
            console.log(`========================================\n`);
        }, 3000);
    }

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
