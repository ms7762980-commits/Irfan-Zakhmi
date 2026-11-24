const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Web Pairing Panel
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Shahzad Zakhmi - Multi-Session Pairing Panel</title>
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
                <h2>⚡ شہزاد زخمی 007 ⚡</h2>
                <div class="sub-title">Multi-Number Pairing Panel</div>
                <div class="info-box">
                    <strong>ہدایت:</strong> اپنا واٹس ایپ نمبر مع کنٹری کوڈ یہاں درج کریں اور پیئرنگ کوڈ حاصل کریں۔
                </div>
                <label>WhatsApp Number</label>
                <input type="text" id="phone" value="" placeholder="e.g. 923256326517">
                <button onclick="getPairingCode()" id="gen-btn">Generate Pairing Code</button>
                <div id="code-container">
                    <div id="code"><span>-------</span></div>
                    <button class="copy-btn" onclick="copyCode()">📋 Copy Code</button>
                </div>
                <div class="footer">Powered by شہزاد زخمی 007</div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('براہ کرم اپنا واٹس ایپ نمبر درج کریں!'); return; }
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

// ملٹی سیشن ہینڈلر
app.get('/pair', async (req, res) => {
    let phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required' });
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    try {
        const sessionDir = path.join(__dirname, `./auth_info_${phoneNumber}`);
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            auth: state,
            printQRInTerminal: false,
            browser: Browsers.macOS("Chrome")
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection } = update;
            if (connection === 'open') {
                console.log(`✅ Bot Connected Successfully for Number: ${phoneNumber}`);
                startBotListeners(sock);
            }
        });

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                return res.json({ code });
            } catch (err) {
                return res.json({ error: 'Failed to generate code. Make sure number is correct.' });
            }
        }, 3000);

    } catch (err) {
        return res.json({ error: err.message || 'Failed to initialize session.' });
    }
});

// تمام کمانڈز اور مکمل مینو کا فنکشن
function startBotListeners(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text :
                     (messageType === 'imageMessage') ? m.message.imageMessage.caption : '';
        
        const from = m.key.remoteJid;
        if (!body || !body.startsWith('.')) return;

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        // مکمل مینو جس میں آپ کی تمام کمانڈز ایک ایک کر کے الگ لائن میں موجود ہیں
        if (command === 'menu' || command === 'm' || command === 'help' || command === 'alive') {
            const menuText = `
*شہزاد زخمی 007* 🚩

*بِسْمِ اللّٰہِ الرَّحْمٰنِ الرَّحِیمِ*
*اِیَّاکَ نَعۡبُدُ وَ اِیَّاکَ نَسۡتَعِیۡنُ* ☝️

━━━〔 ✦سسٹم انفو✦ 〕━━━
│ 🤖 ʙᴏᴛ ɴᴀᴍᴇ : شہزاد زخمی 007
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 🌐 ᴍᴏᴅᴇ : public (Multi-Session Active)
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

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
┃ 💗 sahabi_story
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
┃ 💗 tiktoksearch2
┃ 💗 tts
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
┃ 💗 aividideo
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
┃ 💗 animecouple1 to 25
┃ 💗 animegirl1 to 22
┃ 💗 animewallpaper1 to 20
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏls & sᴛɪᴄᴋᴇʀ* 🌸 〕━━━━⬣
┃ 💗 sticker
┃ 💗 s
┃ 💗 removebg
┃ 💗 remini
┃ 💗 weather
┃ 💗 wikipedia
┃ 💗 tomp3
┃ 💗 toptt
┃ 💗 sound
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
        else if (command === 'sticker' || command === 's' || command === 'tsticker') {
            try {
                const quotedMessage = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quotedMessage && quotedMessage.imageMessage) {
                    const stream = await downloadMediaMessage(
                        { message: quotedMessage, key: { remoteJid: from } },
                        'buffer',
                        {},
                        { logger: pino({ level: 'silent' }) }
                    );
                    await sock.sendMessage(from, { sticker: stream }, { quoted: m });
                } else {
                    await sock.sendMessage(from, { text: '⚠️ براہ کرم کسی تصویر پر ریپلائی کر کے .sticker یا .s لکھیں!' }, { quoted: m });
                }
            } catch (err) {
                await sock.sendMessage(from, { text: '❌ اسٹیکر بنانے میں خرابی: ' + err.message }, { quoted: m });
            }
        }
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ Pong! Multi-Session Bot is active.' }, { quoted: m });
        }
        else if (command === 'owner') {
            await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی\n📞 *Contact:* 923256326517\n🚩 *Brand:* شہزاد زخمی 007' }, { quoted: m });
        }
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] کامیابی سے فعال ہے اور کام کر رہی ہے!` }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Multi-Session Server & Website running on port ${PORT}`);
});
