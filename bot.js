/**
 * Advanced WhatsApp Bot with Web Pairing Panel & Full Menu
 * Owner & Creator: شہزاد زخمی (923256326517)
 * Channel: https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. ویب پیئرنگ پینل (Web Pairing Panel for Users)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ur">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>شہزاد زخمی بوٹ - Pairing Panel</title>
            <style>
                body { background-color: #0f172a; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                .container { background: #1e293b; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.6); max-width: 400px; width: 100%; }
                input { padding: 12px; width: 85%; margin: 15px 0; border-radius: 6px; border: none; font-size: 16px; text-align: center; }
                button { background: #22c55e; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                button:hover { background: #16a34a; }
                #code-display { font-size: 22px; color: #38bdf8; margin-top: 20px; font-weight: bold; word-break: break-all; }
                .channel-link { margin-top: 20px; display: block; color: #facc15; text-decoration: none; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>شہزاد زخمی واٹس ایپ بوٹ پینل</h2>
                <p>अपना व्हाट्सऐप नंबर कंट्री कोड के साथ लिखें (مثلاً: 92325...)</p>
                <input type="text" id="phone" placeholder="923256326517">
                <br>
                <button onclick="getPairingCode()">کوڈ حاصل کریں</button>
                <div id="code-display"></div>
                <a class="channel-link" href="https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z" target="_blank">فالو کریں: شہزاد زخمی واٹس ایپ چینل</a>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('براہ کرم نمبر درج کریں!'); return; }
                    document.getElementById('code-displayinnerText = 'کوڈ حاصل ہو رہا ہے...';
                    
                    const res = await fetch('/pair', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone })
                    });
                    const data = await res.json();
                    if(data.code) {
                        document.getElementById('code-display').innerText = 'آپ کا کوڈ: ' + data.code;
                    } else {
                        document.getElementById('code-display').innerText = 'خرابی ہو گئی، دوبارہ کوشش کریں!';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/pair', async (req, res) => {
    const phoneNumber = req.body.phone;
    if (!phoneNumber) return res.json({ error: 'Number required' });

    try {
        const { state, saveCreds } = await useMultiFileAuthState(`./session_${phoneNumber}`);
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            auth: state
        });

        sock.ev.on('creds.update', saveCreds);

        setTimeout(async () => {
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            res.json({ code });
        }, 4000);

    } catch (err) {
        console.log(err);
        res.json({ error: 'Failed to generate code' });
    }
});

// 2. بوٹ کا مین واٹس ایپ کنکشن اور کمانڈ سسٹم
async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection } = update;
        if (connection === 'open') {
            console.log('Bot is online and connected as شہزاد زخمی!');
        } else if (connection === 'close') {
            console.log('Connection closed. Reconnecting...');
            startBot();
        }
    });

    // بوٹ کی سیٹنگز اور فیچرز (آن/آف ٹوگلز)
    let botSettings = {
        antilinik: false,
        antidelete: false,
        autoread: false,
        autotyping: false,
        mode: "public" // public یا private
    };

    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            
            const messageType = Object.keys(mek.message)[0];
            const body = (messageType === 'conversation') ? mek.message.conversation :
                         (messageType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : '';
            
            const from = mek.key.remoteJid;
            const isOwner = mek.key.fromMe || (mek.key.participant === "923256326517@s.whatsapp.net") || (from === "923256326517@s.whatsapp.net");
            
            const prefix = ".";
            if (!body.startsWith(prefix)) return;

            const args = body.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // پرائیوی트 اور پبلک موڈ چیک
            if (botSettings.mode === "private" && !isOwner) return;

            // مین مینیو کمانڈ (.menu) - آپ کی ڈی پی اور چینل لنک کے ساتھ لائن بائی لائن
            if (command === 'menu') {
                let menuText = ` ━━━〔 ✦ ɪsʟᴀᴍɪᴄ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  adhan\n│  •  namaz_times\n│  •  dua_morning\n│  •  dua_evening\n` +
                               ` ━━━〔 ✦ ᴅᴏᴡɴʟᴏᴀᴅ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  islamic\n│  •  apk\n│  •  facebook\n│  •  tiktok\n│  •  play\n` +
                               ` ━━━〔 ✦ ᴀɪ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  chatgpt\n│  •  gemini\n│  •  deepseek\n│  •  copilot\n` +
                               ` ━━━〔 ✦ ɢʀᴏᴜᴘ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  antilink\n│  •  antidelete\n│  •  tagall\n│  •  kick\n│  •  mute\n` +
                               ` ━━━〔 ✦ ᴍᴀɪɴ ᴍᴇɴᴜ ✦ 〕━━━\n` +
                               `│  •  owner\n│  •  alive\n│  •  menu\n│  •  ping\n` +
                               `─────────────────\n` +
                               `Follow the ShahzadZakhmi channel on WhatsApp:\nhttps://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z`;

                // آپ کی ڈی پی (DP) اور ٹیکسٹ کے ساتھ پیغام بھیجنا
                await sock.sendMessage(from, { 
                    image: { url: "https://share.google/images/FOCxlHWy1akjsZxd8" }, 
                    caption: menuText 
                }, { quoted: mek });
            }

            // موڈ تبدیل کرنے کی کمانڈ (.mode public / private)
            else if (command === 'mode') {
                if (!isOwner) return sock.sendMessage(from, { text: "یہ کمانڈ صرف بوٹ کا اونر استعمال کر सकता ہے!" }, { quoted: mek });
                if (args[0] === 'public' || args[0] === 'private') {
                    botSettings.mode = args[0];
                    await sock.sendMessage(from, { text: `بوٹ کا موڈ اب تبدیل ہو کر ہو گیا ہے: *${botSettings.mode}*` }, { quoted: mek });
                } else {
                    await sock.sendMessage(from, { text: `موجودہ موڈ: ${botSettings.mode}\nاستعمال کرنے کا طریقہ: .mode public یا .mode private` }, { quoted: mek });
                }
            }

            // فیچرز کو آن یا آف کرنے کی کمانڈز (مثلاً: .antilink on / .antilink off)
            else if (['antilink', 'antidelete', 'autoread', 'autotyping'].includes(command)) {
                if (!isOwner) return sock.sendMessage(from, { text: "یہ کمانڈ صرف اونر کے لیے ہے!" }, { quoted: mek });
                
                let action = args[0] ? args[0].toLowerCase() : '';
                if (action === 'on') {
                    botSettings[command] = true;
                    await sock.sendMessage(from, { text: `✅ *${command}* فیچر کامیابی سے *ON* کر دیا گیا ہے!` }, { quoted: mek });
                } else if (action === 'off') {
                    botSettings[command] = false;
                    await sock.sendMessage(from, { text: `❌ *${command}* فیچر کامیابی سے *OFF* کر دیا گیا ہے!` }, { quoted: mek });
                } else {
                    await sock.sendMessage(from, { text: `اسٹیٹس: ${botSettings[command] ? 'ON' : 'OFF'}\nآن کرنے کے لیے لکھیں: .${command} on\nآف کرنے کے لیے لکھیں: .${command} off` }, { quoted: mek });
                }
            }

            // پنٛگ کمانڈ (.ping)
            else if (command === 'ping') {
                await sock.sendMessage(from, { text: `⚡ Pong! شہزاد زخمی بوٹ بالکل ایکٹیو ہے۔` }, { quoted: mek });
            }

        } catch (err) {
            console.log(err);
        }
    });
}

// سرور پورٹ سٹارٹ کرنا
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Web Pairing Panel & Bot Server is running on port ${PORT}`);
});

startBot();
