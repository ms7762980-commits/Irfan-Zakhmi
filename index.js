const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');
const { Boom } = require('@hapi/boom');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Web Pairing Interface & Home Route
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>شہزاد زخمی & AHMAD MD - Pairing Panel</title>
            <style>
                body { background-color: #0b0f19; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .container { background: #1f293d; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.5); width: 100%; max-width: 400px; }
                input { padding: 12px; width: 85%; margin: 10px 0; border-radius: 6px; border: 1px solid #374151; background: #111827; color: #fff; font-size: 16px; }
                button { background: #10b981; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer; font-weight: bold; width: 90%; font-size: 16px; }
                button:hover { background: #059669; }
                #code { margin-top: 20px; font-size: 22px; color: #34d399; font-weight: bold; word-break: break-all; }
                .status { color: #60a5fa; margin-bottom: 15px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>ש شہزاد زخمی Bot Panel</h2>
                <div class="status">Bot is Running Successfully!</div>
                <p>Enter your WhatsApp number with country code:</p>
                <input type="text" id="phone" placeholder="e.g. 923256326517">
                <br>
                <button onclick="getPairingCode()">Generate Pairing Code</button>
                <div id="code"></div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('Please enter phone number'); return; }
                    document.getElementById('code').innerText = 'Generating code...';
                    try {
                        const res = await fetch('/pair?phone=' + phone);
                        const data = await res.json();
                        if(data.code) {
                            document.getElementById('code').innerText = 'Your Code: ' + data.code;
                        } else {
                            document.getElementById('code').innerText = 'Error: ' + (data.error || 'Try again');
                        }
                    } catch(e) {
                        document.getElementById('code').innerText = 'Connection Error!';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

let globalSock = null;

app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required' });
    
    try {
        if (globalSock && !globalSock.authState.creds.registered) {
            let code = await globalSock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            return res.json({ code });
        } else {
            return res.json({ error: 'Bot is already connected or starting up. Refresh and try again.' });
        }
    } catch (err) {
        return res.json({ error: err.message });
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: true
    });

    globalSock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                startBot();
            } else {
                console.log('Client logged out. Clear auth_info to rescan.');
            }
        } else if (connection === 'open') {
            console.log('✅ شہزاد زخمی & AHMAD MD Bot Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Command Handler & Full Menu
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
        
        const from = m.key.remoteJid;
        if (!body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'menu' || command === 'help') {
            const menuText = `
𝘼𝙃𝙈𝘼𝘿 𝙈𝘿 🚩 & *شہزاد زخمی 007*

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦sʏsᴛᴇᴍ ɪɴғᴏ✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : 𝘼𝙃𝙈𝘼𝘿 𝙈𝘿 / 𝖲𝖧𝖠𝖧𝖹𝖠𝖣 𝖹𝖠𝖪𝖧𝖬𝖨
│ 👤 ᴏᴡɴᴇʀ : 923256326517
│ 🌐 ᴍᴏᴅᴇ : public
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────
📌 *Core & Sticker Commands:*
• \`.menu\` - تمام مینو دیکھیں
• \`.ping\` - بوٹ اسپیڈ چیک کریں
• \`.sticker\` / \`.testicker\` - تصویر کو اسٹیکر بنائیں (تصویر کے ساتھ بھیجیں)
• \`.pair [number]\` - ویب پیئرنگ کوڈ حاصل کریں
• \`.owner\` - اونر کی معلومات
─────────────
> *✨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ شہزاد زخمی & AHMAD MD ✨*
            `;
            await sock.sendMessage(from, { text: menuText }, { quoted: m });
        } 
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: 'pong! ⚡ Bot is active.' }, { quoted: m });
        }
        else if (command === 'owner') {
            await sock.sendMessage(from, { text: 'Bot Owner: شہزاد زخمی (923256326517)' }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    startBot();
});
