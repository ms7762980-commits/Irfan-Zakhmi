const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

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
  console.log(`${botName} is successfully connected and listening to Telegram with Pairing System!`);

  // /start کمانڈ
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `🔥 *Welcome to ${botName}* 🔥\n\nHello ${userName}!\nThis is the official 24/7 active bot managed by *${ownerName}*.\n\n👑 *Owner:* ${ownerName}\n📱 *Number:* +${ownerNumber}\n\nTo get WhatsApp pairing code, send:\n\`pair your_number\` (e.g. pair 923256326517)`;
    
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🤖 Bot Status", callback_data: "status" },
            { text: "👑 Owner Info", callback_data: "owner" }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, replyText, opts);
  });

  // بٹन کلक ہینڈلر
  bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    if (data === 'status') {
      bot.sendMessage(chatId, `✅ *${botName}* is 24/7 Active on Railway Server!`, { parse_mode: "Markdown" });
    } else if (data === 'owner') {
      bot.sendMessage(chatId, `👑 *Owner & Developer*\n\nName: ${ownerName}\nNumber: +${ownerNumber}`, { parse_mode: "Markdown" });
    }
    bot.answerCallbackQuery(callbackQuery.id);
  });

  // پیئرنگ کوڈ اور میसेज ہینڈلر
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text || text.startsWith('/')) return;

    if (text.toLowerCase().startsWith('pair ')) {
      let phoneNumber = text.replace('pair ', '').trim().replace(/[^0-9]/g, '');
      
      if (phoneNumber.length < 10) {
        bot.sendMessage(chatId, `❌ Please provide a valid phone number with country code (e.g., pair 923256326517)`);
        return;
      }

      bot.sendMessage(chatId, `⏳ Generating WhatsApp Pairing Code for \`+${phoneNumber}\`...\nPlease wait up to 15 seconds.`, { parse_mode: "Markdown" });

      try {
        const { state, saveCreds } = await useMultiFileAuthState(`./sessions_${chatId}`);
        const sock = makeWASocket({
          auth: state,
          printQRInTerminal: false,
          logger: pino({ level: 'silent' })
        });

        if (!sock.authState.creds.registered) {
          await delay(1500);
          let pairingCode = await sock.requestPairingCode(phoneNumber);
          pairingCode = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
          
          bot.sendMessage(chatId, `✅ *Your WhatsApp Pairing Code:*\n\`\`\`${pairingCode}\`\`\`\n\n📌 *How to use:* Open WhatsApp -> Linked Devices -> Link with phone number instead -> Enter this code.`, { parse_mode: "Markdown" });
        } else {
          bot.sendMessage(chatId, `⚠️ This number is already connected or registered!`);
        }

        sock.ev.on('creds.update', saveCreds);
      } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, `❌ Failed to generate pairing code. Please try again later.`);
      }
    }
  });
}

module.exports = { startBot };
