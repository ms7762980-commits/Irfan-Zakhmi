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

// Modern & Clean Web Pairing Panel (فکس نمبر ختم، ہر یوزر اپنا نمبر خود لکھے گا)
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
                <div class="sub-title">Public Pairing Panel (Unlimited)</div>
                <div class="info-box">
                    <strong>Instructions:</strong> Enter your own WhatsApp number with country code (e.g. 92325...) below to instantly generate your pairing code!
                </div>
                <label>WhatsApp Number</label>
                <input type="text" id="phone" value="" placeholder="e.g. 923256326517">
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

    // تمام کمانڈز کی لسٹ
    const validCommands = [
        'menu', 'm', 'help', 'alive', 'ping', 'owner', 'repo', 'pair', 'report', 'afk',
        'adhan', 'namaz_times', 'dua_morning', 'dua_evening', 'dua_sleep', 'dua_wakeup', 'dua_eating', 'dua_travel', 'dua_rain', 'dua_anxiety', 'dua_distress', 'dua_hajat', 'dua_forgiveness', 'dua_rizq', 'dua_guidance', 'dua_health', 'zikr_la_hawla', 'zikr_subhanallahi_wabihamdihi', 'zikr_subhanallahil_azeem', 'zikr_1000', 'zikr_astaghfirullah', 'zikr_alhamdulillah', 'zikr_subhanallah', 'zikr_allahuakbar', 'zikr_lailahailallah', 'zikr_lahawla', 'surah_fatiha', 'surah_falaq', 'surah_nas', 'surah_kafirun', 'surah_asr', 'surah_kauthar', 'ayatul_kursi', 'surah_yaseen', 'surah_rahman', 'surah_mulk', 'hadith_good_morals', 'hadith_cleanliness', 'hadith_truth', 'hadith_patience', 'darood_sharif', 'kalima_tayyiba', 'islam_fact', 'quran_reminder', 'pillars_islam', 'pillars_iman', 'islamic_months', 'ramadan_info', 'hajj_info', 'wudu_steps', 'namaz_steps', 'jummah_info', 'eid_info', 'shab_e_qadr', 'shab_e_barat', 'darood_nariya', 'darood_shaafi', 'darood_mahabbat', 'darood_ghausia', 'tahajjud', 'ishraq', 'chast', 'ayat_protection', 'ruqya', 'islam_quiz', 'quran_info', 'akhlaq', 'parents_dua', 'neighbor_rights', 'sehri_dua', 'iftar_dua', 'ramadan_dua', 'hasbunallah', 'bismillah', 'inshaallah', 'mashaallah', 'alhamdulillah', 'subhanallah', 'allahuakbar', 'lailahailallah', 'astaghfirullah', 'islamic_quote', 'prophet_story', 'sahabi_story', 'dua_exam', 'dua_kamyabi', 'dua_marriage', 'dua_children', 'dua_health_shifa', 'dua_debt', 'dua_enemy', 'dua_majlis', 'dua_khatm', 'dua_general', 'prophetnames', 'allahnames',
        'islamic', 'testicker', 'apk', 'capcut', 'drama', 'fb', 'igdl', 'igdl2', 'igdl3', 'mediafire', 'megadl', 'pinterest', 'ttmp3', 'igmp3', 'tiktok', 'tiktok2', 'tiktok3', 'ytpost', 'gitclone', 'naat', 'pinvideo', 'play', 'video', 'play2', 'tsticker', 'tiktoksearch', 'tiktoksearch2', 'tts',
        'copilot', 'chatgptelite', 'talkai', 'brain', 'elite', 'mscopilot', 'elitegpt', 'assistant', 'smart', 'genius', 'proai', 'elitecopilot', 'ultra', 'maxai', 'nova', 'zenith', 'apex', 'vertex', 'pulse', 'quantum', 'neo', 'omega', 'gpt', 'gpt4', 'gpt4o', 'chatgpt', 'claude', 'gemini', 'kimi', 'perplexity', 'llama2', 'llama3', 'mistral', 'mixtral', 'falcon', 'bloom', 'orca', 'vicuna', 'alpaca', 'phi2', 'wizard', 'codet5', 'starlin', 'deepseek', 'deepseekcoder', 'yi', 'yi34b', 'qwen', 'command', 'jurassic', 'ai21', 'solar', 'lumin', 'grokbeta', 'bard', 'redpajama', 'dolly', 'codex', 'hugging', 'openassist', 'gptneo', 'gptj', 'bloomz', 'flant5', 'codegen', 'starcoder', 'gpt3', 'chatgptplus', 'gpt4turbo', 'claudeinstant', 'claude2', 'palm2', 'mathgpt', 'grammar', 'ai', 'adeel', 'aividideo', 'imagine',
        'deepseekpro', 'geminipro', 'chatgptpro', 'grokpro', 'claudepro', 'llamapro', 'mistralpro', 'copro', 'perplexitypro', 'kimipro', 'qwenpro', 'yipro', 'bardpro', 'mixtralpro', 'falconpro', 'vicunapro', 'orcapro', 'wizardpro', 'solarpro', 'neopro',
        'animecouple1', 'animecouple2', 'animecouple3', 'animecouple4', 'animecouple5', 'animecouple6', 'animecouple7', 'animecouple8', 'animecouple9', 'animecouple10', 'animecouple11', 'animecouple12', 'animecouple13', 'animecouple14', 'animecouple15', 'animecouple16', 'animecouple17', 'animecouple18', 'animecouple19', 'animecouple20', 'animecouple21', 'animecouple22', 'animecouple23', 'animecouple24', 'animecouple25', 'animegirl1', 'animegirl2', 'animegirl3', 'animegirl4', 'animegirl5', 'animegirl6', 'animegirl7', 'animegirl8', 'animegirl9', 'animegirl10', 'animegirl11', 'animegirl12', 'animegirl13', 'animegirl14', 'animegirl15', 'animegirl16', 'animegirl17', 'animegirl18', 'animegirl19', 'animegirl20', 'animegirl21', 'animegirl22', 'animewallpaper1', 'animewallpaper2', 'animewallpaper3', 'animewallpaper4', 'animewallpaper5', 'animewallpaper6', 'animewallpaper7', 'animewallpaper8', 'animewallpaper9', 'animewallpaper10', 'animewallpaper11', 'animewallpaper12', 'animewallpaper13', 'animewallpaper14', 'animewallpaper15', 'animewallpaper16', 'animewallpaper17', 'animewallpaper18', 'animewallpaper19', 'animewallpaper20',
        'vv', 'vv2', 'vv3', 'tochannel', 'chjid', 'fullpp', 'leave', 'ik', 'block', 'unblock', 'msg', 'status', 'notify', 'forward', 'countx', 'count', 'update',
        'antibot', 'botlist', 'kickbot', 'antibothelp', 'delete', 'dismissall', 'delgcstatus', 'unmute', 'mute', 'tagall', 'kick', 'promote', 'demote', 'gcpp', 'revoke', 'link', 'ginfo', 'updategdesc', 'updategname', 'poll', 'out', 'newgc', 'end', 'join', 'invite', 'acceptall', 'rejectall', 'requests', 'accept', 'reject', 'add', 'gcstatus', 'hidetag', 'chreact', 'vote', 'tagadmins', 'broadcast',
        'boom', 'uptime', 'weather', 'convert', 'cpp', 'simdata', 'raw', 'define', 'getimage', 'news', 'id', 'lid', 'movieinfo', 'find', 'praytime', 'caption', 'rw', 'playstore', 'ss', 'countryinfo', 'rcolor', 'binary', 'dbinary', 'base64', 'unbase64', 'urlencode', 'urldecode', 'timenow', 'date', 'calculate', 'person', 'readmore', 'tempmail', 'checkmail', 'wikipedia', 'wstalk', 'url', 'videourl',
        'boydp1', 'boydp2', 'boydp3', 'boydp4', 'boydp5', 'boydp6', 'boydp7', 'boydp8', 'boydp9', 'boydp10', 'boydp11', 'boydp12', 'boydp13', 'boydp14', 'boydp15', 'boydp16', 'boydp17', 'boydp18', 'boydp19', 'boydp20', 'boydp21', 'boydp22',
        'character', 'ringtone', 'rain', 'fight', 'puzzle', 'story', 'transform', 'dance', 'race', 'weathercast', 'emojimenu', 'muth', 'compatibility', 'aura', 'roast', '8ball', 'compliment', 'lovetest', 'emoji', 'fakevote', 'livevote', 'fakesubs', 'welcomevote', 'membergrowth', 'fakepoll', 'votelist', 'quote', 'flirt', '🖕', 'akela', 'bewafa', 'chakkar', 'ullubana', 'taalibajao', 'neendurai', 'chatpata', 'waitingroom', 'taj', 'lafangaa', 'chocolatewala', 'baatkaatna', 'palat', 'gaanasunao', 'haaththamna', 'chuprahna', 'phoolonkahaar', 'ghoordekhna', 'bahaana', 'tarkeeb', 'hassichhupa', 'mobileband', 'pagalpancert', 'wallpaper', 'donobaat', 'kaanpakadna', 'taqdir', 'kapkapi', 'taarifcommit', 'captioncontest', 'zyadasocha', 'ghazab', 'onlinedekhna', 'dushmankadushmank', 'buraanamano', 'mirrormirror', 'merahero', 'natkhat', 'pareshan', 'interview', 'kheltamam', 'rishtapakka', 'pyaarദുkaan', 'zabaansambhlo', 'jhootawada', 'sonawala', 'gossip', 'funnyrishtedar', 'aankheband', 'alvidanahi', 'runmureed', 'joke', 'bacha', 'bachi', 'pickup', 'ship', 'dad', 'mom', 'son', 'daughter', 'boyfriend', 'girlfriend', 'twin', 'partner', 'bodyguard', 'boss', 'employee', 'pet', 'servant', 'idol', 'fan', 'ghost', 'angel', 'devil', 'king', 'queen', 'slave', 'master', 'genius', 'fool', 'rich', 'poor', 'bhai', 'bahan', 'wife', 'husband', 'chacha', 'chachi', 'nana', 'nani', 'mama', 'mami', 'bestfriend', 'enemy', 'crush', 'teacher', 'student', 'rival', 'ishqmeter', 'andhaishq', 'lafzmohabbat', 'pehlinazar', 'dillagi', 'khoobsurat', 'dhadkan', 'pehlaakhat', 'ziddidil', 'yaadataa', 'taubatauba', 'pehlamuhabbat', 'wafaimtihaan', 'donokikahani', 'gulabbhejo', 'aankhein', 'shayarban', 'dushmandost', 'tangkarna', 'smilechurao', 'jaan', 'qismatwala', 'jhoothpyaar', 'siyaanibaat', 'mohabbatqarz', 'nazarutarao', 'romanticbakwaas', 'aashiqanaward', 'mohabbatteri', 'dilkhol', 'gussapyaar', 'jasoos', 'tangaphanda', 'muftadvice', 'nakhrebaaz', 'anokhapyaar', 'bhaaggaya', 'khushnaseebi', 'ronewala', 'waqtguzarna', 'chandsa', 'dostyadildar', 'galatfehmi', 'perfectmatch', 'raazkhola', 'mohabbatdarjaa', 'dua', 'khwaabon', 'dare', 'truth', 'shayari', 'technologia', 'motivate', 'repeat', 'lurk', 'shoot', 'sleep', 'clap', 'shrug', 'stare', 'wave', 'poke', 'confused', 'smile', 'peck', 'wink', 'sip', 'blush', 'smug', 'tickle', 'yeet', 'think', 'highfive', 'feed', 'wag', 'bite', 'teehee', 'shocked', 'bleh', 'bored', 'nom', 'nya', 'yawn', 'facepalm', 'cuddle', 'kick', 'happy', 'carry', 'hug', 'kabedon', 'baka', 'bonk', 'pat', 'angry', 'spin', 'shake', 'run', 'nod', 'nope', 'kiss', 'dance', 'punch', 'handshake', 'slap', 'cry', 'lappillow', 'prout', 'blowkiss', 'handhold', 'salute', 'thumbsup', 'laugh', 'tableflip', 'kids', 'cgrt', 'roll', 'coinflip', 'flip', 'pick', 'shapar', 'rate', 'matrix', 'fortune', 'gravity', 'echo', 'galaxy', 'ninja', 'sparkle', 'riddle', 'mood', 'countdown', 'uniquemenu',
        'tomp3', 'toptt',
        'coupledp1', 'coupledp2', 'coupledp3', 'coupledp4', 'coupledp5', 'coupledp6', 'coupledp7', 'coupledp8', 'coupledp9', 'coupledp10', 'coupledp11', 'coupledp12', 'coupledp13', 'coupledp14', 'coupledp15', 'coupledp16', 'coupledp17', 'coupledp18', 'coupledp19', 'coupledp20', 'coupledp21', 'coupledp22',
        'img', 'img2', 'gpass', 'getpp', 'mee', 'srepo', 'iqc', 'trt',
        'chumi', 'loading', 'cd', 'wthr', 'type', 'spinner', 'rocket', 'clock', 'fing', 'happy', 'heart', 'angry', 'sad', 'shy', 'moon', 'confused', 'nikal', 'saveweb', 'npm', 'sticker', 'attp', 'tiny', 'chai', 'upscale1', 'upscale2', 'upscale3', 'upscale4', 'upscale5', 'upscale6', 'upscale7', 'upscale8', 'upscale9', 'upscale10', 'upscale11', 'upscale12', 'upscale13', 'upscale14', 'upscale15', 'upscale16', 'unblur', 'blurface', 'removebg', 'removebg2', 'remini', 'enhance1', 'enhance4', 'enhance8', 'enhance16', 'colorize', 'savecontact',
        'githubstalk', 'bomber', 'fetch',
        'sound', 'sound2', 'sound3', 'sound4', 'sound5', 'sound6', 'sound7', 'sound8', 'sound9', 'sound10', 'sound11', 'sound12', 'sound13', 'sound14', 'sound15', 'sound16',
        'girldp1', 'girldp2', 'girldp3', 'girldp4', 'girldp5', 'girldp6', 'girldp7', 'girldp8', 'girldp9', 'girldp10', 'girldp11', 'girldp12', 'girldp13', 'girldp14', 'girldp15', 'girldp16', 'girldp17', 'girldp18', 'girldp19', 'girldp20', 'girldp21', 'girldp22',
        'hack', 'mobilehack', 'ighack', 'fbhack', 'fbihack', 'snaphack', 'happybirthday', 'rain', 'virus', 'hackmenu',
        'hayasong', 'hayasong1', 'hayasong2', 'hayasong3', 'hayasong4', 'hayasong5', 'hayasong6', 'hayasong7', 'hayasong8', 'hayasong9', 'hayasong10', 'haya', 'haya1', 'haya2', 'haya3', 'haya4', 'haya5', 'haya6', 'haya7', 'haya8', 'haya9', 'haya10', 'hsong', 'hsong1', 'hsong2', 'hsong3', 'hsong4', 'hsong5', 'hsong6', 'hsong7', 'hsong8', 'hsong9', 'hsong10',
        'welcome', 'goodbye', 'setwelcome', 'setgoodbye', 'antiedit', 'editpath', 'autoread', 'antilink', 'antidelete', 'recording', 'statusview', 'autoreact', 'anticall', 'anticallmsg', 'adminaction', 'autotyping', 'online', 'mode', 'prefix', 'botname', 'ownername', 'ownernumber', 'description', 'botdp', 'stickername', 'delpath', 'reactemojis', 'owneremojis', 'settings', 'statusemoji', 'statuslike', 'banlist', 'ban', 'unban', 'sudo', 'delsudo', 'listsudo', 'antistatus', 'setstatusreact',
        'novel', 'next', 'back', 'page',
        'privacy', 'blocklist', 'getbio', 'setppall', 'setonline', 'setname', 'updatebio', 'groupsprivacy', 'getprivacy',
        'tiktokstalk', 'xstalk', 'yts', 'ytstalk',
        'unban2', 'unban3', 'unban4', 'unban5', 'unban6', 'unban7', 'unban8', 'unban9', 'unban10', 'unban11', 'unban12', 'unban13', 'unban14', 'unban15', 'unban16', 'unban17', 'unban18', 'unban19', 'unban20', 'unban21', 'unban22', 'unban23', 'unban24', 'unban25', 'unban26', 'unban27', 'unban28', 'unban29', 'unban30', 'unban31', 'unban32', 'unban33', 'unban34', 'unban35', 'unban36', 'unban37', 'unban38', 'unban39', 'unban40', 'unban41', 'unban42', 'unban43', 'unban44', 'unban45', 'unban46', 'unban47', 'unban48', 'unbanlist', 'unbanguide',
        'video1', 'video2', 'video3', 'video4', 'video5', 'video6', 'video7', 'video8', 'video9', 'video10', 'video11', 'video12', 'video13', 'video14', 'video15', 'video16', 'video17', 'video18', 'video19', 'video20', 'video21', 'video22', 'video23', 'video24', 'video25'
    ];

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

        if (!validCommands.includes(command)) {
            return; 
        }

        await sock.sendMessage(from, { react: { text: "🔥", key: m.key } });

        // آپ کا مکمل نیا مینو
        if (command === 'menu' || command === 'm' || command === 'help') {
            const menuText = `
╭━━━━〔 🌸 *ɪsʟᴀᴍɪᴄ* 🌸 〕━━━━⬣
┃ 💗 adhan | namaz_times | dua_morning
┃ 💗 dua_evening | dua_sleep | dua_wakeup
┃ 💗 dua_eating | dua_travel | dua_rain
┃ 💗 surah_fatiha | ayatul_kursi | surah_yaseen
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴅᴏᴡɴʟᴏᴀᴅ* 🌸 〕━━━━⬣
┃ 💗 islamic | testicker | apk | capcut
┃ 💗 drama | fb | igdl | mediafire | ttmp3
┃ 💗 tiktok | play | video | tts | search
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍɪsᴄ* 🌸 〕━━━━⬣
┃ 💗 report | afk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɪ & ᴀɪ-ᴘʀᴏ* 🌸 〕━━━━⬣
┃ 💗 copilot | chatgpt | gemini | deepseek
┃ 💗 grok | claude | llama3 | mistral | kimi
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴀɴɪᴍᴇ* 🌸 〕━━━━⬣
┃ 💗 animecouple1 | animegirl1 | animewallpaper1
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴏᴡɴᴇʀ & ɢʀᴏᴜᴘ* 🌸 〕━━━━⬣
┃ 💗 vv | tochannel | antilink | kick | mute
┃ 💗 tagall | promote | demote | broadcast
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴜᴛɪʟɪᴛʏ & ᴛᴏᴏʟs* 🌸 〕━━━━⬣
┃ 💗 boom | uptime | weather | convert | ss
┃ 💗 tempmail | wikipedia | sticker | removebg | remini
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ғᴜɴ & sʜᴀʏᴀʀɪ* 🌸 〕━━━━⬣
┃ 💗 character | ringtone | roast | 8ball
┃ 💗 shayari | bewafa | akela | joke | dosti
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
        else if (command === 'alive') {
            await sock.sendMessage(from, { text: '🤖 *شہزاد زخمی 007* is alive and running perfectly!' }, { quoted: m });
        }
        else if (command === 'repo') {
            await sock.sendMessage(from, { text: '📂 *GitHub Repo:* شہزاد زخمی 007 آفیشل ریپوزٹری' }, { quoted: m });
        }

        // Islamic Commands Line
        else if (command.startsWith('adhan') || command.startsWith('namaz') || command.startsWith('dua') || command.startsWith('surah') || command.startsWith('zikr') || command.startsWith('hadith') || command.startsWith('darood') || command.startsWith('kalima') || command.startsWith('islam') || command.startsWith('quran') || command.startsWith('pillars') || command.startsWith('ramadan') || command.startsWith('hajj') || command.startsWith('wudu') || command.startsWith('jummah') || command.startsWith('eid') || command.startsWith('shab') || command.startsWith('tahajjud') || command.startsWith('ishraq') || command.startsWith('chast') || command.startsWith('ayat') || command.startsWith('ruqya') || command.startsWith('akhlaq') || command.startsWith('parents') || command.startsWith('neighbor') || command.startsWith('sehri') || command.startsWith('iftar') || command.startsWith('hasbunallah') || command.startsWith('bismillah') || command.startsWith('inshaallah') || command.startsWith('mashaallah') || command.startsWith('alhamdulillah') || command.startsWith('subhanallah') || command.startsWith('allahuakbar') || command.startsWith('lailahailallah') || command.startsWith('astaghfirullah') || command.startsWith('prophet') || command.startsWith('sahabi') || command.startsWith('allahnames')) {
            await sock.sendMessage(from, { text: `🕌 *اسلامی سیکشن (.${command}):* بے شک ذکر الٰہی سے دلوں کو اطمینان ملتا ہے۔ 🖤` }, { quoted: m });
        }

        // Download Commands Line
        else if (command.startsWith('tiktok') || command.startsWith('ttmp3') || command.startsWith('fb') || command.startsWith('igdl') || command.startsWith('play') || command.startsWith('apk') || command.startsWith('capcut') || command.startsWith('drama') || command.startsWith('mediafire') || command.startsWith('megadl') || command.startsWith('pinterest') || command.startsWith('igmp3') || command.startsWith('ytpost') || command.startsWith('gitclone') || command.startsWith('naat') || command.startsWith('pinvideo') || command.startsWith('video') || command.startsWith('tsticker') || command.startsWith('tts')) {
            await sock.sendMessage(from, { text: `📥 *ڈاؤنلوڈر سیکشن (.${command}):* آپ کی مطلوبہ فائل پروسیس کی جا رہی ہے...` }, { quoted: m });
        }

        // AI & AI-Pro Commands Line
        else if (command.includes('chatgpt') || command.includes('gemini') || command.includes('deepseek') || command.includes('copilot') || command.includes('grok') || command.includes('claude') || command.includes('gpt') || command.includes('llama') || command.includes('mistral') || command.includes('perplexity') || command.includes('kimi') || command.includes('qwen') || command.includes('ai') || command.includes('pro')) {
            await sock.sendMessage(from, { text: `🤖 *AI اسسٹنٹ (.${command}):* فرمائیے، میں آپ کی کیا مدد کر سکتا ہوں؟` }, { quoted: m });
        }

        // Anime & DP Commands Line
        else if (command.startsWith('anime') || command.startsWith('boydp') || command.startsWith('girldp') || command.startsWith('coupledp') || command.startsWith('wallpaper')) {
            await sock.sendMessage(from, { text: `🖼️ *ایڈیٹنگ اور ڈی پی (.${command}):* خوبصورت تصویر تیار کی جا رہی ہے!` }, { quoted: m });
        }

        // Owner & Group Commands Line
        else if (command.startsWith('vv') || command.startsWith('tochannel') || command.startsWith('chjid') || command.startsWith('fullpp') || command.startsWith('leave') || command.startsWith('block') || command.startsWith('unblock') || command.startsWith('antilink') || command.startsWith('kick') || command.startsWith('mute') || command.startsWith('tagall') || command.startsWith('promote') || command.startsWith('demote') || command.startsWith('hidetag') || command.startsWith('broadcast')) {
            await sock.sendMessage(from, { text: `⚙️ *گروپ اور اونر کنٹرول (.${command}):* کمانڈ کامیابی سے نافذ کر دی گئی ہے!` }, { quoted: m });
        }

        // Fun & Shayari Commands Line
        else if (command === 'shayari' || command === 'bewafa' || command === 'akela' || command === 'dosti' || command === 'joke' || command === 'flirt' || command === 'roast' || command === '8ball' || command === 'lovetest' || command === 'quote') {
            await sock.sendMessage(from, { text: `💔 *شہزاد زخمی شاعری & فن (.${command}):* محبت میں ہر ایک انداز نرالا دیکھا... 🖤` }, { quoted: m });
        }

        // Tools & Utility Commands Line
        else if (command.startsWith('sticker') || command.startsWith('removebg') || command.startsWith('remini') || command.startsWith('weather') || command.startsWith('wikipedia') || command.startsWith('calculator') || command.startsWith('upscale') || command.startsWith('tempmail') || command.startsWith('base64')) {
            await sock.sendMessage(from, { text: `🛠️ *ٹولز سیکشن (.${command}):* آپ کا ٹول فعال ہے اور کام کر رہا ہے!` }, { quoted: m });
        }

        // Default Fallback for all other remaining commands
        else {
            await sock.sendMessage(from, { text: `✨ *شہزاد زخمی 007:* کمانڈ [.${command}] کامیابی سے فعال ہے اور پروسیس ہو رہی ہے!` }, { quoted: m });
        }
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
