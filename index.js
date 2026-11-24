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

// Modern & Clean Web Pairing Panel
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ur" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>شہزاد زخمی - Official Pairing Panel</title>
            <style>
                body { background-color: #05050a; color: #fff; font-family: sans-serif; text-align: center; padding: 30px; margin: 0; }
                .container { background: #121826; border: 1px solid #1f293d; padding: 35px 25px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 420px; box-sizing: border-box; }
                h2 { color: #34d399; margin-bottom: 5px; font-size: 24px; }
                .sub-title { color: #9ca3af; font-size: 14px; margin-bottom: 25px; }
                input { padding: 14px; width: 100%; margin: 10px 0; border-radius: 10px; border: 1px solid #374151; background: #0b0f19; color: #fff; font-size: 16px; text-align: center; box-sizing: border-box; outline: none; }
                button { background: #10b981; color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; width: 100%; font-size: 16px; margin-top: 10px; }
                #code { margin-top: 25px; font-size: 22px; color: #34d399; font-weight: bold; background: #0b0f19; padding: 15px; border-radius: 10px; border: 1px dashed #10b981; word-break: break-all; }
                .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ شہزاد زخمی 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel (Optimized)</div>
                <p style="font-size: 14px; color: #d1d5db;">اپنا واٹس ایپ نمبر کنٹری کوڈ کے ساتھ درج کریں:</p>
                <input type="text" id="phone" value="923256326517" placeholder="e.g. 923256326517">
                <button onclick="getPairingCode()">Generate Pairing Code</button>
                <div id="code"><span>کوڈ یہاں شو ہوگا</span></div>
                <div class="footer">Powered by شہزاد زخمی 007</div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('براہ کرم نمبر درج کریں!'); return; }
                    document.getElementById('code').innerHTML = 'کوڈ حاصل ہو رہا ہے...';
                    try {
                        const res = await fetch('/pair?phone=' + phone);
                        const data = await res.json();
                        if(data.code) {
                            document.getElementById('code').innerHTML = data.code;
                        } else {
                            document.getElementById('code').innerHTML = data.error || 'خرابی: دُوبارہ کوشش کریں';
                        }
                    } catch(e) {
                        document.getElementById('code').innerHTML = 'کنکشن کا مسئلہ!';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

let globalSock = null;

app.get('/pair', async (req, res) => {
    let phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required' });
    
    // Clean phone number (remove +, spaces, dashes)
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    try {
        if (!globalSock) {
            return res.json({ error: 'بوٹ شروع ہو رہا ہے، 5 سیکنڈ بعد کوشش کریں۔' });
        }
        if (globalSock.authState.creds.registered) {
            return res.json({ error: 'بوٹ پہلے سے کنیکٹ ہے!' });
        }
        
        let code = await globalSock.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return res.json({ code });
    } catch (err) {
        return res.json({ error: err.message || 'کوڈ جنरेट کرنے میں خرابی ہوئی۔' });
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
            console.log('✅ شہزاد زخمی Bot Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Optimized Menu & Command Handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
        
        const from = m.key.remoteJid;
        if (!body.startsWith('.')) return;

        // Auto Reaction
        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'menu' || command === 'm' || command === 'help') {
            const menuText = `
*شہزاد زخمی 007* 🚩

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦سسٹم انفو✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : شہزاد زخمی 007
│ 👤 ᴏᴡɴᴇْر : شہزاد زخمی (923256326517)
│ 📜 ᴄᴍᴅs   : ~500 (Optimized)
│ 🌐 ᴍᴏᴅᴇ : public
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

━━━〔 ✦ اسلامی مینو ✦ 〕━━━
│ • adhan
│ • namaz_times
│ • dua_morning
│ • dua_evening
│ • ayatul_kursi
│ • surah_yaseen
│ • surah_rahman
│ • surah_mulk
│ • darood_sharif
│ • kalima_tayyiba
│ • quran_reminder
─────────────

━━━〔 ✦ ڈاؤن لوڈ مینو ✦ 〕━━━
│ • play
│ • video
│ • tiktok
│ • facebook
│ • instagram
│ • mediafire
│ • pinterest
│ • naat
│ • tts
─────────────

━━━〔 ✦ اونر / VV مینو ✦ 〕━━━
│ • vv
│ • vv2
│ • vv3
│ • tochannel
│ • chjid
│ • fullpp
│ • status
│ • pair
│ • forward
─────────────

━━━〔 ✦ AI مینو ✦ 〕━━━
│ • chatgpt
│ • gemini
│ • deepseek
│ • copilot
│ • grok
│ • claude
│ • gpt4
─────────────

━━━〔 ✦ گروپس مینو ✦ 〕━━━
│ • antilink
│ • antidelete
│ • tagall
│ • kick
│ • mute
│ • promote
│ • demote
│ • hidetag
│ • poll
─────────────

━━━〔 ✦ ٹولز اور یوٹیلیٹی ✦ 〕━━━
│ • sticker
│ • testicker
│ • removebg
│ • remini
│ • upscale
│ • ping
│ • owner
│ • weather
│ • calculate
─────────────

━━━〔 ✦ فن اور شاعری ✦ 〕━━━
│ • character
│ • ringtone
│ • quote
│ • flirt
│ • joke
│ • shayari
│ • truth
│ • dare
│ • 8ball
─────────────

> *✨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ شہزاد زخمی 007 ✨*
            `;
            
            await sock.sendMessage(from, { 
                image: { url: "
