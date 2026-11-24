const express = require('express');
const http = require('http');
const { startBot } = require('./bot');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Modern Web Pairing Panel Home Route
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

// Route for Pairing Request
app.get('/pair', async (req, res) => {
    const phoneNumber = req.query.phone;
    if (!phoneNumber) return res.json({ error: 'Phone number is required' });
    try {
        const code = await global.requestPairCode(phoneNumber);
        if(code) {
            return res.json({ code });
        } else {
            return res.json({ error: 'Bot is still initializing or already connected.' });
        }
    } catch (err) {
        return res.json({ error: err.message || 'Failed to generate pairing code.' });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server & Website running on port ${PORT}`);
    startBot();
});
