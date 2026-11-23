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

  // ٹیلی گرام بوٹ اسٹارٹ کرنا
  const bot = new TelegramBot(telegramToken, { polling: true });

  console.log(`${botName} is successfully connected and listening to Telegram!`);

  // جب کوئی /start بھیجے
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `Hello ${userName}!\nWelcome to *${botName}*.\n\n👑 Owner & Developer: ${ownerName}\n📱 Owner Number: +${ownerNumber}\n\nHow can I help you today?`;
    
    bot.sendMessage(chatId, replyText, { parse_mode: "Markdown" });
  });

  // عام میसेज کا جواب
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && !msg.text.startsWith('/')) {
      bot.sendMessage(chatId, `Aap ka message mil gaya hai! ${botName} active hai.`);
    }
  });
}

module.exports = { startBot };
