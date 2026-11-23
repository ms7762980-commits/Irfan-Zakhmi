import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

let isPairingRunning = false;

async function startWhatsAppPairing(phoneNumber, chatId, tbot) {
  if (isPairingRunning) {
    await tbot.sendMessage(chatId, `⚠️ Another pairing process is already running. Please wait a few seconds.`, { parse_mode: "Markdown" });
    return;
  }

  isPairingRunning = true;
  const sessionFolder = `./sessions/${phoneNumber}`;
  
  try {
    // Completely wipe old session to prevent login conflict
    if (await fs.pathExists(sessionFolder)) {
      await fs.remove(sessionFolder);
    }
    await fs.ensureDir(sessionFolder);

    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Desktop"),
    });

    if (!sock.authState.creds.registered) {
      await delay(3000);
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      await tbot.sendMessage(
        chatId,
        `🔑 *WhatsApp Pairing Code:* \`${formattedCode}\`\n\n` +
        `📱 *Number:* \`+${phoneNumber}\`\n\n` +
        `📌 *How to connect:*\n` +
        `1. Open WhatsApp > Linked Devices\n` +
        `2. Tap Link a Device > Link with phone number\n` +
        `3. Enter the code above within 30 seconds!`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 WhatsApp Channel", url: config.WA_CHANNEL_LINK }]
            ]
          }
        }
      );
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        isPairingRunning = false;
        await tbot.sendMessage(
          chatId,
          `🎉 *${config.BOT_NAME} Connected Successfully!*\nNumber: \`+${phoneNumber}\` is now active 24/7.`,
          { parse_mode: "Markdown" }
        );
      }
    });

  } catch (err) {
    isPairingRunning = false;
    await tbot.sendMessage(chatId, `❌ Pairing Error: ${err.message}`);
  } finally {
    setTimeout(() => { isPairingRunning = false; }, 10000);
  }
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) return null;

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  
  const tbot = new TelegramBot(BOT_TOKEN, { 
    polling: {
      interval: 2000,
      autoStart: true,
      params: { timeout: 10 }
    } 
  });

  tbot.on("polling_error", (error) => {
    if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
      return;
    }
  });

  console.log(`🤖 Telegram Bot initialized for ${BOT_NAME}`);

  let lastProcessedMsgId = null;

  tbot.on("message", async (msg) => {
    if (!msg.text) return;
    
    // Prevent double processing of the exact same message ID
    if (lastProcessedMsgId === msg.message_id) return;
    lastProcessedMsgId = msg.message_id;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start") {
      const welcomeMsg =
