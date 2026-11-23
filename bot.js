import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

async function startDirectPairing() {
  const phoneNumber = "923256326517"; // Apna WhatsApp number yahan likh dein (with country code, no +)
  const sessionFolder = `./sessions/${phoneNumber}`;
  
  try {
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
      await delay(5000);
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      console.log("\n==================================================");
      console.log(`🔑 WHATSAPP PAIRING CODE: [ ${formattedCode} ]`);
      console.log(`📱 NUMBER: +${phoneNumber}`);
      console.log("==================================================\n");
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        console.log(`🎉 WhatsApp Connected Successfully for +${phoneNumber} 24/7!`);
      }
    });

  } catch (err) {
    console.error("Pairing Error:", err.message);
  }
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) return null;

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  const tbot = new TelegramBot(BOT_TOKEN, { polling: true });

  console.log(`🤖 Telegram Bot initialized for ${BOT_NAME}`);

  // Auto start pairing on boot so code appears directly in Railway logs!
  setTimeout(() => {
    startDirectPairing();
  }, 4000);

  tbot.on("message", async (msg) => {
    if (!msg.text) return;
    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start" || text === "/pair") {
      await tbot.sendMessage(
        chatId, 
        `✨ *${BOT_NAME}* is running!\n\nCheck your **Railway Deployment Logs** right now to get your fresh WhatsApp Pairing Code!`,
        { parse_mode: "Markdown" }
      );
    }
  });

  return tbot;
}
