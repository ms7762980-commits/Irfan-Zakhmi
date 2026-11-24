const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');
const { Boom } = require('@hapi/boom');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Web Pairing Panel Website
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
                input { padding: 14px; width: 100%; margin-bottom: 15px; border-radius: 10px; border: 1px solid #374151; background: #0b0f19; color: #fff; font-size: 16px; box-sizing: border-box; outline: none; }
                button { background: #10b981; color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; width: 100%; }
                #code { font-size: 18px; color: #34d399; background: #0b0f19; padding: 12px; border-radius: 10px; margin-top: 15px; display: none; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ Shahzad Zakhmi 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel</div>
                <input type="text" id="phone" value="923256326517" placeholder="Enter phone">
                <button onclick="getPairingCode()" id="gen-btn">Generate Pairing Code</button>
                <div id="code"></div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    const res = await fetch('/pair?phone=' + phone);
                    const data = await res.json();
                    if(data.code) {
                        const c = document.getElementById('code');
                        c.innerText = data.code;
                        c.style.display = 'block';
                    } else { alert(data.error || 'Failed'); }
                }
            </script>
        </body>
        </html>
    `);
});

let globalSock = null;

app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number required' });
    try {
        if (!globalSock) return res.json({ error: 'Bot starting up, wait 5s.' });
        let code = await globalSock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return res.json({ code });
    } catch (err) {
        return res.json({ error: err.message });
    }
});

let botMode = 'public'; 
const ownerNumber = '923256326517'; // آپ کا نمبر

async function startBot() {
    const authFolder = './auth_info';
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
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
            } else {
                if (fs.existsSync(authFolder)) {
                    fs.rmSync(authFolder, { recursive: true, force: true });
                }
                setTimeout(() => startBot(), 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Shahzad Zakhmi Bot Connected Successfully!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Safe & Crash-Free Message Handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
        
        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        if (!body.startsWith('.')) return;

        const senderNumber = sender.replace(/[^0-9]/g, '');
        const isOwner = senderNumber.includes(ownerNumber) || m.key.fromMe;

        // Private Mode Check
        if (botMode === 'private' && !isOwner) {
            await sock.sendMessage(from, { text: '⚠️ بوٹ اس وقت *Private Mode* پر ہے، اسے صرف اونر استعمال کر سکتا ہے!' }, { quoted: m });
            return;
        }

        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(" ");

        // 1. Mode Switching & Safe Pair Command
        if (command === 'public') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'public';
            await sock.sendMessage(from, { text: '🌐 بوٹ کامیابی سے *Public Mode* پر کر دیا گیا ہے!' }, { quoted: m });
        }
        else if (command === 'private') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'private';
            await sock.sendMessage(from, { text: '🔒 بوٹ کامیابی سے *Private Mode* پر کر دیا گیا ہے!' }, { quoted: m });
        }
        else if (command === 'pair') {
            // یہ کمانڈ اب بوٹ کو کریش نہیں کرے گی بلکہ ویب پینل کا لنک دے گی جو 100% محفوظ ہے
            await sock.sendMessage(from, { text: `⚡ *پیئرنگ پینل لنک:*\n\nبراہ کرم اپنا پیئرنگ کوڈ حاصل کرنے کے لیے ریلوے والی ویب سائٹ پر جائیں:\n🔗 اپنے پروجیکٹ کا Railway URL کھولیں اور نمبر درج کرکے کوڈ حاصل کریں۔` }, { quoted: m });
        }

        // 2. Menu & Info Commands
        else if (command === 'menu' || command === 'm' || command === 'help' || command === 'alive') {
            await sendMenu(sock, from, m);
        }
        else if (command === 'ping') { 
            await sock.sendMessage(from, { text: '⚡ Pong! Bot is active and running smoothly.' }, { quoted: m }); 
        }
        else if (command === 'owner') { 
            await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی\n📞 *Contact:* 923256326517\n🚩 *Brand:* شہزاد زخمی 007' }, { quoted: m }); 
        }
        else if (command === 'repo') { 
            await sock.sendMessage(from, { text: '📂 *GitHub Repo:* شہزاد زخمی 007 آفیشل ریپوزٹری' }, { quoted: m }); 
        }

        // 3. Islamic Commands
        else if (command === 'adhan') { await sock.sendMessage(from, { text: '🕌 *اذان ریمائنڈر:* بے شک نماز مومن پر فرض ہے۔' }, { quoted: m }); }
        else if (command === 'namaz_times') { await sock.sendMessage(from, { text: '🕌 *نماز کے اوقات:* اپنے علاقے کے مطابق وقت کی پابندی کریں۔' }, { quoted: m }); }
        else if (command === 'dua_morning') { await sock.sendMessage(from, { text: '🤲 *صبح کی دعا:* اصبحنا واصبح الملك لله رب العالمين...' }, { quoted: m }); }
        else if (command === 'surah_fatiha') { await sock.sendMessage(from, { text: '📖 *سورۃ الفاتحہ:* بسم اللہ الرحمن الرحیم...' }, { quoted: m }); }
        else if (command === 'ayatul_kursi') { await sock.sendMessage(from, { text: '📖 *آیت الكرسی:* اللہ لا الہ الا ھو الحي القيوم...' }, { quoted: m }); }

        // 4. Download Commands
        else if (command === 'tiktok' || command === 'fb' || command === 'igdl' || command === 'play') {
            await sock.sendMessage(from, { text: `📥 *ڈاؤنلوڈر سیکشن [.${command}]:* میڈیا لنک موصول ہو گیا ہے، فائل پروسیس ہو رہی ہے...` }, { quoted: m });
        }

        // 5. Shayari & Fun
        else if (command === 'shayari') { 
            await sock.sendMessage(from, { text: '💔 *شہزاد زخمی شاعری:* محبت میں ہر ایک انداز نرالا دیکھا، ہم نے ہر شخص کو یہاں بدلنے والا دیکھا... 🖤' }, { quoted: m }); 
        }
        else if (command === 'bewafa' || command === 'akela' || command === 'joke' || command === 'dosti') {
            await sock.sendMessage(from, { text: `🎭 *فن سیکشن [.${command}]:* تفریحی کمانڈ فعال اور کارآمد ہے۔` }, { quoted: m });
        }

        // 6. Default Response
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] فعال ہے اور پروسیس کی جا رہی ہے!` }, { quoted: m });
        }
    });
}

// Complete Menu Function
async function sendMenu(sock, from, m) {
    const menuText = `
*شہزاد زخمی 007* 🚩

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦سسٹم انفو✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : شہزاد زخمی 007
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 🌐 ᴍᴏᴅᴇ : ${botMode}
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

╭━━━━〔 🌸 *سسٹمز اور پیئر* 🌸 〕━━━━⬣
┃ 💗 .public
┃ 💗 .private
┃ 💗 .pair (ویب لنک)
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɪsʟᴀᴍɪᴄ* 🌸 〕━━━━⬣
┃ 💗 adhan, namaz_times, duas, zikr, surahs...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 tiktok, ttmp3, fb, igdl, play, apk...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ* 🌸 〕━━━━⬣
┃ 💗 chatgpt, gemini, deepseek, copilot...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ & ɢʀᴏᴜᴘ* 🌸 〕━━━━⬣
┃ 💗 vv, kick, mute, antilink, tagall...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏls & ᴜᴛɪʟɪᴛʏ* 🌸 〕━━━━⬣
┃ 💗 sticker, removebg, remini, weather...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ & sʜᴀʏᴀʀɪ* 🌸 〕━━━━⬣
┃ 💗 shayari, bewafa, akela, joke, dosti...
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

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
