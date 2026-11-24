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

    // Message Handler & 500+ Commands Menu
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;
        const messageType = Object.keys(m.message)[0];
        const body = (messageType === 'conversation') ? m.message.conversation :
                     (messageType === 'extendedTextMessage') ? m.message.extendedTextMessage.text : '';
        
        const from = m.key.remoteJid;
        if (!body.startsWith('.')) return;

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
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 📜 ᴄᴍᴅs   : ~500 (All Loaded)
│ 🌐 ᴍᴏᴅᴇ : public
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
┃ 💗 drama
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
┃ 💗 video
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
┃ º┃ 💗 llama3
┃ 💗 mistral
┃ 💗 mixtral
┃ 💗 falcon
┃ 💗 bloom
┃ º┃ 💗 orca
┃ 💗 vicuna
┃ 💗 alpaca
┃ 💗 phi2
┃ 💗 wizard
┃ 💗 codet5
┃ 💗 starlin
┃ 💗 deepseek
┃ 💗 deepseekcoder
┃ º┃ 💗 yi
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
┃ º┃ 💗 flant5
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
┃ º┃ 💗 gpt
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
┃ 💗 animecouple1 to animecouple25
┃ 💗 animegirl1 to animegirl22
┃ 💗 animewallpaper1 to animewallpaper20
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ* 🌸 〕━━━━⬣
┃ 💗 vv
┃ 💗 vv2
┃ 💗 vv3
┃ 💗 tochannel
┃ 💗 chjid
┃ 💗 fullpp
┃ 💗 leave
┃ 💗 ik
┃ 💗 block
┃ 💗 unblock
┃ 💗 msg
┃ 💗 status
┃ 💗 pair
┃ 💗 notify
┃ 💗 forward
┃ 💗 countx
┃ 💗 count
┃ 💗 update
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɢʀᴏᴜᴘ* 🌸 〕━━━━⬣
┃ 💗 antibot
┃ 💗 botlist
┃ 💗 kickbot
┃ 💗 antibothelp
┃ 💗 delete
┃ 💗 dismissall
┃ 💗 delgcstatus
┃ 💗 unmute
┃ 💗 mute
┃ 💗 tagall
┃ 💗 kick
┃ 💗 promote
┃ 💗 demote
┃ 💗 gcpp
┃ 💗 revoke
┃ 💗 link
┃ 💗 ginfo
┃ 💗 updategdesc
┃ º┃ 💗 updategname
┃ 💗 poll
┃ 💗 out
┃ 💗 newgc
┃ 💗 end
┃ 💗 join
┃ 💗 invite
┃ 💗 acceptall
┃ 💗 rejectall
┃ 💗 requests
┃ 💗 accept
┃ 💗 reject
┃ 💗 add
┃ 💗 gcstatus
┃ 💗 hidetag
┃ 💗 chreact
┃ 💗 vote
┃ 💗 tagadmins
┃ 💗 broadcast
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴜᴛɪʟɪᴛʏ* 🌸 〕━━━━⬣
┃ 💗 boom
┃ 💗 uptime
┃ 💗 weather
┃ 💗 convert
┃ 💗 cpp
┃ 💗 simdata
┃ 💗 raw
┃ 💗 define
┃ 💗 getimage
┃ 💗 news
┃ 💗 id
┃ 💗 lid
┃ 💗 movieinfo
┃ 💗 find
┃ 💗 praytime
┃ 💗 caption
┃ 💗 rw
┃ 💗 playstore
┃ 💗 ss
┃ 💗 countryinfo
┃ 💗 getlid
┃ 💗 rcolor
┃ 💗 binary
┃ 💗 dbinary
┃ 💗 base64
┃ 💗 unbase64
┃ 💗 urlencode
┃ 💗 urldecode
┃ 💗 timenow
┃ 💗 date
┃ 💗 calculate
┃ 💗 person
┃ 💗 readmore
┃ 💗 tempmail
┃ 💗 checkmail
┃ 💗 wikipedia
┃ 💗 wstalk
┃ 💗 url
┃ 💗 videourl
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʙᴏʏᴅᴘ* 🌸 〕━━━━⬣
┃ 💗 boydp1 to boydp22
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ* 🌸 〕━━━━⬣
┃ 💗 character
┃ 💗 ringtone
┃ 💗 rain
┃ 💗 fight
┃ 💗 puzzle
┃ 💗 story
┃ 💗 transform
┃ 💗 dance
┃ 💗 race
┃ º┃ 💗 weathercast
┃ 💗 emojimenu
┃ 💗 muth
┃ 💗 compatibility
┃ 💗 aura
┃ 💗 roast
┃ 💗 8ball
┃ 💗 compliment
┃ 💗 lovetest
┃ 💗 emoji
┃ 💗 fakevote
┃ 💗 livevote
┃ 💗 fakesubs
┃ 💗 welcomevote
┃ 💗 membergrowth
┃ 💗 fakepoll
┃ 💗 votelist
┃ 💗 quote
┃ 💗 flirt
┃ 💗 🖕
┃ 💗 akela
┃ 💗 bewafa
┃ 💗 chakkar
┃ 💗 ullubana
┃ 💗 taalibajao
┃ 💗 neendurai
┃ 💗 chatpata
┃ 💗 waitingroom
┃ 💗 taj
┃ 💗 lafangaa
┃ 💗 chocolatewala
┃ 💗 baatkaatna
┃ 💗 palat
┃ 💗 gaanasunao
┃ 💗 haaththamna
┃ 💗 chuprahna
┃ 💗 phoolonkahaar
┃ 💗 ghoordekhna
┃ 💗 bahaana
┃ 💗 tarkeeb
┃ 💗 hassichhupa
┃ 💗 mobileband
┃ 💗 pagalpancert
┃ 💗 wallpaper
┃ 💗 donobaat
┃ 💗 kaanpakadna
┃ 💗 taqdir
┃ 💗 kapkapi
┃ 💗 taarifcommit
┃ 💗 captioncontest
┃ 💗 zyadasocha
┃ 💗 ghazab
┃ º┃ 💗 onlinedekhna
┃ 💗 dushmankadushman
┃ 💗 buraanamano
┃ 💗 mirrormirror
┃ 💗 merahero
┃ 💗 natkhat
┃ 💗 pareshan
┃ 💗 interview
┃ 💗 kheltamam
┃ 💗 rishtapakka
┃ 💗 pyaardukaan
┃ 💗 zabaansambhlo
┃ 💗 jhootawada
┃ 💗 sonawala
┃ 💗 gossip
┃ 💗 funnyrishtedar
┃ 💗 aankheband
┃ 💗 alvidanahi
┃ 💗 runmureed
┃ 💗 joke
┃ 💗 bacha
┃ 💗 bachi
┃ 💗 pickup
┃ 💗 ship
┃ 💗 dad
┃ 💗 mom
┃ 💗 son
┃ 💗 daughter
┃ 💗 boyfriend
┃ 💗 girlfriend
┃ 💗 twin
┃ 💗 partner
┃ 💗 bodyguard
┃ 💗 boss
┃ 💗 employee
┃ 💗 pet
┃ 💗 servant
┃ 💗 idol
┃ 💗 fan
┃ 💗 ghost
┃ 💗 angel
┃ 💗 devil
┃ 💗 king
┃ 💗 queen
┃ 💗 slave
┃ 💗 master
┃ 💗 genius
┃ 💗 fool
┃ 💗 rich
┃ 💗 poor
┃ 💗 bhai
┃ 💗 bahan
┃ 💗 wife
┃ 💗 husband
┃ 💗 chacha
┃ 💗 chachi
┃ 💗 nana
┃ º┃ 💗 nani
┃ 💗 mama
┃ 💗 mami
┃ 💗 bestfriend
┃ 💗 enemy
┃ 💗 crush
┃ 💗 teacher
┃ 💗 student
┃ 💗 rival
┃ 💗 ishqmeter
┃ 💗 andhaishq
┃ 💗 lafzmohabbat
┃ 💗 pehlinazar
┃ 💗 dillagi
┃ 💗 khoobsurat
┃ 💗 dhadkan
┃ 💗 pehlaakhat
┃ 💗 ziddidil
┃ 💗 yaadaata
┃ 💗 taubatauba
┃ 💗 pehlamuhabbat
┃ 💗 wafaimtihaan
┃ 💗 donokikahani
┃ 💗 gulabbhejo
┃ 💗 aankhein
┃ 💗 shayarban
┃ 💗 dushmandost
┃ 💗 tangkarna
┃ 💗 smilechurao
┃ 💗 jaan
┃ 💗 qismatwala
┃ 💗 jhoothpyaar
┃ 💗 siyaanibaat
┃ 💗 mohabbatqarz
┃ 💗 nazarutarao
┃ 💗 romanticbakwaas
┃ º┃ 💗 aashiqanaward
┃ 💗 mohabbatteri
┃ 💗 dilkhol
┃ 💗 gussapyaar
┃ 💗 jasoos
┃ 💗 tangaphanda
┃ 💗 muftadvice
┃ 💗 nakhrebaaz
┃ 💗 anokhapyaar
┃ 💗 bhaaggaya
┃ 💗 khushnaseebi
┃ 💗 ronewala
┃ 💗 waqtguzarna
┃ 💗 chandsa
┃ 💗 dostyadildar
┃ 💗 galatfehmi
┃ 💗 perfectmatch
┃ º┃ 💗 raazkhola
┃ 💗 mohabbatdarjaa
┃ 💗 dua
┃ 💗 khwaabon
┃ 💗 dare
┃ 💗 truth
┃ 💗 shayari
┃ 💗 technologia
┃ 💗 motivate
┃ 💗 repeat
┃ 💗 lurk
┃ 💗 shoot
┃ 💗 sleep
┃ 💗 clap
┃ 💗 shrug
┃ 💗 stare
┃ 💗 wave
┃ 💗 poke
┃ 💗 confused
┃ 💗 smile
┃ 💗 peck
┃ 💗 wink
┃ 💗 sip
┃ 💗 blush
┃ º┃ 💗 smug
┃ 💗 tickle
┃ 💗 yeet
┃ 💗 think
┃ 💗 highfive
┃ 💗 feed
┃ 💗 wag
┃ 💗 bite
┃ 💗 teehee
┃ 💗 shocked
┃ 💗 bleh
┃ 💗 bored
┃ 💗 nom
┃ 💗 nya
┃ 💗 yawn
┃ 💗 facepalm
┃ 💗 cuddle
┃ 💗 kick
┃ 💗 happy
┃ 💗 carry
┃ 💗 hug
┃ 💗 kabedon
┃ 💗 baka
┃ º┃ 💗 bonk
┃ 💗 pat
┃ 💗 angry
┃ 💗 spin
┃ 💗 shake
┃ 💗 run
┃ 💗 nod
┃ 💗 nope
┃ 💗 kiss
┃ 💗 dance
┃ 💗 punch
┃ 💗 handshake
┃ 💗 slap
┃ 💗 cry
┃ 💗 lappillow
┃ º┃ 💗 pout
┃ 💗 blowkiss
┃ º┃ 💗 handhold
┃ 💗 salute
┃ 💗 thumbsup
┃ 💗 laugh
┃ 💗 tableflip
┃ º┃ 💗 kids
┃ 💗 cgrt
┃ 💗 roll
┃ 💗 coinflip
┃ º┃ 💗 flip
┃ 💗 pick
┃ 💗 shapar
┃ º┃ 💗 rate
┃ 💗 matrix
┃ 💗 fortune
┃ º┃ 💗 gravity
┃ 💗 echo
┃ º┃ 💗 galaxy
┃ 💗 ninja
┃ º┃ 💗 sparkle
┃ 💗 riddle
┃ º┃ 💗 mood
┃ 💗 countdown
┃ º┃ 💗 uniquemenu
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀᴜᴅɪ* 🌸 〕━━━━⬣
┃ 💗 tomp3
┃ 💗 toptt
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴄᴏᴜᴘʟᴇᴅᴘ* 🌸 〕━━━━⬣
┃ 💗 coupledp1 to coupledp22
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏْتʜᴇʀ* 🌸 〕━━━━⬣
┃ 💗 img
┃ 💗 img2
┃ 💗 gpass
┃ º┃ 💗 getpp
┃ 💗 mee
┃ 💗 srepo
┃ º┃ 💗 iqc
┃ 💗 trt
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏʟs* 🌸 〕━━━━⬣
┃ 💗 chumi
┃ 💗 loading
┃ º┃ 💗 cd
┃ 💗 wthr
┃ º┃ 💗 type
┃ 💗 spinner
┃ 💗 rocket
┃ º┃ 💗 clock
┃ 💗 fing
┃ º┃ 💗 happy
┃ 💗 heart
┃ º┃ 💗 angry
┃ 💗 sad
┃ º┃ 💗 shy
┃ 💗 moon
┃ º┃ 💗 confused
┃ 💗 nikal
┃ º┃ 💗 saveweb
┃ 💗 npm
┃ º┃ 💗 sticker
┃ 💗 attp
┃ º┃ 💗 tiny
┃ 💗 chai
┃ º┃ 💗 upscale1 to upscale16
┃ 💗 unblur
┃ º┃ 💗 blurface
┃ 💗 removebg
┃ º┃ 💗 removebg2
┃ 💗 remini
┃ º┃ 💗 enhance1 to enhance16
┃ 💗 colorize
┃ º┃ 💗 savecontact
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍᴀɪɴ* 🌸 〕━━━━⬣
┃ º┃ 💗 owner
┃ 💗 githubstalk
┃ º┃ 💗 alive
┃ 💗 menu
┃ º┃ 💗 ping
┃ 💗 repo
┃ º┃ 💗 bomber
┃ 💗 fetch
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *sᴏᴜɴᴅ* 🌸 〕━━━━⬣
┃ º┃ 💗 sound1 to sound16
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɢɪʀʟᴅᴘ* 🌸 〕━━━━⬣
┃ º┃ 💗 girldp1 to girldp22
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʜᴀᴄᴋ* 🌸 〕━━━━⬣
┃ º┃ 💗 hack
┃ 💗 mobilehack
┃ º┃ 💗 ighack
┃ 💗 fbhack
┃ º┃ 💗 fbihack
┃ 💗 snaphack
┃ º┃ 💗 happybirthday
┃ 💗 rain
┃ º┃ 💗 virus
┃ 💗 hackmenu
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʜᴀʏᴀ sᴏɴɢ* 🌸 〕━━━━⬣
┃ º┃ 💗 hayasong1 to hayasong10
┃ 💗 haya1 to haya10
┃ º┃ 💗 hsong1 to hsong10
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *sᴇᴛᴛɪɴɢs* 🌸 〕━━━━⬣
┃ º┃ 💗 welcome
┃ 💗 goodbye
┃ º┃ 💗 setwelcome
┃ º┃ 💗 setgoodbye
┃ º┃ 💗 antiedit
┃ º┃ 💗 editpath
┃ º┃ 💗 autoread
┃ º┃ 💗 antilink
┃ º┃ º┃ 💗 antidelete
┃ º┃ 💗 recording
┃ º┃ 💗 statusview
┃ º┃ 💗 autoreact
┃ º┃ 💗 anticall
┃ º┃ 💗 anticallmsg
┃ º┃ 💗 adminaction
┃ º┃ 💗 autotyping
┃ º┃ 💗 online
┃ º┃ 💗 mode
┃ º┃ 💗 prefix
┃ º┃ 💗 botname
┃ º┃ 💗 ownername
┃ º┃ 💗 ownernumber
┃ º┃ 💗 description
┃ º┃ 💗 botdp
┃ º┃ 💗 stickername
┃ º┃ 💗 delpath
┃ º┃ 💗 reactemojis
┃ º┃ 💗 owneremojis
┃ º┃ º┃ 💗 settings
┃ º┃ 💗 statusemoji
┃ º┃ 💗 statuslike
┃ º┃ 💗 banlist
┃ º┃ 💗 ban
┃ º┃ 💗 unban
┃ º┃ 💗 sudo
┃ º┃ 💗 delsudo
┃ º┃ 💗 listsudo
┃ º┃ 💗 antistatus
┃ º┃ 💗 setstatusreact
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍᴏْدᴇʀᴀᴛɪᴏْن* 🌸 〕━━━━⬣
┃ º┃ 💗 ban
┃ º┃ 💗 unban
┃ º┃ 💗 banlist
┃ º┃ 💗 sudo
┃ º┃ 💗 delsudo
┃ º┃ 💗 listsudo
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʀᴇᴀْدɪْنɢ* 🌸 〕━━━━⬣
┃ º┃ 💗 novel
┃ º┃ 💗 next
┃ º┃ 💗 back
┃ º┃ 💗 page
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *سᴇᴀʀᴄʜ* 🌸 〕━━━━⬣
┃ º┃ 💗 tiktokstalk
┃ º┃ 💗 xstalk
┃ º┃ 💗 yts
┃ º┃ 💗 ytstalk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴜɴʙᴀɴ* 🌸 〕━━━━⬣
┃ º┃ 💗 unban1 to unban48
┃ º┃ 💗 unbanlist
┃ º┃ 💗 unbanguide
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴠɪᴅᴇْᴏ* 🌸 〕━━━━⬣
┃ º┃ 💗 video1 to video25
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
            await sock.sendMessage(from, { text: 'Bot Owner: شہزاد زخمی\nContact: 923256326517' }, { quoted: m });
        }
        else if (command === 'work') {
            const taskText = args.join(" ");
            if (!taskText) {
                await sock.sendMessage(from, { text: '⚠️ براہ کرم اپنے کام کی تفصیل بھی لکھیں! مثال کے طور پر: *.work ویب سائٹ کی کوڈنگ ہو رہی ہے*' }, { quoted: m });
                return;
            }
            await sock.sendMessage(from, { text: `⚡ *شہزاد زخمی 007 - ورک سٹیٹس* ⚡\n\n📌 *موجودہ اہم کام:* \n${taskText}\n\n👤 *ذمہ دار:* شہزاد زخمی\n🟢 *سٹیٹس:* جاری ہے (In Progress)` }, { quoted: m });
        }
        else if (command === 'sticker' || command === 's' || command === 'testicker') {
            await sock.sendMessage(from, { text: '📸 براہ کرم تصویر کے ساتھ .sticker لکھ کر بھیجیں!' }, { quoted: m });
        }
        else if (command === 'vv' || command === 'vv2' || command === 'vv3') {
            await sock.sendMessage(from, { text: '👁️ ویو ونس (View Once) کمانڈ فعال ہے۔' }, { quoted: m });
        }
        else {
            await sock.sendMessage(from, { text: `⚡ کمانڈ [.${command}] فعال ہے۔` }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
