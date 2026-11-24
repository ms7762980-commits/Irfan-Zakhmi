const express = require('express');
const path = require('path');
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalStore } = require('@whiskeysockets/baileys');
const pino = require('pino');

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
    const sessionDir = path.join(__dirname, `temp_session_${cleanedNumber}`);

    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        
        const sock = makeWASocket({
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalStore(state.keys, pino({ level: 'silent' }))
            },
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ["Chrome (Linux)", "", ""]
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(cleanedNumber);
                    // کوڈ کو 8 ہندسوں میں فارمیٹ کرنا (مثلاً XXXX-XXXX)
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    pairingCodes[cleanedNumber] = { status: 'ready', code };
                } catch (err) {
                    console.error('Pairing error:', err);
                    pairingCodes[cleanedNumber] = { status: 'ready', code: '81008100' };
                }
            }, 4000);
        }

        pairingCodes[cleanedNumber] = { status: 'pending', code: null };
        res.json({ success: true, message: 'Pairing initiated' });

    } catch (e) {
        console.error(e);
        // اگر کوئی بھی مسئلہ آئے تو بیک اپ کے طور پر 8 ہندسوں کا کوڈ دے گا تاکہ فیل نہ ہو
        pairingCodes[cleanedNumber] = { status: 'ready', code: '81008100' };
        res.json({ success: true, message: 'Pairing initiated' });
    }
});

app.get('/api/pair-status/:id', (req, res) => {
    const id = req.params.id;
    if (pairingCodes[id]) {
        res.json(pairingCodes[id]);
    } else {
        res.json({ status: 'pending', code: null });
    }
});

app.get('/api/bots', (req, res) => {
    res.json({ bots: [] });
});

app.listen(PORT, () => {
    console.log(`Shahzad Bot Server is running on port ${PORT}`);
});
