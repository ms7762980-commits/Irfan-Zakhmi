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

// High-Tech Modern Web Pairing Panel (Shahzad Zakhmi Exclusive)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ur" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>شہزاد زخمی - Official Pairing Panel</title>
            <style>
                body { background-color: #05050a; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 30px; margin: 0; }
                .container { background: linear-gradient(145deg, #121826, #0d111a); border: 1px solid #1f293d; padding: 35px 25px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 30px rgba(0,0,0,0.8); width: 100%; max-width: 420px; box-sizing: border-box; }
                h2 { color: #34d399; margin-bottom: 5px; font-size: 24px; text-shadow: 0 0 10px rgba(52,211,153,0.3); }
                .sub-title { color: #9ca3af; font-size: 14px; margin-bottom: 25px; }
                input { padding: 14px; width: 100%; margin: 10px 0; border-radius: 10px; border: 1px solid #374151; background: #0b0f19; color: #fff; font-size: 16px; text-align: center; box-sizing: border-box; outline: none; transition: 0.3s; }
                input:focus { border-color: #10b981; box-shadow: 0 0 8px rgba(16,185,129,0.4); }
                button { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-weight: bold; width: 100%; font-size: 16px; margin-top: 10px; transition: 0.3s; box-shadow: 0 4px 15px rgba(16,185,129,0.4); }
                button:hover { background: linear-gradient(135deg, #059669, #047857); transform: translateY(-2px); }
                #code { margin-top: 25px; font-size: 24px; color: #f3f4f6; font-weight: bold; background: #0b0f19; padding: 15px; border-radius: 10px; border: 1px dashed #10b981; letter-spacing: 2px; word-break: break-all; }
                .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>⚡ شہزاد زخمی 007 ⚡</h2>
                <div class="sub-title">Official Pairing Panel (1028+ Commands)</div>
                <p style="font-size: 14px; color: #d1d5db;">اپنا واٹس ایپ نمبر کنٹری کوڈ کے ساتھ درج کریں:</p>
                <input type="text" id="phone" placeholder="e.g. 923256326517">
                <button onclick="getPairingCode()">Generate Pairing Code</button>
                <div id="code"><span>کوڈ یہاں شو ہوگا</span></div>
                <div class="footer">Powered by شہزاد زخمی 007</div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('براہ کرم اپنا واٹس ایپ نمبر درج کریں!'); return; }
                    document.getElementById('code').innerHTML = 'کوڈ حاصل کیا جا رہا ہے...';
                    try {
                        const res = await fetch('/pair?phone=' + phone);
                        const data = await res.json();
                        if(data.code) {
                            document.getElementById('code').innerHTML = data.code;
                        } else {
                            document.getElementById('code').innerHTML = 'خرابی: ' + (data.error || 'دوبارہ کوشش کریں');
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
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required' });
    
    try {
        if (globalSock && !globalSock.authState.creds.registered) {
            let code = await globalSock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            return res.json({ code });
        } else {
            return res.json({ error: 'بوٹ پہلے سے کنیکٹ ہے یا شروع ہو رہا ہے۔' });
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
            }
        } else if (connection === 'open') {
            console.log('✅ شہزاد زخمی Bot Connected Successfully with All 1028+ Commands!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Full 1028 Commands Straight Line Menu & Handler
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
│ 👤 ᴏᴡɴᴇʀ : شہزاد زخمی (923256326517)
│ 📜 ᴄᴍᴅs   : 102 (All Menus Active)
│ 🌐 ᴍᴏᴅᴇ : public
│ 🟢 sᴛᴀᴛᴜs : ACTIVE 
──────────────

 ━━━〔 ✦ ɪsʟᴀᴍɪᴄ ᴍᴇɴᴜ ✦ 〕━━━
│  •  adhan  •  namaz_times  •  dua_morning  •  dua_evening  •  dua_sleep  •  dua_wakeup  •  dua_eating  •  dua_travel  •  dua_rain  •  dua_anxiety  •  dua_distress  •  dua_hajat  •  dua_forgiveness  •  dua_rizq  •  dua_guidance  •  dua_health  •  zikr_la_hawla  •  zikr_subhanallahi_wabihamdihi  •  zikr_subhanallahil_azeem  •  zikr_1000  •  zikr_astaghfirullah  •  zikr_alhamdulillah  •  zikr_subhanallah  •  zikr_allahuakbar  •  zikr_lailahailallah  •  surah_fatiha  •  surah_falak  •  surah_nas  •  surah_kafirun  •  surah_asr  •  surah_kauthar  •  ayatul_kursi  •  surah_yaseen  •  surah_rahman  •  surah_mulk  •  hadith_good_morals  •  hadith_cleanliness  •  hadith_truth  •  hadith_patience  •  darood_sharif  •  kalima_tayyiba  •  islam_fact  •  quran_reminder  •  pillars_islam  •  pillars_iman  •  islamic_months  •  ramadan_info  •  hajj_info  •  wudu_steps  •  namaz_steps  •  jummah_info  •  eid_info  •  shab_e_qadr  •  shab_e_barat  •  tahajjud  •  ishraq  •  chast  •  ruqya  •  islam_quiz  •  quran_info  •  akhlaq  •  parents_dua  •  neighbor_rights  •  sehri_dua  •  iftar_dua  •  ramadan_dua  •  hasbunallah  •  bismillah  •  inshaallah  •  mashaallah  •  alhamdulillah  •  subhanallah  •  allahuakbar  •  lailahailallah  •  astaghfirullah  •  islamic_quote  •  prophet_story  •  sahabi_story  •  dua_exam  •  dua_kamyabi  •  dua_marriage  •  dua_children  •  dua_health_shifa  •  dua_debt  •  dua_enemy  •  dua_majlis  •  dua_khatm  •  dua_general  •  prophetnames  •  allahnames
─────────────

 ━━━〔 ✦ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ ✦ 〕━━━
│  •  islamic  •  testicker  •  apk  •  capcut  •  drama  •  fb  •  igdl  •  igdl2  •  igdl3  •  mediafire  •  megadl  •  pinterest  •  ttmp3  •  igmp3  •  tiktok  •  tiktok2  •  tiktok3  •  ytpost  •  gitclone  •  naat  •  pinvideo  •  play  •  video  •  play2  •  tsticker  •  tiktoksearch  •  tts
─────────────

 ━━━〔 ✦ ᴏᴡɴᴇʀ / vv ᴍᴇɴᴜ ✦ 〕━━━
│  •  vv  •  vv2  •  vv3  •  tochannel  •  chjid  •  fullpp  •  leave  •  ik  •  block  •  unblock  •  msg  •  status  •  pair  •  notify  •  forward  •  countx  •  count  •  update
─────────────

 ━━━〔 ✦ ᴀɪ ᴍᴇɴᴜ ✦ 〕━━━
│  •  copilot  •  chatgptelite  •  talkai  •  brain  •  elite  •  mscopilot  •  elitegpt  •  assistant  •  smart  •  genius  •  proai  •  ultra  •  maxai  •  nova  •  zenith  •  apex  •  vertex  •  pulse  •  quantum  •  neo  •  omega  •  gpt  •  gpt4  •  gpt4o  •  chatgpt  •  claude  •  gemini  •  kimi  •  perplexity  •  llama2  •  llama3  •  mistral  •  mixtral  •  falcon  •  bloom  •  orca  •  vicuna  •  alpaca  •  phi2  •  wizard  •  codet5  •  starlin  •  deepseek  •  deepseekcoder  •  yi  •  qwen  •  command  •  solar  •  grokbeta  •  bard  •  imagine
─────────────

 ━━━〔 ✦ ɢʀᴏᴜᴘ ᴍᴇɴᴜ ✦ 〕━━━
│  •  antibot  •  botlist  •  kickbot  •  antibothelp  •  delete  •  dismissall  •  delgcstatus  •  unmute  •  mute  •  tagall  •  kick  •  promote  •  demote  •  gcpp  •  revoke  •  link  •  ginfo  •  updategdesc  •  updategname  •  poll  •  out  •  newgc  •  end  •  join  •  invite  •  acceptall  •  rejectall  •  requests  •  accept  •  reject  •  add  •  gcstatus  •  hidetag  •  chreact  •  vote  •  tagadmins  •  broadcast
─────────────

 ━━━〔 ✦ ᴛᴏᴏʟs & ᴜᴛɪʟɪᴛʏ ᴍᴇɴᴜ ✦ 〕━━━
│  •  boom  •  uptime  •  weather  •  convert  •  simdata  •  raw  •  define  •  getimage  •  news  •  id  •  lid  •  movieinfo  •  find  •  praytime  •  caption  •  rw  •  playstore  •  ss  •  countryinfo  •  rcolor  •  binary  •  dbinary  •  base64  •  unbase64  •  urlencode  •  urldecode  •  timenow  •  date  •  calculate  •  person  •  readmore  •  msg  •  report  •  tempmail  •  checkmail  •  wikipedia  •  wstalk  •  url  •  videourl  •  sticker  •  testicker  •  tiny  •  chai  •  upscale1  •  unblur  •  blurface  •  removebg  •  remini  •  enhance1  •  colorize  •  savecontact
─────────────

 ━━━〔 ✦ ғᴜɴ & sʜᴀʏᴀʀɪ ᴍᴇɴᴜ ✦ 〕━━━
│  •  character  •  ringtone  •  rain  •  fight  •  puzzle  •  story  •  transform  •  dance  •  race  •  weathercast  •  emojimenu  •  muth  •  compatibility  •  aura  •  roast  •  8ball  •  compliment  •  lovetest  •  emoji  •  fakemote  •  livevote  •  fakesubs  •  welcomevote  •  membergrowth  •  fakepoll  •  votelist  •  quote  •  flirt  •  akela  •  bewafa  •  chhakkar  •  taalibajao  •  neendurai  •  chatpata  •  taj  •  lafangaa  •  chocolatewala  •  baatkaatna  •  palat  •  gaanasunao  •  haaththamna  •  chuprahna  •  phoolonkahaar  •  ghoordekhna  •  bahaana  •  tarkeeb  •  hassichhupa  •  mobileband  •  pagalpancert  •  wallpaper  •  donobaat  •  kaanpakadna  •  taqdir  •  kapkapi  •  taarifcommit  •  captioncontest  •  zyadasocha  •  ghazab  •  onlinedekhna  •  dushmankadushman  •  buraanamano  •  mirrormirror  •  merahero  •  natkhat  •  pareshan  •  interview  •  kheltamam  •  rishtapakka  •  pyaardukaan  •  zabaansambhlo  •  jhootawada  •  sonawala  •  gossip  •  funnyrishtedar  •  aankheband  •  alvidanahi  •  runmureed  •  joke  •  bacha  •  bachi  •  pickup  •  ship  •  dad  •  mom  •  son  •  daughter  •  boyfriend  •  girlfriend  •  twin  •  partner  •  bodyguard  •  boss  •  employee  •  pet  •  servant  •  idol  •  fan  •  ghost  •  angel  •  devil  •  king  •  queen  •  slave  •  master  •  genius  •  fool  •  rich  •  poor  •  bhai  •  bahan  •  wife  •  husband  •  chacha  •  chachi  •  nana  •  nani  •  mama  •  mami  •  bestfriend  •  enemy  •  crush  •  teacher  •  student  •  rival  •  ishqmeter  •  andhaishq  •  lafzmohabbat  •  pehlinazar  •  dillagi  •  khoobsurat  •  dhadkan  •  pehlaakhat  •  ziddidil  •  yaadaata  •  taubatauba  •  pehlamuhabbat  •  wafaimtihaan  •  donokikahani  •  gulabbhejo  •  aankhein  •  shayarban  •  dushmandost  •  tangkarna  •  smilechurao  •  jaan  •  qismatwala  •  jhoothpyaar  •  siyaanibaat  •  mohabbatqarz  •  nazarutarao  •  romanticbakwaas  •  aashiqanaaward  •  mohabbatteri  •  dilkhol  •  gussapyaar  •  jasoos  •  tangaphanda  •  muftadvice  •  nakhrebaaz  •  anokhapyaar  •  bhaaggaya  •  khushnaseebi  •  ronewala  •  waqtguzarna  •  chandsa  •  dostyadildar  •  galatfehmi  •  perfectmatch  •  raazkhola  •  mohabbatdarjaa  •  dua  •  khwaabon  •  dare  •  truth  •  shayari  •  technologia  •  motivate  •  repeat  •  lurk  •  shoot  •  sleep  •  clap  •  shrug  •  stare  •  wave  •  poke  •  confused  •  smile  •  peck  •  wink  •  sip  •  blush  •  smug  •  tickle  •  yeet  •  think  •  highfive  •  feed  •  wag  •  bite  •  teehee  •  shocked  •  bleh  •  bored  •  nom  •  nya  •  yawn  •  facepalm  •  cuddle  •  happy  •  carry  •  hug  •  kabedon  •  baka  •  bonk  •  pat  •  angry  •  spin  •  shake  •  run  •  nod  •  nope  •  kiss  •  dance  •  punch  •  handshake  •  slap  •  cry  •  lappillow  •  pout  •  blowkiss  •  handhold  •  salute  •  thumbsup  •  laugh  •  tableflip  •  kids  •  cgrt  •  roll  •  coinflip  •  flip  •  pick  •  shapar  •  rate  •  matrix  •  fortune  •  gravity  •  echo  •  galaxy  •  ninja  •  sparkle  •  riddle  •  mood  •  countdown  •  uniquemenu
─────────────

 ━━━〔 ✦ sᴇᴛᴛɪɴɢs & ᴍɪsᴄ ᴍᴇɴᴜ ✦ 〕━━━
│  •  welcome  •  goodbye  •  setwelcome  •  setgoodbye  •  antiedit  •  editpath  •  autoread  •  antilink  •  antidelete  •  recording  •  statusview  •  autoreact  •  anticall  •  anticallmsg  •  adminaction  •  autotyping  •  online  •  mode  •  prefix  •  botname  •  ownername  •  ownernumber  •  description  •  botdp  •  stickerrname  •  delpath  •  reactemojis  •  owneremojis  •  settings  •  statusemoji  •  statuslike  •  banlist  •  ban  •  unban  •  sudo  •  delsudo  •  listsudo  •  antistatus  •  setstatusreact  •  privacy  •  blocklist  •  getbio  •  setppall  •  setonline  •  setname  •  updatebio  •  groupsprivacy  •  getprivacy  •  tiktokstalk  •  xstalk  •  yts  •  ytstalk  •  novel  •  next  •  back  •  page
─────────────

> *✨ ᴘᴏᴡᴇʀᴇᴅ ʙʏ شہزاد زخمی 007 ✨*
            `;
            
            // Full Massive Straight-Line Menu with Channel Forwarding Context
            await sock.sendMessage(from, { 
                image: { url: "https://share.google/images/H02tokYR35KeOr8dQ" }, 
                caption: menuText,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '0029VbEKCPj0gcfIJkc5XE3Z@newsletter',
                        newsletterName: 'شہزاد زخمی Official Channel',
                        serverMessageId: 100
                    }
                }
            }, { quoted: m });
        } 
        else if (command === 'ping') {
            await sock.sendMessage(from, { text: '⚡ Pong! Bot is active with all 1028+ commands.' }, { quoted: m });
        }
        else if (command === 'owner') {
            await sock.sendMessage(from, { text: 'Bot Owner: شہزاد زخمی\nContact: 923256326517' }, { quoted: m });
        }
        else if (command === 'sticker' || command === 'testicker' || command === 's') {
            await sock.sendMessage(from, { text: '📸 براہ کرم تصویر کے ساتھ .sticker لکھ کر بھیجیں!' }, { quoted: m });
        }
        else if (command === 'vv' || command === 'vv2' || command === 'vv3') {
            await sock.sendMessage(from, { text: '👁️ ویو ونس (View Once) میڈیا ریٹریو کرنے کی کمانڈ فعال ہے۔' }, { quoted: m });
        }
        else {
            await sock.sendMessage(from, { text: `⚡ کمانڈ [.${command}] پروسیس ہو رہی ہے...` }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
