import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

async function startWhatsAppPairing(phoneNumber, chatId, tbot) {
  const sessionFolder = `./sessions/${phoneNumber}`;
  
  try {
    if (await fs.pathExists(sessionFolder)) {
      await fs.remove(sessionFolder);
    }
    await fs.ensureDir(sessionFolder);
  } catch (e) {}

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
  });

  if (!sock.authState.creds.registered) {
    await delay(3000);
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      await tbot.sendMessage(
        chatId,
        `🔑 *WhatsApp Code:* \`${formattedCode}\`\n\n` +
        `📱 *Number:* \`+${phoneNumber}\`\n\n` +
        `📌 *How to connect:*\n` +
        `1. Open WhatsApp > Linked Devices\n` +
        `2. Tap Link a Device > Link with phone number\n` +
        `3. Enter the code above!`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 WhatsApp Channel", url: config.WA_CHANNEL_LINK }]
            ]
          }
        }
      );
    } catch (err) {
      await tbot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;
    if (connection === "open") {
      await tbot.sendMessage(
        chatId,
        `🎉 *${config.BOT_NAME} Connected Successfully!*\nNumber: \`+${phoneNumber}\` is now active 24/7.`,
        { parse_mode: "Markdown" }
      );
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    const cmd = body.toLowerCase().trim();

    if (cmd === ".ping" || cmd === "ping") {
      await sock.sendMessage(from, { text: `🚀 *${config.BOT_NAME}* is Active & Fast 24/7!` }, { quoted: m });
    } 
    else if (cmd === ".menu" || cmd === "menu" || cmd === ".help" || cmd === ".m") {
      const fullMenu = 
        `━━━〔 ✦ *ISLAMIC MENU* ✦ 〕━━━\n` +
        `│ • adhan\n│ • namaz_times\n│ • dua_morning\n│ • surah_yaseen\n\n` +
        `━━━〔 ✦ *DOWNLOAD MENU* ✦ 〕━━━\n` +
        `│ • tiktok\n│ • play\n│ • video\n│ • apk\n\n` +
        `━━━〔 ✦ *AI MENU* ✦ 〕━━━\n` +
        `│ • chatgpt\n│ • gemini\n│ • deepseek\n\n` +
        `📢 *Channel:* ${config.WA_CHANNEL_LINK}`;

      await sock.sendMessage(from, { text: fullMenu }, { quoted: m });
    }
  });
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = '9208160776:AAFJIagiA9NpRKTXqXNXcQFqh76DBcJkhl0';
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) return null;

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  const tbot = new TelegramBot(BOT_TOKEN, { polling: true });

  console.log(`🤖 Telegram Bot initialized for ${BOT_NAME}`);

  tbot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.trim() : "";

    if (text === "/start") {
      const welcomeMsg =
        `✨ *${BOT_NAME}* is active and running 24/7!\n\n` +
        `👤 *Owner:* ${config.OWNER_NAME}\n` +
        `🛠️ *Developer:* ${config.DEVELOPER_NAME}\n\n` +
        `👇 *Choose an option:*`;

      tbot.sendMessage(chatId, welcomeMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Pair WhatsApp Number", callback_data: "help_pair" }],
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
        return tbot.sendMessage(chatId, `⚠️ Please enter a valid number with country code!\nExample: \`/pair 923256326517\``, { parse_mode: "Markdown" });
      }

      tbot.sendMessage(chatId, `⏳ Generating fresh pairing code for \`+${rawNumber}\`... Please wait.`, { parse_mode: "Markdown" });
      try {
        await startWhatsAppPairing(rawNumber, chatId, tbot);
      } catch (err) {
        tbot.sendMessage(chatId, `❌ Error: ${err.message}`);
      }
    } else if (text === "/menu" || text === "/help") {
      sendMenu(chatId, tbot);
    } else if (text === "/owner") {
      sendOwner(chatId, tbot);
    }
  });

  tbot.on("callback_query", async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    if (data === "menu") {
      sendMenu(chatId, tbot);
    } else if (data === "owner") {
      sendOwner(chatId, tbot);
    } else if (data === "help_pair") {
      tbot.sendMessage(chatId, `📱 Send your number like this:\n\`/pair 923256326517\``, { parse_mode: "Markdown" });
    }
    tbot.answerCallbackQuery(callbackQuery.id);
  });

  return tbot;
}

function sendMenu(chatId, tbot) {
  const lineMenu = 
    `╔═══════════════════════╗\n` +
    `║   🔥 *${config.BOT_NAME}* 🔥   ║\n` +
    `╚═══════════════════════╝\n\n` +
    `📌 *Commands Menu (Line-by-Line):*\n` +
    `│ • adhan\n` +
    `│ • namaz_times\n` +
    `│ • tiktok\n` +
    `│ • play\n` +
    `│ • video\n` +
    `│ • chatgpt\n` +
    `│ • gemini\n` +
    `│ • weather\n\n` +
    `📌 *To pair WhatsApp, send:*\n` +
    `\`/pair your_number\``;

  tbot.sendMessage(chatId, lineMenu, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Pair WhatsApp Number", callback_data: "help_pair" }],
        [{ text: "👑 Owner Info", callback_data: "owner" }],
        [{ text: "📢 Official Channel", url: config.WA_CHANNEL_LINK }]
      ]
    }
  });
}

function sendOwner(chatId, tbot) {
  tbot.sendMessage(chatId, `👑 *Bot:* ${config.BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Dev:* ${config.DEVELOPER_NAME}`, { parse_mode: "Markdown" });
}
