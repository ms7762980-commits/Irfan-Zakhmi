const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, delay } = require('@whiskeysockets/baileys');
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

// Modern & Clean English Web Pairing Panel with Auto-Refresh & Copy
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
                #code { font-size: 22px; color: #34d399; font-weight: bold; background: #0b0f19; padding: 14px; border-radius: 10px; border: 1px dashed #10b981; word-break: break-all; margin-bottom: 10px; letter-spacing: 2px; }
                .copy-btn { background: #3b82f6; margin-top: 5px; }
                .copy-btn:hover { background: #2563eb; }
                .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ Shahzad Zakhmi 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel (Auto-Safe)</div>
                <div class="info-box">
                    <strong>ہدایت:</strong> نمبر لکھ کر جنریٹ دبائیں۔ اگر کوڈ نہ آئے تو 30 سیکنڈ رک کر دوبارہ کوشش کریں تاکہ واٹس ایپ بلاک نہ کرے۔
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
                    if(!phone) { alert('براہ کرم واٹس ایپ نمبر درج کریں!'); return; }
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
                            alert(data.error || 'کوڈ حاصل کرنے میں خرابی۔ براہ کرم 30 سیکنڈ بعد دوبارہ کوشش کریں۔');
                            btn.innerText = 'Generate Pairing Code';
                            btn.disabled = false;
                        }
                    } catch(e) {
                        alert('کنکشن کی خرابی! دوبارہ کوشش کریں۔');
                        btn.innerText = 'Generate Pairing Code';
                        btn.disabled = false;
                    }
                }
                function copyCode() {
                    const codeText = document.getElementById('code').innerText;
                    navigator.clipboard.writeText(codeText).then(() => {
                        alert('پیئرنگ کوڈ کاپی ہو گیا ہے!');
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
            return res.json({ error: 'بوٹ ابھی شروع ہو رہا ہے، 5 سیکنڈ انتظار کریں!' });
        }
        if (globalSock.authState.creds.registered) {
            return res.json({ error: 'بوٹ پہلے ہی رجسٹرڈ یا کنیکٹڈ ہے!' });
        }

        let code = await globalSock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return res.json({ code });
    } catch (err) {
        return res.json({ error: 'ریٹ لمیٹ یا سیشن خرابی۔ 30 سیکنڈ بعد ریٹرائی کریں!' });
    }
});

let botMode = 'public'; 
const ownerNumber = '923256326517@s.whatsapp.net';

