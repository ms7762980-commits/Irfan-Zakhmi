import config from "./config.js";

export default async function initializeTelegramBot() {
  const BOT_TOKEN = config.TG_BOT_TOKEN;
  const BOT_NAME = config.BOT_NAME;

  if (!BOT_TOKEN) {
    console.warn("❌ [bot.js] BOT_TOKEN not set — skipping Telegram bot.");
    return null;
  }

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  const tbot = new TelegramBot(BOT_TOKEN, { polling: true });

  console.log(`🤖 [bot.js] Telegram Bot initialized successfully for ${BOT_NAME}`);
  
  tbot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text ? msg.text.trim() : "";

    if (text === '/start') {
      const welcomeMsg = `✨ *${BOT_NAME}* is active and running 24/7!\n\n` +
        `👤 *Owner:* ${config.OWNER_NAME}\n` +
        `🛠️ *Developer:* ${config.DEVELOPER_NAME}\n\n` +
        `📢 *WhatsApp Channel:* [Click Here to Join](${config.WA_CHANNEL_LINK})\n\n` +
        `💡 *Available Commands:*\n` +
        `• /start - Check bot status\n` +
        `• /pair - Connect WhatsApp session\n` +
        `• /menu - Show all features`;

      tbot.sendMessage(chatId, welcomeMsg, { parse_mode: "Markdown", disable_web_page_preview: true });
    } 
    else if (text.startsWith('/pair') || text.startsWith('/code')) {
      tbot.sendMessage(chatId, `🔗 *WhatsApp Pairing System*\n\nTo connect your WhatsApp number, use the dashboard or send your number like:\n\`/pair 923xxxxxxxx\`\n\n📢 Join our channel for updates: ${config.WA_CHANNEL_LINK}`, { parse_mode: "Markdown" });
    }
    else if (text === '/menu' || text === '/help') {
      const menuMsg = `📋 *${BOT_NAME} Dashboard Menu*\n\n` +
        `1️⃣ /start - Bot Status & Info\n` +
        `2️⃣ /pair - WhatsApp Pairing & Connection\n` +
        `3️⃣ /owner - Owner & Developer Details\n\n` +
        `🔥 *Join WhatsApp Channel:* ${config.WA_CHANNEL_LINK}`;

      tbot.sendMessage(chatId, menuMsg, { parse_mode: "Markdown" });
    }
    else if (text === '/owner') {
      tbot.sendMessage(chatId, `👑 *Bot Information*\n\n• *Bot Name:* ${BOT_NAME}\n• *Owner:* ${config.OWNER_NAME}\n• *Developer:* ${config.DEVELOPER_NAME}\n• *Channel:* ${config.WA_CHANNEL_LINK}`, { parse_mode: "Markdown" });
    }
  });

  return tbot;
}
