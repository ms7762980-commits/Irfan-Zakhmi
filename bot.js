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
    await tbot.sendMessage(chatId, `⚠️ Pairing is already in progress. Please wait a moment.`, { parse_mode: "Markdown" });
    return;
  }

  isPairingRunning = true;
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
      await delay(4000);
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
    await tbot.sendMessage(chatId, `❌ Pairing Error: ${err.message}`);
  } finally {
    setTimeout(() => { isPairingRunning = false; }, 15000);
  }
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) return null;

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  
  const tbot = new TelegramBot(BOT_TOKEN, { 
    polling: {
      interval: 3000,
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

  let lastMsgTime = 0;

  tbot.on("message", async (msg) => {
    if (!msg.text) return;
    
    // Anti-Spam / Anti-Double trigger lock (blocks rapid duplicate triggers)
    const now = Date.now();
    if (now - lastMsgTime < 2000) return;
    lastMsgTime = now;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start") {
      const welcomeMsg =
        `✨ *${BOT_NAME}* is active and running 24/7!\n\n` +
        `👤 *Owner:* ${config.OWNER_NAME}\n` +
        `🛠️ *Developer:* ${config.DEVELOPER_NAME}\n\n` +
        `👇 *Choose an option below:*`;

      await tbot.sendMessage(chatId, welcomeMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 How to Pair WhatsApp", callback_data: "help_pair" }],
            [{ text: "📋 View Menu", callback_data: "menu" }],
            [{ text: "👑 Owner Info", callback_data: "owner" }],
            [{ text: "📢 Join Channel", url: config.WA_CHANNEL_LINK }]
          ]
        }
      });
    } else if (text.startsWith("/pair") || text.startsWith("/code")) {
      const parts = text.split(" ");
      const rawNumber = parts[1] ? parts[1].replace(/[^0-9]/g, "") : "";

      if (!rawNumber || rawNumber.length < 10) {
        await tbot.sendMessage(chatId, `⚠️ Please enter a valid number with country code!\nExample: \`/pair 923256326517\``, { parse_mode: "Markdown" });
        return;
      }

      await tbot.sendMessage(chatId, `⏳ Generating fresh pairing code for \`+${rawNumber}\`... Please wait.`, { parse_mode: "Markdown" });
      await startWhatsAppPairing(rawNumber, chatId, tbot);
    } else if (text === "/menu" || text === "/help") {
      await sendMenu(chatId, tbot);
    } else if (text === "/owner") {
      await sendOwner(chatId, tbot);
    }
  });

  tbot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    if (!msg) return;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data === "menu") {
      await sendMenu(chatId, tbot);
    } else if (data === "owner") {
      await sendOwner(chatId, tbot);
    } else if (data === "help_pair") {
      await tbot.sendMessage(chatId, `📱 To pair your WhatsApp, simply send your number with command like this:\n\`/pair 923256326517\``, { parse_mode: "Markdown" });
    }
    try {
      await tbot.answerCallbackQuery(callbackQuery.id);
    } catch (e) {}
  });

  return tbot;
}

async function sendMenu(chatId, tbot) {
  const lineMenu = 
    `╔═══════════════════════╗\n` +
    `║   🔥 *${config.BOT_NAME}* 🔥   ║\n` +
    `╚═══════════════════════╝\n\n` +
    `📌 *Commands Menu:*\n` +
    `│ • adhan\n` +
    `│ • namaz_times\n` +
    `│ • tiktok\n` +
    `│ • play\n` +
    `│ • video\n` +
    `│ • chatgpt\n` +
    `│ • gemini\n\n` +
    `📌 *To pair WhatsApp, send:*\n` +
    `\`/pair your_number\``;

  await tbot.sendMessage(chatId, lineMenu, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Help Pair", callback_data: "help_pair" }],
        [{ text: "👑 Owner Info", callback_data: "owner" }],
        [{ text: "📢 Official Channel", url: config.WA_CHANNEL_LINK }]
      ]
    }
  });
}

async function sendOwner(chatId, tbot) {
  await tbot.sendMessage(chatId, `👑 *Bot:* ${config.BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Dev:* ${config.DEVELOPER_NAME}`, { parse_mode: "Markdown" });
}
