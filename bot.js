const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');

const CHANNEL_LINK = "https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z";

console.log(`Initialising ${botName}...`);
console.log(`Board: ${boardName}`);
console.log(`Developer: ${developerName}`);
console.log(`Owner: ${ownerName} (+${ownerNumber})`);

function startBot() {
  if (!telegramToken) {
    console.log("Telegram token is missing!");
    return;
  }

  const bot = new TelegramBot(telegramToken, { polling: true });
  console.log(`${botName} is successfully connected and listening to Telegram with Heavy Bug Menu!`);

  // /start کمانڈ اور زبردست انٹرفیس
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `🔥 *Welcome to ${botName}* 🔥\n\nHello ${userName}!\nThis is the official 24/7 active Heavy MD Bot managed by *${ownerName}*.\n\n👑 *Owner:* ${ownerName}\n📱 *Number:* +\`${ownerNumber}\`\n\nChoose an option below or use bug commands in Telegram:`;
    
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚡ /pair Sample Command", switch_inline_query_current_chat: `/pair ${ownerNumber}` },
            { text: "☣️ Bug Menu", callback_data: "bug_menu" }
          ],
          [
            { text: "🤖 Bot Status", callback_data: "status" },
            { text: "👑 Owner Info", callback_data: "owner" }
          ],
          [
            { text: "📢 Join WhatsApp Channel", url: CHANNEL_LINK }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, replyText, opts);
  });

  // بٹن ہینڈلر (بگ مینو اور دیگر فیچرز)
  bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    if (data === 'status') {
      bot.sendMessage(chatId, `✅ *${botName}* is 24/7 Active on Heavy Server!\n⚡ Speed: Ultra Fast`, { parse_mode: "Markdown" });
    } else if (data === 'owner') {
      bot.sendMessage(chatId, `👑 *Owner & Developer*\n\nName: ${ownerName}\nNumber: +\`${ownerNumber}\`\nChannel: ${CHANNEL_LINK}`, { parse_mode: "Markdown" });
    } else if (data === 'bug_menu') {
      const bugMenuText = `☣️ *[ ${botName} - TELEGRAM BUG MENU ]* ☣️\n\nAvailable Bug & Crash Commands:\n\n• \`.bug\`: Send heavy crash payload\n• \`.delay\`: Lag target chat\n• \`.uiOS\`: iOS UI crash sender\n• \`.xbug\`: Extreme multi-thread bug\n• \`.crash\`: Force close target app\n\n_Use these commands directly in chat!_`;
      bot.sendMessage(chatId, bugMenuText, { parse_mode: "Markdown" });
    }
    bot.answerCallbackQuery(callbackQuery.id);
  });

  // ٹیلی گرام بگ کمانڈز اور پیئرنگ ہینڈلر
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    if (text.startsWith('/pair') || text.startsWith('.pair')) {
      bot.sendMessage(chatId, `⚙️ *[${botName}]*\nHeavy MD Port active. To link WhatsApp or get code, ensure your number format is correct. Owner: +\`${ownerNumber}\``, { parse_mode: "Markdown" });
    } else if (text.startsWith('.bug') || text.startsWith('/bug')) {
      bot.sendMessage(chatId, `☣️ *Executing Heavy Bug Payload...*\nTarget processed successfully by ${botName}!`, { parse_mode: "Markdown" });
    } else if (text.startsWith('.delay') || text.startsWith('/delay')) {
      bot.sendMessage(chatId, `⏳ *Delay Lag Executed Successfully!*`, { parse_mode: "Markdown" });
    } else if (text.startsWith('.uiOS') || text.startsWith('/uiOS')) {
      bot.sendMessage(chatId, `🍏 *iOS Crash UI Packet Sent!*`, { parse_mode: "Markdown" });
    } else if (text.startsWith('.xbug') || text.startsWith('/xbug')) {
      bot.sendMessage(chatId, `🔥 *Extreme X-Bug Flooded!*`, { parse_mode: "Markdown" });
    } else if (text.startsWith('.crash') || text.startsWith('/crash')) {
      bot.sendMessage(chatId, `💥 *Target Force Crash Triggered!*`, { parse_mode: "Markdown" });
    }
  });
}

module.exports = { startBot };
