import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

let activePairingNumber = null;

async function startWhatsAppPairing(phoneNumber, chatId, tbot) {
  if (activePairingNumber === phoneNumber) {
    return; // Block duplicate parallel execution for the exact same number
  }

  activePairingNumber = phoneNumber;
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
      await delay(5000); // Give socket time to stabilize
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
        activePairingNumber = null;
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
    setTimeout(() => {
      if (activePairingNumber === phoneNumber) {
        activePairingNumber = null;
      }
    }, 20000);
  }
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) return null;

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  
  // Use explicit safe polling settings to prevent duplicate event loops
  const tbot = new TelegramBot(BOT_TOKEN, { 
    polling: true 
  });

  tbot.on("polling_error", (error) => {
    if (error.code === 'ETELEGRAM' && error.message.includes('409 Conflict')) {
      return;
    }
  });

  console.log(`🤖 Telegram Bot initialized for ${BOT_NAME}`);

  let processedUpdates = new Set();

  tbot.on("message", async (msg) => {
    if (!msg.text) return;

    // Strict deduplication using Telegram message update ID
    const updateId = msg.message_id + "_" + msg.chat.id + "_" + msg.date;
    if (processedUpdates.has(updateId)) return;
    processedUpdates.add(updateId);

    // Keep set clean
    if (processedUpdates.size > 100) {
      const firstKey = processedUpdates.values().next().value;
      processedUpdates.delete(firstKey);
    }

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
            [{ text: "🔗 Pair WhatsApp", callback_data: "help_pair" }],
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
      await tbot.sendMessage(chatId, `📱 To pair your WhatsApp, send your number like this:\n\`/pair 923256326517\``, { parse_mode: "Markdown" });
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
        [{ text: "🔗 Pair WhatsApp", callback_data: "help_pair" }],
        [{ text: "👑 Owner Info", callback_data: "owner" }],
        [{ text: "📢 Official Channel", url: config.WA_CHANNEL_LINK }]
      ]
    }
  });
}

async function sendOwner(chatId, tbot) {
  await tbot.sendMessage(chatId, `👑 *Bot:* ${config.BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Dev:* ${config.DEVELOPER_NAME}`, { parse_mode: "Markdown" });
}
