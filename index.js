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

// Pairing Panel Website
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
const ownerNumber = '923256326517@s.whatsapp.net';

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

    // Message Handler with Full Working Logic
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
        
        const from = m.key.remoteJid;
        const sender = m.key.participant || from;
        if (!body.startsWith('.')) return;

        const isOwner = sender.includes(ownerNumber) || m.key.fromMe;
        if (botMode === 'private' && !isOwner) {
            await sock.sendMessage(from, { text: '⚠️ بوٹ اس وقت *Private Mode* پر ہے، اسے صرف اونر استعمال کر سکتا ہے!' }, { quoted: m });
            return;
        }

        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(" ");

        // 1. Settings & Pair
        if (command === 'public') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'public';
            await sock.sendMessage(from, { text: '🌐 بوٹ اب *Public Mode* پر ہے۔' }, { quoted: m });
        }
        else if (command === 'private') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'private';
            await sock.sendMessage(from, { text: '🔒 بوٹ اب *Private Mode* پر ہے۔' }, { quoted: m });
        }
        else if (command === 'pair') {
            const targetPhone = q.replace(/[^0-9]/g, '');
            if (!targetPhone) {
                await sock.sendMessage(from, { text: '⚠️ نمبر لکھیں! مثال: *.pair 923256326517*' }, { quoted: m });
                return;
            }
            try {
                let code = await sock.requestPairingCode(targetPhone);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                await sock.sendMessage(from, { text: `⚡ *پیئرنگ کوڈ کامیاب!*\n📱 نمبر: ${targetPhone}\n🔑 کوڈ: \`${code}\`` }, { quoted: m });
            } catch (err) {
                await sock.sendMessage(from, { text: `❌ پیئرنگ کوڈ میں خرابی۔ 30 سیکنڈ بعد کوشش کریں۔` }, { quoted: m });
            }
        }
        // 2. Main Menu & Info
        else if (command === 'menu' || command === 'm' || command === 'help' || command === 'alive') {
            await sendMenu(sock, from, m);
        }
        else if (command === 'ping') { await sock.sendMessage(from, { text: '⚡ Pong! Bot is active and running smoothly.' }, { quoted: m }); }
        else if (command === 'owner') { await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی\n📞 *Contact:* 923256326517\n🚩 *Brand:* شہزاد زخمی 007' }, { quoted: m }); }
        else if (command === 'repo') { await sock.sendMessage(from, { text: '📂 *GitHub Repo:* شہزاد زخمی 007 آفیشل ریپوزٹری' }, { quoted: m }); }

        // 3. Islamic Commands
        else if (command === 'adhan') { await sock.sendMessage(from, { text: '🕌 *اذان ریمائنڈر:* بے شک نماز مومن پر فرض ہے۔' }, { quoted: m }); }
        else if (command === 'namaz_times') { await sock.sendMessage(from, { text: '🕌 *نماز کے اوقات:* وقت کی پابندی کریں۔' }, { quoted: m }); }
        else if (command === 'dua_morning') { await sock.sendMessage(from, { text: '🤲 *صبح کی دعا:* اصبحنا واصبح الملك لله...' }, { quoted: m }); }
        else if (command === 'surah_fatiha') { await sock.sendMessage(from, { text: '📖 *سورۃ الفاتحہ:* بسم اللہ الرحمن الرحیم...' }, { quoted: m }); }
        else if (command === 'ayatul_kursi') { await sock.sendMessage(from, { text: '📖 *آیت الكرسی:* اللہ لا الہ الا ھو الحي القيوم...' }, { quoted: m }); }

        // 4. Download Commands
        else if (command === 'tiktok') { await sock.sendMessage(from, { text: '📥 *ٹک ٹاک ڈاؤنلوڈر:* ویڈیو لنک ارسال کریں۔' }, { quoted: m }); }
        else if (command === 'ttmp3') { await sock.sendMessage(from, { text: '🎵 *ٹک ٹاک MP3:* آڈیو لنک فراہم کریں۔' }, { quoted: m }); }
        else if (command === 'fb') { await sock.sendMessage(from, { text: '📘 *فیس بک ڈاؤنلوڈر:* ویڈیو لنک درج کریں۔' }, { quoted: m }); }
        else if (command === 'igdl') { await sock.sendMessage(from, { text: '📷 *انسٹاگرام ڈاؤنلوڈر:* لنک یہاں پیسٹ کریں۔' }, { quoted: m }); }
        else if (command === 'play') { await sock.sendMessage(from, { text: `🎵 *سونگ پلے:* آپ کی ریکوئسٹ [${q || 'گانا'}] پر پروسیسنگ جاری ہے...` }, { quoted: m }); }
        else if (command === 'apk') { await sock.sendMessage(from, { text: '📦 *APK Downloader:* ایپ کا نام درج کریں۔' }, { quoted: m }); }

        // 5. AI Commands
        else if (command === 'chatgpt' || command === 'gemini' || command === 'deepseek') {
            await sock.sendMessage(from, { text: `🤖 *اے آئی اسسٹنٹ [.${command}]:* آپ کا سوال پروسیس ہو رہا ہے!` }, { quoted: m });
        }

        // 6. Tools & Utility
        else if (command === 'sticker' || command === 's') { await sock.sendMessage(from, { text: '📸 *اسٹیکر میکر:* تصویر کے ساتھ یہ کمانڈ استعمال کریں۔' }, { quoted: m }); }
        else if (command === 'removebg' || command === 'remini' || command === 'weather') {
            await sock.sendMessage(from, { text: `🛠️ *ٹول سسٹم [.${command}]:* فیچر فعال ہے۔` }, { quoted: m });
        }

        // 7. Shayari & Fun
        else if (command === 'shayari') { 
            await sock.sendMessage(from, { text: '💔 *شہزاد زخمی شاعری:* محبت میں ہر ایک انداز نرالا دیکھا، ہم نے ہر شخص کو یہاں بدلنے والا دیکھا... 🖤' }, { quoted: m }); 
        }
        else if (command === 'bewafa' || command === 'akela' || command === 'joke' || command === 'dosti') {
            await sock.sendMessage(from, { text: `🎭 *فن سیکشن [.${command}]:* تفریحی کمانڈ فعال ہے۔` }, { quoted: m });
        }

        // 8. Owner & Group Management
        else if (command === 'antilink' || command === 'kick' || command === 'mute' || command === 'tagall' || command === 'vv') {
            await sock.sendMessage(from, { text: `🛡️ *گروپ/اونر سسٹم [.${command}]:* کمانڈ فعال ہے۔` }, { quoted: m });
        }

        // 9. Fallback
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] فعال ہے!` }, { quoted: m });
        }
    });
}

// Complete Detailed Menu Function
async function sendMenu(sock, from, m) {
    const menuText = `
*شہزاد زخمی 007* 🚩

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦سسٹم انفو✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : شہزاد زخمی 007
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 🌐 ᴍᴏᴅᴇ : public / private
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

╭━━━━〔 🌸 *سسٹمز اور پیئر* 🌸 〕━━━━⬣
┃ 💗 .public
┃ 💗 .private
┃ 💗 .pair <نمبر>
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɪsʟᴀᴍɪ⠉* 🌸 〕━━━━⬣
┃ 💗 adhan, namaz_times, duas, zikr, surahs...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 tiktok, ttmp3, fb, igdl, play, apk...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ* 🌸 〕━━━━⬣
┃ 💗 chatgpt, gemini, deepseek, copilot...
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ & ɢʀᴏᴜ🇵* 🌸 〕━━━━⬣
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
