import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

const activePairing = new Set();

async function startWhatsAppPairing(phoneNumber, chatId, tbot) {
  if (activePairing.has(phoneNumber)) {
    return tbot.sendMessage(chatId, `⚠️ Pairing is already in progress for \`+${phoneNumber}\`. Please wait a moment.`, { parse_mode: "Markdown" });
  }
  
  activePairing.add(phoneNumber);
  const sessionFolder = `./sessions_${chatId}`;
  
  try {
    if (await fs.pathExists(sessionFolder)) {
      await fs.remove(sessionFolder);
    }
    await fs.ensureDir(sessionFolder);
  } catch (e) {}

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Chrome"),
    });

    sock.ev.on("creds.update", saveCreds);

    if (!sock.authState.creds.registered) {
      await delay(5000);
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
        
        await tbot.sendMessage(
          chatId,
          `🔑 *WhatsApp Pairing Code:* \`${formattedCode}\`\n\n` +
          `📱 *Number:* \`+${phoneNumber}\`\n\n` +
          `📌 *How to connect:*\n` +
          `1. Open WhatsApp > Linked Devices\n` +
          `2.
