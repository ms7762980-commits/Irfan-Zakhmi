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
  await fs.ensureDir(sessionFolder);

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
    },
    printQRInTerminal: false,
    logger: pino({ level: "fatal" }),
    browser: Browsers.ubuntu("Chrome"),
  });

  if (!sock.authState.creds.registered) {
    await delay(2000);
    try {
      const code = await sock.requestPairingCode(phoneNumber);
      const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;
      
      await tbot.sendMessage(
        chatId,
        `✅ *WhatsApp Pairing Code Generated!*\n\n` +
        `📱 *Number:* \`+${phoneNumber}\`\n` +
        `🔑 *Code:* \`${formattedCode}\`\n\n` +
        `📌 *How to Connect:*\n` +
        `1. Open WhatsApp > Linked Devices\n` +
        `2. Tap "Link a Device" > "Link with phone number instead"\n` +
        `3. Enter the code above!\n\n` +
        `📢 *Channel:* ${config.WA_CHANNEL_LINK}`,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await tbot.sendMessage(chatId, `❌ Error generating code: ${err.message}`);
    }
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;
    if (connection === "open") {
      await tbot.sendMessage(
        chatId,
        `🎉 *${config.BOT_NAME} Connected to WhatsApp!*\n\nNumber: \`+${phoneNumber}\` is now active 24/7!`,
        { parse_mode: "Markdown" }
      );
      await sock.sendMessage(sock.user.id, {
        text: `✨ *${config.BOT_NAME}* Connected Successfully!\n\nOwner: ${config.OWNER_NAME}\nDeveloper: ${config.DEVELOPER_NAME}\nChannel: ${config.WA_CHANNEL_LINK}`
      });
    }
  });

  // WhatsApp Commands
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const from = m.key.remoteJid;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";

    if (body.toLowerCase() === ".ping") {
      await sock.sendMessage(from, { text: `🚀 *${config.BOT_NAME}* is Active & Fast!` }, { quoted: m });
    } else if (body.toLowerCase() === ".menu") {
      await sock.sendMessage(from, {
        text: `📋 *${config.BOT_NAME} MENU*\n\n• .ping - Check Speed\n• .owner - Owner Info\n• .channel - Official Channel\n\n📢 ${config.WA_CHANNEL_LINK}`
      }, { quoted: m });
    } else if (body.toLowerCase() === ".owner") {
      await sock.sendMessage(from, {
        text: `👑 *Owner:* ${config.OWNER_NAME}\n🛠️ *Dev:* ${config.DEVELOPER_NAME}`
      }, { quoted: m });
    } else if (body.toLowerCase() === ".channel") {
      await sock.sendMessage(from, { text: `📢 Join Official Channel:\n${config.WA_CHANNEL_LINK}` }, { quoted: m });
    }
  });
}

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
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
        `📢 *WhatsApp Channel:* [Click Here to Join](${config.WA_CHANNEL_LINK})\n\n` +
        `💡 *Commands:*\n` +
        `• \`/pair 923xxxxxxxx\` - Get WhatsApp Pairing Code\n` +
        `• \`/menu\` - Show Dashboard Menu\n` +
        `• \`/owner\` - Owner Details`;

      tbot.sendMessage(chatId, welcomeMsg, { parse_mode: "Markdown", disable_web_page_preview: true });
    } else if (text.startsWith("/pair") || text.startsWith("/code")) {
      const parts = text.split(" ");
      const rawNumber = parts[1] ? parts[1].replace(/[^0-9]/g, "") : "";

      if (!rawNumber || rawNumber.length < 10) {
        return tbot.sendMessage(
          chatId,
          `⚠️ *Please enter a valid number with country code!*\n\nExample:\n\`/pair 923256326517\``,
          { parse_mode: "Markdown" }
        );
      }

      await tbot.sendMessage(chatId, `⏳ Generating WhatsApp pairing code for \`+${rawNumber}\`... Please wait 5 seconds.`, { parse_mode: "Markdown" });
      await startWhatsAppPairing(rawNumber, chatId, tbot);
    } else if (text === "/menu" || text === "/help") {
      const menuMsg =
        `📋 *${BOT_NAME} Dashboard*\n\n` +
        `1️⃣ \`/pair 923xxxxxxxx\` - Connect WhatsApp\n` +
        `2️⃣ \`/start\` - Bot Status\n` +
        `3️⃣ \`/owner\` - Owner Info\n\n` +
        `🔥 *Join WhatsApp Channel:* ${config.WA_CHANNEL_LINK}`;

      tbot.sendMessage(chatId, menuMsg, { parse_mode: "Markdown" });
    } else if (text === "/owner") {
      tbot.sendMessage(
        chatId,
        `👑 *Bot Information*\n\n• *Bot:* ${BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Developer:* ${config.DEVELOPER_NAME}\n• *Channel:* ${config.WA_CHANNEL_LINK}`,
        { parse_mode: "Markdown" }
      );
    }
  });

  return tbot;
}
