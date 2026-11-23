const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');

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
  console.log(`${botName} is successfully connected and listening to Telegram with Full Power!`);

  // /start کمانڈ اور زبردست انٹرفیس بٹنز
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `🔥 *Welcome to ${botName}* 🔥\n\nHello ${userName}!\nThis is the official 24/7 active bot created and managed by *${ownerName}*.\n\n👑 *Owner:* ${ownerName}\n📱 *Number:* +${ownerNumber}\n\nChoose an option below:`;
    
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🤖 Bot Status", callback_data: "status" },
            { text: "👑 Owner Info", callback_data: "owner" }
          ],
          [
            { text: " Pairing Code Help", callback_data: "pairing_help" }
          ],
          [
            { text: "✨ Visit Developer", url: `https://wa.me/${ownerNumber}` }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, replyText, opts);
  });

  // بٹن کلک ہینڈلر (Callback Queries)
  bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    if (data === 'status') {
      bot.sendMessage(chatId, `✅ *${botName}* is 24/7 Active on Railway Server!\n⚡ Status: All systems operational.`, { parse_mode: "Markdown" });
    } else if (data === 'owner') {
      bot.sendMessage(chatId, `👑 *Owner & Developer Details*\n\nName: ${ownerName}\nNumber: +${ownerNumber}\nPlatform: Railway Cloud`, { parse_mode: "Markdown" });
    } else if (data === 'pairing_help') {
      bot.sendMessage(chatId, `📱 *WhatsApp Pairing Guide*\n\nTo get your WhatsApp pairing code, send your number in this format:\n\n\`pair 923xxxxxxxx\`\n\n(Bot will process your request securely).`, { parse_mode: "Markdown" });
    }

    bot.answerCallbackQuery(callbackQuery.id);
  });

  // واٹس ایپ پیئرنگ کمانড یا عام میसेज ہینڈلر
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (text.toLowerCase().startsWith('pair ')) {
      const userNum = text.replace('pair ', '').trim();
      bot.sendMessage(chatId, `⚙️ Generating WhatsApp Pairing Code for: \`${userNum}\`...\n\n_Please wait a moment..._`, { parse_mode: "Markdown" });
      // یہاں آپ پیئرنگ کوڈ جنریشن کی لاجک یا اے پی آئی کال فٹ کر سکتے ہیں
    } else {
      bot.sendMessage(chatId, `💬 Message received! *${botName}* is running live. Type /start to see the menu.`, { parse_mode: "Markdown" });
    }
  });
}

module.exports = { startBot };
