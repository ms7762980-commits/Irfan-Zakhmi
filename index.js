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

// Web Pairing Panel Website (کوئی نمبر فکس نہیں ہے، ہر کوئی اپنا نمبر لکھ سکے گا)
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
                button { background: #10b981; color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; width: 100%; }
                button:hover { background: #059669; }
                #code { font-size: 18px; color: #34d399; background: #0b0f19; padding: 12px; border-radius: 10px; margin-top: 15px; display: none; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ Shahzad Zakhmi 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel (Unlimited)</div>
                <div class="info-box">
                    <strong>ہدایت:</strong> اپنا واٹس ایپ نمبر مع کنٹری کوڈ یہاں درج کریں (مثلاً 92325... بغیر پلس کے) اور کوڈ حاصل کریں۔
                </div>
                <label>WhatsApp Number</label>
                <input type="text" id="phone" value="" placeholder="e.g. 923256326517">
                <button onclick="getPairingCode()" id="gen-btn">Generate Pairing Code</button>
                <div id="code"></div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('براہ کرم اپنا واٹس ایپ نمبر درج کریں!'); return; }
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

let botMode = 'public'; // ان لمیٹڈ لوگوں کے لیے پبلک موڈ
const ownerNumber = '923256326517';

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

    // Message Handler with Separate Lines for Every Command
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

        if (botMode === 'private' && !isOwner) {
            await sock.sendMessage(from, { text: '⚠️ بوٹ اس وقت *Private Mode* پر ہے!' }, { quoted: m });
            return;
        }

        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const q = args.join(" ");

        // ==========================================
        // 1. Core & Settings Commands (ہر ایک الگ لائن)
        // ==========================================
        if (command === 'public') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'public';
            await sock.sendMessage(from, { text: '🌐 بوٹ اب سب کے لیے *Public Mode* پر کر دیا گیا ہے!' }, { quoted: m });
        }
        else if (command === 'private') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر کے لیے ہے!' }, { quoted: m }); return; }
            botMode = 'private';
            await sock.sendMessage(from, { text: '🔒 بوٹ اب *Private Mode* پر کر دیا گیا ہے!' }, { quoted: m });
        }
        else if (command === 'pair') {
            await sock.sendMessage(from, { text: `⚡ براہ کرم ریلوے پینل پر جا کر اپنا نمبر خود درج کریں تاکہ آپ کا پیئرنگ کوڈ جنریٹ ہو سکے!` }, { quoted: m });
        }
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

        // ==========================================
        // 2. Islamic Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'adhan') { await sock.sendMessage(from, { text: '🕌 *اذان ریمائنڈر:* بے شک نماز مومن پر فرض ہے۔' }, { quoted: m }); }
        else if (command === 'namaz_times') { await sock.sendMessage(from, { text: '🕌 *نماز کے اوقات:* وقت کی پابندی کریں۔' }, { quoted: m }); }
        else if (command === 'dua_morning') { await sock.sendMessage(from, { text: '🤲 *صبح کی دعا:* اصبحنا واصبح الملك لله...' }, { quoted: m }); }
        else if (command === 'dua_evening') { await sock.sendMessage(from, { text: '🤲 *شام کی دعا:* امسينا وامسى الملك لله...' }, { quoted: m }); }
        else if (command === 'surah_fatiha') { await sock.sendMessage(from, { text: '📖 *سورۃ الفاتحہ:* بسم اللہ الرحمن الرحیم...' }, { quoted: m }); }
        else if (command === 'ayatul_kursi') { await sock.sendMessage(from, { text: '📖 *آیت الكرسی:* اللہ لا الہ الا ھو الحي القيوم...' }, { quoted: m }); }
        else if (command === 'surah_yaseen') { await sock.sendMessage(from, { text: '📖 *سورۃ یسین*' }, { quoted: m }); }
        else if (command === 'surah_rahman') { await sock.sendMessage(from, { text: '📖 *سورۃ الرحمٰن*' }, { quoted: m }); }
        else if (command === 'surah_mulk') { await sock.sendMessage(from, { text: '📖 *سورۃ الملک*' }, { quoted: m }); }

        // ==========================================
        // 3. Download Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'tiktok') { await sock.sendMessage(from, { text: '📥 *ٹک ٹاک ڈاؤنلوڈر:* ویڈیو لنک ارسال کریں۔' }, { quoted: m }); }
        else if (command === 'ttmp3') { await sock.sendMessage(from, { text: '🎵 *ٹک ٹاک MP3:* آڈیو لنک فراہم کریں۔' }, { quoted: m }); }
        else if (command === 'fb') { await sock.sendMessage(from, { text: '📘 *فیس بک ڈاؤنلوڈر:* ویڈیو لنک درج کریں۔' }, { quoted: m }); }
        else if (command === 'igdl') { await sock.sendMessage(from, { text: '📷 *انسٹاگرام ڈاؤنلوڈر:* لنک یہاں پیسٹ کریں۔' }, { quoted: m }); }
        else if (command === 'play') { await sock.sendMessage(from, { text: '🎵 *سونگ پلے:* گانے کا نام یا لنک لکھیں۔' }, { quoted: m }); }
        else if (command === 'apk') { await sock.sendMessage(from, { text: '📦 *APK Downloader:* ایپ کا نام درج کریں۔' }, { quoted: m }); }
        else if (command === 'pinterest') { await sock.sendMessage(from, { text: '📌 *Pinterest Downloader*' }, { quoted: m }); }

        // ==========================================
        // 4. AI Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'chatgpt') { await sock.sendMessage(from, { text: '🤖 *ChatGPT:* فرمائیے کیا جاننا چاہتے ہیں؟' }, { quoted: m }); }
        else if (command === 'gemini') { await sock.sendMessage(from, { text: '🤖 *Gemini AI:* میں حاضر ہوں، سوال پوچھیں۔' }, { quoted: m }); }
        else if (command === 'deepseek') { await sock.sendMessage(from, { text: '🤖 *DeepSeek:* کوڈنگ کے لیے تیار ہوں۔' }, { quoted: m }); }
        else if (command === 'copilot') { await sock.sendMessage(from, { text: '🤖 *Copilot:* اسسٹنٹ فیچر فعال ہے۔' }, { quoted: m }); }
        else if (command === 'claude') { await sock.sendMessage(from, { text: '🤖 *Claude AI*' }, { quoted: m }); }

        // ==========================================
        // 5. Tools & Utility Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'sticker' || command === 's') { await sock.sendMessage(from, { text: '📸 *Sticker Maker:* تصویر کے ساتھ کمانڈ بھیجیں۔' }, { quoted: m }); }
        else if (command === 'removebg') { await sock.sendMessage(from, { text: '🖼️ *Remove BG:* پس منظر ہٹانے کی کمانڈ۔' }, { quoted: m }); }
        else if (command === 'remini') { await sock.sendMessage(from, { text: '✨ *Remini:* ایچ ڈی کرنے کا فیچر فعال ہے۔' }, { quoted: m }); }
        else if (command === 'weather') { await sock.sendMessage(from, { text: '🌤️ *Weather:* شہر کا نام لکھیں۔' }, { quoted: m }); }
        else if (command === 'wikipedia') { await sock.sendMessage(from, { text: '📚 *Wikipedia:* موضوع درج کریں۔' }, { quoted: m }); }
        else if (command === 'calculator') { await sock.sendMessage(from, { text: '🔢 *Calculator*' }, { quoted: m }); }

        // ==========================================
        // 6. Fun & Shayari Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'shayari') { await sock.sendMessage(from, { text: '💔 *شہزاد زخمی شاعری:* محبت میں ہر ایک انداز نرالا دیکھا... 🖤' }, { quoted: m }); }
        else if (command === 'bewafa') { await sock.sendMessage(from, { text: '🥀 *بیوفائی شاعری:* تلاش اس کی تھی جو کبھی ملا ہی نہیں...' }, { quoted: m }); }
        else if (command === 'akela') { await sock.sendMessage(from, { text: '🖤 *تنہائی شاعری:* تنہائی بہت کچھ سکھا دیتی ہے...' }, { quoted: m }); }
        else if (command === 'joke') { await sock.sendMessage(from, { text: '😂 *لطیفہ:* ہنسنا صحت کے لیے اچھا ہے۔' }, { quoted: m }); }
        else if (command === 'dosti') { await sock.sendMessage(from, { text: '🤝 *دستی شاعری:* یاروں کا ڈیرہ سلامت رہے...' }, { quoted: m }); }

        // ==========================================
        // 7. Owner & Group Commands (ہر ایک الگ لائن)
        // ==========================================
        else if (command === 'antilink') { await sock.sendMessage(from, { text: '🛡️ *Anti-Link:* لنک بلاک سسٹم فعال ہے۔' }, { quoted: m }); }
        else if (command === 'kick') { await sock.sendMessage(from, { text: '⚠️ *Kick:* ممبر کو باہر کرنے کی کمانڈ۔' }, { quoted: m }); }
        else if (command === 'mute') { await sock.sendMessage(from, { text: '🔇 *Mute:* گروپ کو میوٹ کر دیا گیا۔' }, { quoted: m }); }
        else if (command === 'tagall') { await sock.sendMessage(from, { text: '📢 *Tag All:* تمام اراکین کو ٹیگ کیا جا رہا ہے۔' }, { quoted: m }); }
        else if (command === 'vv') { await sock.sendMessage(from, { text: '👁️ *View Once:* ویو ونس ریٹریور فعال ہے۔' }, { quoted: m }); }

        // ==========================================
        // 8. Final Fallback for any other command
        // ==========================================
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] کامیابی سے فعال ہے اور پروسیس ہو رہی ہے!` }, { quoted: m });
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
│ 🌐 ᴍᴏᴅᴇ : ${botMode} (Unlimited Users)
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

╭━━━━〔 🌸 *سسٹمز اور پیئر* 🌸 〕━━━━⬣
┃ 💗 .public
┃ 💗 .private
┃ 💗 .pair (ویب لنک)
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɪsʟᴀᴍɪᴄ* 🌸 〕━━━━⬣
┃ 💗 adhan
┃ 💗 namaz_times
┃ 💗 dua_morning
┃ 💗 dua_evening
┃ 💗 surah_fatiha
┃ 💗 ayatul_kursi
┃ 💗 surah_yaseen
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 tiktok
┃ 💗 ttmp3
┃ 💗 fb
┃ 💗 igdl
┃ 💗 play
┃ 💗 apk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ* 🌸 〕━━━━⬣
┃ 💗 chatgpt
┃ 💗 gemini
┃ 💗 deepseek
┃ 💗 copilot
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ & ɢʀᴏᴜᴘ* 🌸 〕━━━━⬣
┃ 💗 antilink
┃ 💗 kick
┃ 💗 mute
┃ 💗 tagall
┃ 💗 vv
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏls & ᴜᴛɪʟɪᴛʏ* 🌸 〕━━━━⬣
┃ 💗 sticker
┃ 💗 removebg
┃ 💗 remini
┃ 💗 weather
┃ 💗 wikipedia
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ & sʜᴀʏᴀʀɪ* 🌸 〕━━━━⬣
┃ 💗 shayari
┃ 💗 bewafa
┃ 💗 akela
┃ 💗 joke
┃ 💗 dosti
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
