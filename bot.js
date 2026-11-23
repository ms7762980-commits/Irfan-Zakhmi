/**
 * Clean & Fixed WhatsApp Bot Code
 * Owner: شہزاد زخمی (923256326517)
 */

const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get('/', (req, res) => {
    res.send('<h2>Shahzad Zakhmi Bot is Running Successfully!</h2>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

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
            console.log('Bot is online and connected!');
        } else if (connection === 'close') {
            setTimeout(startBot, 5000);
        }
    });

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            
            const messageType = Object.keys(mek.message)[0];
            const body = (messageType === 'conversation') ? mek.message.conversation :
                         (messageType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';
            
            const from = mek.key.remoteJid;
            
            if (!body.startsWith(".")) return;

            // آٹو ری ایکشن
            await sock.sendMessage(from, { react: { text: "🔥", key: mek.key } });

            const args = body.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === 'menu' || command === 'm') {
                let menuText = ` ━━━〔 ✦ ɪsʟᴀᴍɪᴄ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  adhan\n│  •  namaz_times\n` +
                               ` ━━━〔 ✦ ᴍᴀɪɴ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  menu\n│  •  ping\n` +
                               `─────────────────\n` +
                               `Follow Channel:\nhttps://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z`;

                await sock.sendMessage(from, { 
                    image: { url: "https://share.google/images/FOCxlHWy1akjsZxd8" }, 
                    caption: menuText 
                }, { quoted: mek });
            }
            else if (command === 'ping') {
                await sock.sendMessage(from, { text: `⚡ Pong! Bot is active.` }, { quoted: mek });
            }
        } catch (err) {
            console.log(err);
        }
    });
}

startBot();
