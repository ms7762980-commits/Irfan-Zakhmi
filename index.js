const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, downloadMediaMessage } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 🌐 Web Pairing Panel Website
// ==========================================
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
                <h2>⚡ Shahzad Zakhmi MD Bot ⚡</h2>
                <div class="sub-title">Official Pairing Panel (Railway Server)</div>
                <div class="info-box">
                    <strong>Instructions:</strong> Enter your WhatsApp number with country code (e.g. 923...) to generate pairing code.
                </div>
                <label>WhatsApp Number</label>
                <input type="text" id="phone" value="" placeholder="e.g. 9233336268652">
                <button onclick="getPairingCode()" id="gen-btn">Generate Pairing Code</button>
                <div id="code"></div>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value;
                    if(!phone) { alert('Please enter your WhatsApp number!'); return; }
                    const btn = document.getElementById('gen-btn');
                    btn.innerText = 'Generating...';
                    try {
                        const res = await fetch('/pair?phone=' + phone);
                        const data = await res.json();
                        const c = document.getElementById('code');
                        if(data.code) {
                            c.innerText = data.code;
                            c.style.display = 'block';
                        } else { 
                            c.innerText = data.error || 'Failed to generate code';
                            c.style.display = 'block';
                        }
                    } catch(e) {
                        alert('Error connecting to server');
                    }
                    btn.innerText = 'Generate Pairing Code';
                }
            </script>
        </body>
        </html>
    `);
});

let globalSock = null;

// ==========================================
// 🔗 Pairing Request API Endpoint (Web Panel)
// ==========================================
app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number required' });
    try {
        if (!globalSock) return res.json({ error: 'Bot is starting up, please wait 5 seconds and try again.' });
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        let code = await globalSock.requestPairingCode(cleanPhone);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        return res.json({ code });
    } catch (err) {
        return res.json({ error: err.message });
    }
});

let botMode = 'public'; 
let antiLink = true;
let reactionStatus = true;
const ownerNumber = '923256326517';

async function startBot() {
    // ریلوے کے کریش کو روکنے کے لیے ٹیمپریری فولڈر کا استعمال
    const authFolder = path.join(os.tmpdir(), 'auth_info_shahzad');
    
    try {
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
                console.log('✅ Shahzad Zakhmi MD Bot Connected Successfully on Railway! 🔥');
            }
        });

        sock.ev.on('creds.update', saveCreds);

    } catch (e) {
        console.log("Bot start error:", e);
        setTimeout(() => startBot(), 5000);
    }
}

server.listen(PORT, () => {
    console.log(`🚀 Server & Pairing Panel running on port ${PORT}`);
    startBot();
});
