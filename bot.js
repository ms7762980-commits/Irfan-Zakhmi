import config from "./config.js";
import fs from "fs-extra";
import pino from "pino";
import makeWASocket, {
  useMultiFileAuthState,
  delay,
  makeCacheableSignalKeyStore,
  Browsers
} from "@whiskeysockets/baileys";

let isPairingActive = false;

async function startWhatsAppSession(phoneNumber, chatId, tbot, useQR = false) {
  if (isPairingActive) {
    if (chatId) {
      await tbot.sendMessage(chatId, `⚠️ ایک سیشن پہلے ہی پروسیس میں ہے۔ براہ کرم تھوڑا انتظار کریں۔`, { parse_mode: "Markdown" });
    }
    return;
  }

  isPairingActive = true;
  const sessionFolder = `./sessions/${phoneNumber || 'qr_session'}`;
  
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
      printQRInTerminal: useQR, // QR Code terminal par print karne ke liye
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Desktop"),
    });

    // Agar QR code ka tareeqa ho aur number na diya ho
    if (useQR) {
      sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;
        if (qr && chatId) {
          await tbot.sendMessage(chatId, `📷 ریلوے لاگز (Railway Logs) چیک کریں وہاں واٹس ایپ کا QR Code آ گیا ہے جسے آپ اسکین کر سکتے ہیں!`, { parse_mode: "Markdown" });
        }
        if (connection === "open") {
          isPairingActive = false;
          if (chatId) {
            await tbot.sendMessage(chatId, `🎉 *${config.BOT_NAME}* کامیابی سے کیو آر کوڈ کے ذریعے جڑ گیا ہے!`, { parse_mode: "Markdown" });
          }
        }
      });
    } 
    else if (phoneNumber && !sock.authState.creds.registered) {
      await delay(4000);
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      if (chatId) {
        await tbot.sendMessage(
          chatId,
          `🔑 *WhatsApp Pairing Code:* \`${formattedCode}\`\n\n` +
          `📱 *Number:* \`+${phoneNumber}\`\n\n` +
          `📌 *ترتیب:*\n` +
          `1. WhatsApp > Linked Devices کھولیں\n` +
          `2. Link with phone number پر کلک کریں\n` +
          `3. اوپر والا کوڈ درج کریں!`,
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
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection } = update;
      if (connection === "open") {
        isPairingActive = false;
        if (chatId) {
          await tbot.sendMessage(
            chatId,
            `🎉 *${config.BOT_NAME} Connected Successfully!*\nNumber: \`+${phoneNumber}\` is now active 24/7.`,
            { parse_mode: "Markdown" }
          );
        }
      }
    });

  } catch (err) {
    isPairingActive = false;
    if (chatId) {
      await tbot.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  } finally {
    setTimeout(() => { isPairingActive = false; }, 15000);
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

  let lastProcessedUpdateId = null;

  tbot.on("message", async (msg) => {
    if (!msg.text) return;
    
    // Strict duplication guard to stop double trigger
    const currentUpdateKey = `${msg.chat.id}_${msg.message_id}`;
    if (lastProcessedUpdateId === currentUpdateKey) return;
    lastProcessedUpdateId = currentUpdateKey;

    const chatId = msg.chat.id;
    const text = msg.text.trim();

    if (text === "/start") {
      const welcomeMsg =
        `✨ *${BOT_NAME}* is active and running 24/7!\n\n` +
        `👤 *Owner:* ${config.OWNER_NAME}\n` +
        `🛠️ *Developer:* ${config.DEVELOPER_NAME}\n\n` +
        `👇 *طریقہ کار منتخب کریں:*`;

      await tbot.sendMessage(chatId, welcomeMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔗 Pair with Phone Number", callback_data: "help_pair" }],
            [{ text: "📷 Generate QR Code", callback_data: "gen_qr" }],
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
        await tbot.sendMessage(chatId, `⚠️ براہ کرم ملک کے کوڈ کے ساتھ صحیح نمبر لکھیں!\nمثال: \`/pair 923256326517\``, { parse_mode: "Markdown" });
        return;
      }

      await tbot.sendMessage(chatId, `⏳ نمبر \`+${rawNumber}\` کے لیے نیا پیئرنگ کوڈ تیار کیا جا رہا ہے...`, { parse_mode: "Markdown" });
      await startWhatsAppSession(rawNumber, chatId, tbot, false);
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
      await tbot.sendMessage(chatId, `📱 نمبر کے ذریعے پیئر کرنے کے لیے اس طرح بھیجیں:\n\`/pair 923256326517\``, { parse_mode: "Markdown" });
    } else if (data === "gen_qr") {
      await tbot.sendMessage(chatId, `⏳ QR Code جنریٹ ہو رہا ہے، ریلوے لاگز (Railway Logs) چیک کریں!`, { parse_mode: "Markdown" });
      await startWhatsAppSession(null, chatId, tbot, true);
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
    `📌 *مینو لسٹ:*\n` +
    `│ • adhan\n` +
    `│ • namaz_times\n` +
    `│ • tiktok\n` +
    `│ • play\n` +
    `│ • video\n` +
    `│ • chatgpt\n` +
    `│ • gemini\n\n` +
    `📌 *واٹس ایپ جوڑنے کے لیے لکھیں:*\n` +
    `\`/pair آپ_کا_نمبر\``;

  await tbot.sendMessage(chatId, lineMenu, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔗 Pair Number", callback_data: "help_pair" }],
        [{ text: "📷 QR Code", callback_data: "gen_qr" }],
        [{ text: "👑 Owner Info", callback_data: "owner" }],
        [{ text: "📢 Official Channel", url: config.WA_CHANNEL_LINK }]
      ]
    }
  });
}

async function sendOwner(chatId, tbot) {
  await tbot.sendMessage(chatId, `👑 *Bot:* ${config.BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Dev:* ${config.DEVELOPER_NAME}`, { parse_mode: "Markdown" });
}
