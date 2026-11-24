const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

let globalSock = null;

global.requestPairCode = async function(phoneNumber) {
    if (!globalSock) return null;
    if (globalSock.authState.creds.registered) return null;
    let code = await globalSock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
    return code?.match(/.{1,4}/g)?.join("-") || code;
}

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

    // Command & Menu Handler with 500+ Commands
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
┃ 💗 gpt
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
┃ 💗 updategname
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
┃ º┃ 💗 rw
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
┃ 💗 weathercast
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
┃ 💗 onlinedekhna
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
┃ 💗 nani
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
┃ º┃ 💗 ziddidil
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
┃ 💗 aashiqanaward
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
┃ 💗 raazkhola
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
┃ 💗 smug
┃ 💗 tickle
┃ 💗 yeet
┃ 💗 think
┃ 💗 highfive
┃ º┃ 💗 feed
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
┃ 💗 bonk
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
┃ 💗 pout
┃ 💗 blowkiss
┃ 💗 handhold
┃ 💗 salute
┃ 💗 thumbsup
┃ 💗 laugh
┃ 💗 tableflip
┃ 💗 kids
┃ 💗 cgrt
┃ 💗 roll
┃ 💗 coinflip
┃ 💗 flip
┃ 💗 pick
┃ 💗 shapar
┃ 💗 rate
┃ 💗 matrix
┃ 💗 fortune
┃ 💗 gravity
┃ 💗 echo
┃ 💗 galaxy
┃ 💗 ninja
┃ 💗 sparkle
┃ 💗 riddle
┃ 💗 mood
┃ 💗 countdown
┃ 💗 uniquemenu
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
┃ 💗 getpp
┃ 💗 mee
┃ 💗 srepo
┃ 💗 iqc
┃ 💗 trt
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴛᴏᴏls* 🌸 〕━━━━⬣
┃ 💗 chumi
┃ 💗 loading
┃ 💗 cd
┃ 💗 wthr
┃ 💗 type
┃ 💗 spinner
┃ 💗 rocket
┃ 💗 clock
┃ 💗 fing
┃ 💗 happy
┃ 💗 heart
┃ 💗 angry
┃ 💗 sad
┃ 💗 shy
┃ 💗 moon
┃ 💗 confused
┃ 💗 nikal
┃ 💗 saveweb
┃ 💗 npm
┃ 💗 sticker
┃ 💗 attp
┃ 💗 tiny
┃ 💗 chai
┃ 💗 upscale1 to upscale16
┃ 💗 unblur
┃ 💗 blurface
┃ 💗 removebg
┃ 💗 removebg2
┃ 💗 remini
┃ 💗 enhance1 to enhance16
┃ 💗 colorize
┃ 💗 savecontact
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍᴀɪɴ* 🌸 〕━━━━⬣
┃ 💗 owner
┃ 💗 githubstalk
┃ 💗 alive
┃ 💗 menu
┃ 💗 ping
┃ 💗 repo
┃ 💗 bomber
┃ 💗 fetch
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *sᴏᴜɴᴅ* 🌸 〕━━━━⬣
┃ 💗 sound1 to sound16
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ɢɪʀʟᴅᴘ* 🌸 〕━━━━⬣
┃ 💗 girldp1 to girldp22
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʜᴀᴄᴋ* 🌸 〕━━━━⬣
┃ 💗 hack
┃ 💗 mobilehack
┃ 💗 ighack
┃ 💗 fbhack
┃ 💗 fbihack
┃ 💗 snaphack
┃ 💗 happybirthday
┃ 💗 rain
┃ 💗 virus
┃ 💗 hackmenu
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʜᴀʏᴀ sᴏɴɢ* 🌸 〕━━━━⬣
┃ 💗 hayasong1 to hayasong10
┃ 💗 haya1 to haya10
┃ º┃ 💗 hsong1 to hsong10
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *sᴇᴛᴛɪɴɢs* 🌸 〕━━━━⬣
┃ 💗 welcome
┃ 💗 goodbye
┃ 💗 setwelcome
┃ 💗 setgoodbye
┃ 💗 antiedit
┃ 💗 editpath
┃ 💗 autoread
┃ 💗 antilink
┃ 💗 antidelete
┃ 💗 recording
┃ 💗 statusview
┃ 💗 autoreact
┃ 💗 anticall
┃ 💗 anticallmsg
┃ 💗 adminaction
┃ 💗 autotyping
┃ º┃ 💗 online
┃ 💗 mode
┃ 💗 prefix
┃ 💗 botname
┃ 💗 ownername
┃ 💗 ownernumber
┃ 💗 description
┃ 💗 botdp
┃ 💗 stickername
┃ 💗 delpath
┃ 💗 reactemojis
┃ 💗 owneremojis
┃ 💗 settings
┃ 💗 statusemoji
┃ 💗 statuslike
┃ 💗 banlist
┃ 💗 ban
┃ 💗 unban
┃ º┃ 💗 sudo
┃ 💗 delsudo
┃ 💗 listsudo
┃ 💗 antistatus
┃ 💗 setstatusreact
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴍᴏْدᴇʀᴀᴛɪᴏْن* 🌸 〕━━━━⬣
┃ 💗 ban
┃ 💗 unban
┃ 💗 banlist
┃ 💗 sudo
┃ 💗 delsudo
┃ 💗 listsudo
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ʀᴇᴀْدɪْنɢ* 🌸 〕━━━━⬣
┃ 💗 novel
┃ 💗 next
┃ 💗 back
┃ 💗 page
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *سᴇᴀʀᴄʜ* 🌸 〕━━━━⬣
┃ 💗 tiktokstalk
┃ 💗 xstalk
┃ 💗 yts
┃ 💗 ytstalk
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴜɴʙᴀɴ* 🌸 〕━━━━⬣
┃ 💗 unban1 to unban48
┃ 💗 unbanlist
┃ 💗 unbanguide
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━━〔 🌸 *ᴠɪᴅᴇْᴏ* 🌸 〕━━━━⬣
┃ 💗 video1 to video25
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

module.exports = { startBot };
