const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');
const { Boom } = require('@hapi/boom');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Modern & Clean English Web Pairing Panel with Copy Button
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shahzad Zakhmi - Official Pairing Panel</title>
            <style>
                body { background-color: #05050a; color: #fff; font-family: sans-serif; text-align: center; padding: 30px; margin: 0; }
                .container { background: #121826; border: 1px solid #1f293d; padding: 35px 25px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 420px; box-sizing: border-box; }
                h2 { color: #34d399; margin-bottom: 5px; font-size: 24px; }
                .sub-title { color: #9ca3af; font-size: 14px; margin-bottom: 25px; }
                .info-box { background: #1f293d; padding: 12px; border-radius: 10px; font-size: 12px; color: #d1d5db; margin-bottom: 20px; text-align: left; border-left: 4px solid #10b981; }
                label { display: block; text-align: left; font-size: 13px; color: #9ca3af; margin-bottom: 5px; }
                input { padding: 14px; width: 100%; margin-bottom: 15px; border-radius: 10px; border: 1px solid #374151; background: #0b0f19; color: #fff; font-size: 16px; box-sizing: border-box; outline: none; }
                button { background: #10b981; color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; width: 100%; font-size: 16px; transition: 0.2s; }
                button:hover { background: #059669; }
                #code-container { margin-top: 20px; display: none; }
                #code { font-size: 20px; color: #34d399; font-weight: bold; background: #0b0f19; padding: 14px; border-radius: 10px; border: 1px dashed #10b981; word-break: break-all; margin-bottom: 10px; letter-spacing: 2px; }
                .copy-btn { background: #3b82f6; margin-top: 5px; }
                .copy-btn:hover { background: #2563eb; }
                .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ Shahzad Zakhmi 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel (Optimized)</div>
                <div class="info-box">
                    <strong>Quick Setup:</strong> Enter your WhatsApp number with country code below to instantly generate your pairing code!
                </div>
                <label>WhatsApp Number</label>
                <input type="text" id="phone" value="923256326517" placeholder="e.g. 923256326517">
                <button onclick="getPairingCode()" id="gen-btn">Generate Pairing Code</button>
                <div id="code-container">
                    <div id="code"><span>-------</span></div>
                    <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
                </div>
                <div class="footer">Powered by Shahzad Zakhmi 007</div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('Please enter your WhatsApp number!'); return; }
                    const btn = document.getElementById('gen-btn');
                    btn.innerText = 'Generating Code...';
                    btn.disabled = true;
                    try {
                        const res = await fetch('/pair?phone=' + phone);
                        const data = await res.json();
                        if(data.code) {
                            document.getElementById('code').innerText = data.code;
                            document.getElementById('code-container').style.display = 'block';
                            btn.innerText = 'Generate Pairing Code';
                            btn.disabled = false;
                        } else {
                            alert(data.error || 'Failed to generate code. Try again.');
                            btn.innerText = 'Generate Pairing Code';
                            btn.disabled = false;
                        }
                    } catch(e) {
                        alert('Connection error! Please refresh and try again.');
                        btn.innerText = 'Generate Pairing Code';
                        btn.disabled = false;
                    }
                }
                function copyCode() {
                    const codeText = document.getElementById('code').innerText;
                    navigator.clipboard.writeText(codeText).then(() => {
                        alert('Pairing code copied to clipboard!');
                    });
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
        if (!globalSock) {
            return res.json({ error: 'Bot is still starting up. Please wait 5 seconds.' });
        }
        if (globalSock.authState.creds.registered) {
            return res.json({ error: 'Bot is already registered/connected!' });
        }

        let code = await globalSock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return res.json({ code });
    } catch (err) {
        return res.json({ error: err.message || 'Failed to generate pairing code.' });
    }
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome")
    });

    globalSock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Shahzad Zakhmi Bot Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Stricter Command Handler (صرف اصل کمانڈز پر چلے گا، فضول کمانڈز کو اگنور کرے گا)
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

        // فہرست تمام رجسٹرڈ کمانڈز کی
        const validCommands = [
            'menu', 'm', 'help', 'ping', 'owner', 'repo', 'pair',
            'adhan', 'namaz_times', 'dua_morning', 'dua_evening', 'surah_fatiha', 'ayatul_kursi', 'surah_yaseen',
            'tiktok', 'ttmp3', 'fb', 'igdl', 'play', 'apk',
            'chatgpt', 'gemini', 'deepseek', 'copilot',
            'antilink', 'kick', 'mute', 'tagall', 'vv',
            'sticker', 'removebg', 'remini', 'weather', 'wikipedia',
            'shayari', 'bewafa', 'akela', 'joke', 'dosti'
        ];

        // اگر کمانڈ لسٹ میں موجود نہ ہو تو بوٹ بالکل رسپانس نہیں دے گا (خاموش رہے گا)
        if (!validCommands.includes(command)) {
            return; 
        }

        // اگر درست کمانڈ ہو تو ری ایکٹ کرے گا
        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        if (command === 'menu' || command === 'm' || command === 'help') {
            const menuText = `
*شہزاد زخمی 007* 🚩

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦سسٹم انفو✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : شہزاد زخمی 007
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 🌐 ᴍᴏᴅᴇ : public
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

╭━━━━〔 🌸 *سسٹمز اور پیئر* 🌸 〕━━━━⬣
┃ 💗 .menu
┃ 💗 .ping
┃ 💗 .owner
┃ 💗 .pair
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɪsʟᴀᴍɪic* 🌸 〕━━━━⬣
┃ 💗 .adhan
┃ 💗 .namaz_times
┃ 💗 .dua_morning
┃ 💗 .dua_evening
┃ 💗 .surah_fatiha
┃ 💗 .ayatul_kursi
┃ 💗 .surah_yaseen
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 .tiktok
┃ 💗 .ttmp3
┃ 💗 .fb
┃ 💗 .igdl
┃ 💗 .play
┃ 💗 .apk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ* 🌸 〕━━━━⬣
┃ 💗 .chatgpt
┃ 💗 .gemini
┃ 💗 .deepseek
┃ 💗 .copilot
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ & ɢʀᴏᴜᴘ* 🌸 〕━━━━⬣
┃ 💗 .antilink
┃ 💗 .kick
┃ 💗 .mute
┃ 💗 .tagall
┃ 💗 .vv
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏls & ᴜᴛɪʟɪᴛʏ* 🌸 〕━━━━⬣
┃ 💗 .sticker
┃ 💗 .removebg
┃ 💗 .remini
┃ 💗 .weather
┃ 💗 .wikipedia
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ & sʜᴀʏᴀʀɪ* 🌸 〕━━━━⬣
┃ 💗 .shayari
┃ 💗 .bewafa
┃ 💗 .akela
┃ 💗 .joke
┃ 💗 .dosti
╰━━━━━━━━━━━━━━━━━━━━⬣

> *✨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ شہزاد زخمی 007 ✨*
            `;
            
            await sock.sendMessage(from, { 
                image: { url: "https://raw.githubusercontent.com/ms7762980-commits/Irfan-Zakhmi/refs/heads/main/IMG_20261117_205928.jpg" }, 
                caption: menuText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363431725172035@newsletter',
                        newsletterName: 'شہزاد زخمی Official Channel',
                        serverMessageId: 100
                    }
                }
            }, { quoted: m });
        } 
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ Pong! Bot is active and running smoothly.' }, { quoted: m });
        }
        else if (command === 'owner') {
            await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی\n📞 *Contact:* 923256326517\n🚩 *Brand:* شہزاد زخمی 007' }, { quoted: m });
        }
        else if (command === 'shayari') {
            await sock.sendMessage(from, { text: '💔 *شہزاد زخمی شاعری:* محبت میں ہر ایک انداز نرالا دیکھا... 🖤' }, { quoted: m });
        }
        else if (command === 'joke') {
            await sock.sendMessage(from, { text: '😂 *لطیفہ:* ہنسنا صحت کے لیے اچھا ہے۔' }, { quoted: m });
        }
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] فعال ہے!` }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
