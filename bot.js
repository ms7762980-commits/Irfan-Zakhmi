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
        `🔑 *WhatsApp Pairing Code:* \`${formattedCode}\`\n\n` +
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
      
      try {
        await sock.sendMessage(sock.user.id, {
          image: { url: config.BOT_PIC_URL },
          caption: 
            `┏━━━〔 *${config.BOT_NAME}* 〕━━━┓\n` +
            `┃ ⚡ *STATUS:* \`ACTIVATED\`\n` +
            `┃ 👑 *OWNER:* \`${config.OWNER_NAME}\`\n` +
            `┃ 🛠️ *DEV:* \`${config.DEVELOPER_NAME}\`\n` +
            `┃ 🔢 *CMDS:* \`1028+\`\n` +
            `┗━━━━━━━━━━━━━━━━┛\n\n` +
            `✨ *Type .menu to view all categories!*`
        });
      } catch (e) {}
    }
  });

  // WhatsApp Commands & Line-by-Line Menus
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
        `│ • adhan\n` +
        `│ • namaz_times\n` +
        `│ • dua_morning\n` +
        `│ • dua_evening\n` +
        `│ • dua_sleep\n` +
        `│ • dua_wakeup\n` +
        `│ • dua_eating\n` +
        `│ • dua_travel\n` +
        `│ • ayatul_kursi\n` +
        `│ • surah_yaseen\n` +
        `│ • surah_rahman\n` +
        `│ • surah_mulk\n` +
        `│ • hadith_patience\n` +
        `│ • darood_sharif\n` +
        `│ • kalima_tayyiba\n` +
        `│ • ramadan_info\n` +
        `│ • wudu_steps\n` +
        `│ • namaz_steps\n\n` +
        
        `━━━〔 ✦ *DOWNLOAD MENU* ✦ 〕━━━\n` +
        `│ • islamic\n` +
        `│ • apk\n` +
        `│ • capcut\n` +
        `│ • fb\n` +
        `│ • igdl\n` +
        `│ • mediafire\n` +
        `│ • pinterest\n` +
        `│ • ttmp3\n` +
        `│ • tiktok\n` +
        `│ • ytpost\n` +
        `│ • naat\n` +
        `│ • pinvideo\n` +
        `│ • play\n` +
        `│ • video\n\n` +

        `━━━〔 ✦ *AI MENU* ✦ 〕━━━\n` +
        `│ • copilot\n` +
        `│ • chatgpt\n` +
        `│ • brain\n` +
        `│ • assistant\n` +
        `│ • gpt4\n` +
        `│ • claude\n` +
        `│ • gemini\n` +
        `│ • kimi\n` +
        `│ • perplexity\n` +
        `│ • llama3\n` +
        `│ • mistral\n` +
        `│ • deepseek\n` +
        `│ • qwen\n` +
        `│ • grokbeta\n` +
        `│ • imagine\n\n` +

        `━━━〔 ✦ *ANIME MENU* ✦ 〕━━━\n` +
        `│ • animecouple1\n` +
        `│ • animegirl1\n` +
        `│ • animewallpaper1\n\n` +

        `━━━〔 ✦ *OWNER MENU* ✦ 〕━━━\n` +
        `│ • vv\n` +
        `│ • vv2\n` +
        `│ • fullpp\n` +
        `│ • leave\n` +
        `│ • block\n` +
        `│ • unblock\n` +
        `│ • status\n` +
        `│ • pair\n` +
        `│ • notify\n` +
        `│ • broadcast\n` +
        `│ • update\n\n` +

        `━━━〔 ✦ *GROUP MENU* ✦ 〕━━━\n` +
        `│ • antibot\n` +
        `│ • kickbot\n` +
        `│ • delete\n` +
        `│ • mute\n` +
        `│ • unmute\n` +
        `│ • tagall\n` +
        `│ • hidetag\n` +
        `│ • kick\n` +
        `│ • promote\n` +
        `│ • demote\n` +
        `│ • gcpp\n` +
        `│ • link\n` +
        `│ • poll\n` +
        `│ • invite\n` +
        `│ • requests\n` +
        `│ • add\n\n` +

        `━━━〔 ✦ *UTILITY & TOOLS* ✦ 〕━━━\n` +
        `│ • uptime\n` +
        `│ • weather\n` +
        `│ • convert\n` +
        `│ • define\n` +
        `│ • news\n` +
        `│ • movieinfo\n` +
        `│ • playstore\n` +
        `│ • binary\n` +
        `│ • base64\n` +
        `│ • urlencode\n` +
        `│ • calculate\n` +
        `│ • tempmail\n` +
        `│ • wikipedia\n` +
        `│ • upscale1\n` +
        `│ • removebg\n` +
        `│ • remini\n` +
        `│ • savecontact\n\n` +

        `━━━〔 ✦ *FUN & SHAYARI* ✦ 〕━━━\n` +
        `│ • character\n` +
        `│ • ringtone\n` +
        `│ • puzzle\n` +
        `│ • roast\n` +
        `│ • 8ball\n` +
        `│ • lovetest\n` +
        `│ • emoji\n` +
        `│ • quote\n` +
        `│ • flirt\n` +
        `│ • bewafa\n` +
        `│ • dosti\n` +
        `│ • shayarban\n` +
        `│ • joke\n` +
        `│ • ship\n` +
        `│ • couple\n` +
        `│ • kiss\n` +
        `│ • slap\n` +
        `│ • hug\n\n` +

        `━━━〔 ✦ *SETTINGS MENU* ✦ 〕━━━\n` +
        `│ • welcome\n` +
        `│ • goodbye\n` +
        `│ • antilink\n` +
        `│ • antidelete\n` +
        `│ • autoread\n` +
        `│ • autoreact\n` +
        `│ • anticall\n` +
        `│ • mode\n` +
        `│ • prefix\n` +
        `│ • botname\n` +
        `│ • ownername\n` +
        `│ • stickername\n\n` +

        `📢 *Channel:* ${config.WA_CHANNEL_LINK}`;

      await sock.sendMessage(from, {
        image: { url: config.BOT_PIC_URL },
        caption: fullMenu
      }, { quoted: m });
    } 
    else if (cmd === ".owner" || cmd === "owner") {
      await sock.sendMessage(from, { text: `👑 *Owner:* ${config.OWNER_NAME}\n\n🛠️ *Dev:* ${config.DEVELOPER_NAME}\n\n📢 *Channel:* ${config.WA_CHANNEL_LINK}` }, { quoted: m });
    } 
    else if (cmd === ".channel" || cmd === "channel") {
      await sock.sendMessage(from, { text: `📢 *Official Channel:* ${config.WA_CHANNEL_LINK}` }, { quoted: m });
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

  let isPairingInProgress = false;

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
            [{ text: "📋 View Line-by-Line Menu", callback_data: "menu" }],
            [{ text: "👑 Owner Info", callback_data: "owner" }],
            [{ text: "📢 Join WhatsApp Channel", url: config.WA_CHANNEL_LINK }]
          ]
        }
      });
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

      if (isPairingInProgress) {
        return tbot.sendMessage(chatId, `⏳ *Pairing already in progress!* Please wait for the code.`);
      }

      isPairing
