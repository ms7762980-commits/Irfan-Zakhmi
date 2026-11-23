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
    if (msg.text === '/start') {
      tbot.sendMessage(chatId, `✨ *${BOT_NAME}* is active and running 24/7!\nOwner: ${config.OWNER_NAME}`, { parse_mode: "Markdown" });
    }
  });

  return tbot;
}
