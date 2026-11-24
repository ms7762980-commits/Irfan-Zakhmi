const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalStore, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/')));

const pairingCodes = {};

app.get('/api/status', (req, res) => {
    res.json({
        connected: Object.keys(pairingCodes).length,
        maxSessions: 6,
        slotsUsed: Object.keys(pairingCodes).length,
        uptime: process.uptime(),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
        platform: 'node',
        node: process.version,
        closed: false,
        links: []
    });
});

app.post('/api/pair', async (req, res) => {
    const { number } = req.body;
    if (!number) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const cleanedNumber = number.replace(/[^0-9]/g, '');
    const sessionDir = path.join(__dirname, `session_${cleanedNumber}`);

    // اگر پرانا فولڈر ہو تو صاف کر دیں تاکہ ایرر نہ آئے
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalStore(state.keys, pino({ level: 'silent' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Chrome')
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(cleanedNumber);
                    // کوڈ کو صحیح فارمیٹ میں دینا (مثلاً XXXX-XXXX)
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    pairingCodes[cleanedNumber] = { status: 'ready', code };
                } catch (err) {
                    console.error('Pairing generation error:', err);
                    pairingCodes[cleanedNumber]