async function startBot() {
    // اگر پرانا خراب سیشن ہو تو اسے صاف کرنے کا انتظام تاکہ نیا کوڈ پھنسے نہیں
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
                console.log('🔄 Session logged out, restarting...');
                // اگر لاگ آؤٹ ہو گیا ہو تو فولڈر صاف کر کے نیا سیشن بنا لیں
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

    // Complete Message Handler with Separate Lines & Mode & .pair Command
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

        // ==========================================
        // 1. SETTINGS & PAIR COMMANDS (ہر ایک کی الگ لائن)
        // ==========================================
        if (command === 'public') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر استعمال کر سکتا ہے!' }, { quoted: m }); return; }
            botMode = 'public';
            await sock.sendMessage(from, { text: '🌐 بوٹ اب *Public Mode* پر کر دیا گیا ہے، اب سب استعمال کر سکتے ہیں۔' }, { quoted: m });
        }
        else if (command === 'private') {
            if (!isOwner) { await sock.sendMessage(from, { text: '❌ یہ کمانڈ صرف اونر استعمال کر سکتا ہے!' }, { quoted: m }); return; }
            botMode = 'private';
            await sock.sendMessage(from, { text: '🔒 بوٹ اب *Private Mode* پر کر دیا گیا ہے، اب صرف آپ استعمال کر سکتے ہیں۔' }, { quoted: m });
        }
        else if (command === 'pair') {
            const targetPhone = q.replace(/[^0-9]/g, '');
            if (!targetPhone) {
                await sock.sendMessage(from, { text: '⚠️ براہ کرم نمبر بھی لکھیں!\nمثال کے طور پر: *.pair 923256326517*' }, { quoted: m });
                return;
            }
            try {
                let code = await sock.requestPairingCode(targetPhone);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                await sock.sendMessage(from, { text: `⚡ *پیئرنگ کوڈ کامیاب!*\n\n📱 نمبر: ${targetPhone}\n🔑 کوڈ: \`${code}\`` }, { quoted: m });
            } catch (err) {
                await sock.sendMessage(from, { text: `❌ پیئرنگ کوڈ جنریٹ کرنے میں خرابی پیش آئی۔ 30 سیکنڈ بعد دوبارہ کوشش کریں۔` }, { quoted: m });
            }
        }

        // ==========================================
        // 2. MAIN & MENU COMMANDS (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'menu' || command === 'm' || command === 'help' || command === 'alive') {
            await sendMenu(sock, from, m);
        }
        else if (command === 'ping') { await sock.sendMessage(from, { text: '⚡ Pong! Bot is active.' }, { quoted: m }); }
        else if (command === 'owner') { await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی (923256326517)' }, { quoted: m }); }
        else if (command === 'repo') { await sock.sendMessage(from, { text: '📂 *GitHub Repo:* شہزاد زخمی 007' }, { quoted: m }); }

        // ==========================================
        // 3. ISLAMIC COMMANDS (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'adhan') { await sock.sendMessage(from, { text: '🕌 *اذان ریمائنڈر*' }, { quoted: m }); }
        else if (command === 'namaz_times') { await sock.sendMessage(from, { text: '🕌 *نماز کے اوقات*' }, { quoted: m }); }
        else if (command === 'dua_morning') { await sock.sendMessage(from, { text: '🤲 *صبح کی دعا*' }, { quoted: m }); }
        else if (command === 'dua_evening') { await sock.sendMessage(from, { text: '🤲 *شام کی دعا*' }, { quoted: m }); }
        else if (command === 'surah_fatiha') { await sock.sendMessage(from, { text: '📖 *سورۃ الفاتحہ*' }, { quoted: m }); }
        else if (command === 'ayatul_kursi') { await sock.sendMessage(from, { text: '📖 *آیت الكرسی*' }, { quoted: m }); }

        // ==========================================
        // 4. DOWNLOAD COMMANDS (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'tiktok') { await sock.sendMessage(from, { text: '📥 *ٹک ٹاک ڈاؤنلوڈر*' }, { quoted: m }); }
        else if (command === 'ttmp3') { await sock.sendMessage(from, { text: '🎵 *ٹک ٹاک MP3*' }, { quoted: m }); }
        else if (command === 'fb') { await sock.sendMessage(from, { text: '📘 *فیس بک ڈاؤنلوڈر*' }, { quoted: m }); }
        else if (command === 'igdl') { await sock.sendMessage(from, { text: '📷 *انسٹاگرام ڈاؤنلوڈر*' }, { quoted: m }); }
        else if (command === 'play') { await sock.sendMessage(from, { text: '🎵 *سونگ پلے*' }, { quoted: m }); }
        else if (command === 'apk') { await sock.sendMessage(from, { text: '📦 *APK Downloader*' }, { quoted: m }); }

        // ==========================================
        // 5. AI COMMANDS (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'chatgpt') { await sock.sendMessage(from, { text: '🤖 *ChatGPT*' }, { quoted: m }); }
        else if (command === 'gemini') { await sock.sendMessage(from, { text: '🤖 *Gemini AI*' }, { quoted: m }); }
        else if (command === 'deepseek') { await sock.sendMessage(from, { text: '🤖 *DeepSeek*' }, { quoted: m }); }
        else if (command === 'copilot') { await sock.sendMessage(from, { text: '🤖 *Copilot*' }, { quoted: m }); }

        // ==========================================
        // 6. TOOLS & UTILITY (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'sticker' || command === 's') { await sock.sendMessage(from, { text: '📸 *Sticker Maker*' }, { quoted: m }); }
        else if (command === 'removebg') { await sock.sendMessage(from, { text: '🖼️ *Remove BG*' }, { quoted: m }); }
        else if (command === 'remini') { await sock.sendMessage(from, { text: '✨ *Remini*' }, { quoted: m }); }
        else if (command === 'weather') { await sock.sendMessage(from, { text: '🌤️ *Weather*' }, { quoted: m }); }
        else if (command === 'wikipedia') { await sock.sendMessage(from, { text: '📚 *Wikipedia*' }, { quoted: m }); }

        // ==========================================
        // 7. FUN & SHAYARI (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'shayari') { await sock.sendMessage(from, { text: '💔 *شاعری:* محبت میں ہر ایک انداز نرالا دیکھا... 🖤' }, { quoted: m }); }
        else if (command === 'bewafa') { await sock.sendMessage(from, { text: '🥀 *بیوفائی شاعری*' }, { quoted: m }); }
        else if (command === 'akela') { await sock.sendMessage(from, { text: '🖤 *تنہائی شاعری*' }, { quoted: m }); }
        else if (command === 'joke') { await sock.sendMessage(from, { text: '😂 *لطیفہ*' }, { quoted: m }); }
        else if (command === 'dosti') { await sock.sendMessage(from, { text: '🤝 *دستی شاعری*' }, { quoted: m }); }

        // ==========================================
        // 8. OWNER & GROUP (ہر ایک کی الگ لائن)
        // ==========================================
        else if (command === 'antilink') { await sock.sendMessage(from, { text: '🛡️ *Anti-Link*' }, { quoted: m }); }
        else if (command === 'kick') { await sock.sendMessage(from, { text: '⚠️ *Kick*' }, { quoted: m }); }
        else if (command === 'mute') { await sock.sendMessage(from, { text: '🔇 *Mute*' }, { quoted: m }); }
        else if (command === 'tagall') { await sock.sendMessage(from, { text: '📢 *Tag All*' }, { quoted: m }); }
        else if (command === 'vv') { await sock.sendMessage(from, { text: '👁️ *View Once*' }, { quoted: m }); }

        // ==========================================
        // 9. FINAL FALLBACK FOR ANY OTHER COMMAND
        // ==========================================
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] فعال ہے!` }, { quoted: m });
        }
    });
}

// Complete Detailed Menu Function with All Categories
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

╭━━━━〔 🌸 *ɪsʟᴀᴍɪᴄ* 🌸 〕━━━━⬣
┃ 💗 adhan
┃ 💗 namaz_times
┃ 💗 dua_morning
┃ 💗 dua_evening
┃ 💗 dua_sleep
┃ 💗 dua_wakeup
┃ 💗 dua_eating
┃ 💗 dua_travel
┃ 💗 dua_rain
┃ 💗 dua_anxiety
┃ 💗 dua_distress
┃ 💗 dua_hajat
┃ 💗 dua_forgiveness
┃ 💗 dua_rizq
┃ 💗 dua_guidance
┃ 💗 dua_health
┃ 💗 zikr_la_hawla
┃ 💗 zikr_subhanallahi_wabihamdihi
┃ 💗 zikr_subhanallahil_azeem
┃ 💗 zikr_1000
┃ 💗 zikr_astaghfirullah
┃ 💗 zikr_alhamdulillah
┃ 💗 zikr_subhanallah
┃ 💗 zikr_allahuakbar
┃ 💗 zikr_lailahailallah
┃ 💗 zikr_lahawla
┃ 💗 surah_fatiha
┃ 💗 surah_falaq
┃ 💗 surah_nas
┃ 💗 surah_kafirun
┃ 💗 surah_asr
┃ 💗 surah_kauthar
┃ 💗 ayatul_kursi
┃ 💗 surah_yaseen
┃ 💗 surah_rahman
┃ 💗 surah_mulk
┃ 💗 hadith_good_morals
┃ 💗 hadith_cleanliness
┃ 💗 hadith_truth
┃ 💗 hadith_patience
┃ 💗 darood_sharif
┃ 💗 kalima_tayyiba
┃ 💗 islam_fact
┃ 💗 quran_reminder
┃ 💗 pillars_islam
┃ 💗 pillars_iman
┃ 💗 islamic_months
┃ 💗 ramadan_info
┃ 💗 hajj_info
┃ 💗 wudu_steps
┃ 💗 namaz_steps
┃ 💗 jummah_info
┃ 💗 eid_info
┃ 💗 shab_e_qadr
┃ 💗 shab_e_barat
┃ 💗 darood_nariya
┃ 💗 darood_shaafi
┃ 💗 darood_mahabbat
┃ 💗 darood_ghausia
┃ 💗 tahajjud
┃ 💗 ishraq
┃ 💗 chast
┃ 💗 ayat_protection
┃ 💗 ruqya
┃ 💗 islam_quiz
┃ 💗 quran_info
┃ 💗 akhlaq
┃ 💗 parents_dua
┃ 💗 neighbor_rights
┃ 💗 sehri_dua
┃ 💗 iftar_dua
┃ 💗 ramadan_dua
┃ 💗 hasbunallah
┃ 💗 bismillah
┃ 💗 inshaallah
┃ 💗 mashaallah
┃ 💗 alhamdulillah
┃ 💗 subhanallah
┃ 💗 allahuakbar
┃ 💗 lailahailallah
┃ 💗 astaghfirullah
┃ 💗 islamic_quote
┃ 💗 prophet_story
┃ 💗 sahabis_story
┃ 💗 dua_exam
┃ 💗 dua_kamyabi
┃ 💗 dua_marriage
┃ 💗 dua_children
┃ 💗 dua_health_shifa
┃ 💗 dua_debt
┃ 💗 dua_enemy
┃ 💗 dua_majlis
┃ 💗 dua_khatm
┃ 💗 dua_general
┃ 💗 prophetnames
┃ 💗 allahnames
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 islamic
┃ 💗 testicker
┃ 💗 apk
┃ 💗 capcut
┃ 💗 drama
┃ 💗 fb
┃ 💗 igdl
┃ 💗 igdl2
┃ 💗 igdl3
┃ 💗 mediafire
┃ 💗 megadl
┃ 💗 pinterest
┃ 💗 ttmp3
┃ 💗 igmp3
┃ 💗 tiktok
┃ 💗 tiktok2
┃ 💗 tiktok3
┃ 💗 ytpost
┃ 💗 gitclone
┃ 💗 naat
┃ 💗 pinvideo
┃ 💗 play
┃ 💗 video
┃ 💗 play2
┃ 💗 tsticker
┃ 💗 tiktoksearch
┃ 💗 tts
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍɪsᴄ* 🌸 〕━━━━⬣
┃ 💗 report
┃ 💗 afk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ* 🌸 〕━━━━⬣
┃ 💗 copilot
┃ 💗 chatgptelite
┃ 💗 talkai
┃ 💗 brain
┃ 💗 elite
┃ 💗 mscopilot
┃ 💗 elitegpt
┃ 💗 assistant
┃ 💗 smart
┃ 💗 genius
┃ 💗 proai
┃ 💗 elitecopilot
┃ 💗 ultra
┃ 💗 maxai
┃ 💗 nova
┃ 💗 zenith
┃ 💗 apex
┃ 💗 vertex
┃ 💗 pulse
┃ 💗 quantum
┃ 💗 neo
┃ 💗 omega
┃ 💗 gpt
┃ 💗 gpt4
┃ 💗 gpt4o
┃ 💗 chatgpt
┃ 💗 claude
┃ 💗 gemini
┃ 💗 kimi
┃ 💗 perplexity
┃ 💗 llama2
┃ 💗 llama3
┃ 💗 mistral
┃ 💗 mixtral
┃ 💗 falcon
┃ 💗 bloom
┃ 💗 orca
┃ 💗 vicuna
┃ 💗 alpaca
┃ 💗 phi2
┃ 💗 wizard
┃ 💗 codet5
┃ 💗 starlin
┃ 💗 deepseek
┃ 💗 deepseekcoder
┃ 💗 yi
┃ 💗 yi34b
┃ 💗 qwen
┃ 💗 command
┃ 💗 jurassic
┃ 💗 ai21
┃ 💗 solar
┃ 💗 lumin
┃ 💗 grokbeta
┃ 💗 bard
┃ 💗 redpajama
┃ 💗 dolly
┃ 💗 codex
┃ 💗 hugging
┃ 💗 openassist
┃ 💗 gptneo
┃ 💗 gptj
┃ 💗 bloomz
┃ 💗 flant5
┃ 💗 codegen
┃ 💗 starcoder
┃ 💗 gpt3
┃ 💗 chatgptplus
┃ 💗 gpt4turbo
┃ 💗 claudeinstant
┃ 💗 claude2
┃ 💗 palm2
┃ 💗 mathgpt
┃ 💗 grammar
┃ 💗 ai
┃ 💗 adeel
┃ 💗 aivideo
┃ 💗 imagine
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ-ᴘʀᴏ* 🌸 〕━━━━⬣
┃ 💗 deepseekpro
┃ 💗 geminipro
┃ 💗 chatgptpro
┃ 💗 grokpro
┃ 💗 claudepro
┃ 💗 llamapro
┃ 💗 mistralpro
┃ 💗 copro
┃ 💗 perplexitypro
┃ 💗 kimipro
┃ 💗 qwenpro
┃ 💗 yipro
┃ 💗 bardpro
┃ 💗 mixtralpro
┃ 💗 falconpro
┃ 💗 vicunapro
┃ 💗 orcapro
┃ 💗 wizardpro
┃ 💗 solarpro
┃ 💗 neopro
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɴɪᴍᴇ* 🌸 〕━━━━⬣
┃ 💗 animecouple1 - 25
┃ 💗 animegirl1 - 22
┃ 💗 animewallpaper1 - 20
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ* 🌸 〕━━━━⬣
┃ 💗 vv, vv2, vv3
┃ 💗 tochannel
┃ 💗 chjid
┃ 💗 fullpp
┃ 💗 leave
┃ 💗 ik
┃ 💗 block, unblock
┃ 💗 msg, status, pair
┃ 💗 notify, forward
┃ 💗 countx, count, update
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɢʀᴏᴜ🇵* 🌸 〕━━━━⬣
┃ 💗 antibot, botlist, kickbot
┃ 💗 delete, dismissall, mute, unmute
┃ 💗 tagall, kick, promote, demote
┃ 💗 gcpp, revoke, link, ginfo
┃ 💗 poll, out, newgc, end, join
┃ 💗 invite, requests, accept, reject
┃ 💗 add, hidetag, vote, tagadmins
┃ 💗 broadcast
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴜᴛɪʟɪᴛʏ* 🌸 〕━━━━⬣
┃ 💗 boom, uptime, weather
┃ 💗 convert, cpp, raw, define
┃ 💗 news, id, lid, movieinfo
┃ 💗 find, praytime, caption
┃ 💗 playstore, ss, binary
┃ 💗 base64, urlencode, calculate
┃ 💗 tempmail, wikipedia, url
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ & sʜᴀʏᴀʀɪ* 🌸 〕━━━━⬣
┃ 💗 character, ringtone, rain
┃ 💗 roast, 8ball, lovetest, quote
┃ 💗 flirt, shayari, bewafa, akela
┃ 💗 dosti, joke, bacha, bachi
┃ 💗 pickup, ship, dad, mom, son
┃ 💗 boyfriend, girlfriend, enemy
┃ 💗 ishqmeter, dildar, dua, dare
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *sᴇᴛᴛɪɴɢs* 🌸 〕━━━━⬣
┃ 💗 welcome, goodbye, antiedit
┃ 💗 autoread, antilink, antidelete
┃ 💗 recording, statusview, autoreact
┃ 💗 anticall, autotyping, online
┃ 💗 mode, prefix, botname, ownername
┃ % stickername, ban, unban, sudo
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
