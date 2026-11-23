const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');

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
  console.log(`${botName} is successfully connected and listening to Telegram!`);

  // /start کمانڈ اور گائیڈ لائنز
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `🔥 *Welcome to ${botName}* 🔥\n\nHello ${userName}!\nThis is the official 24/7 active bot managed by *${ownerName}*.\n\n👑 *Owner:* ${ownerName}\n📱 *Number:* +\`${ownerNumber}\`\n\nTo get your WhatsApp pairing code, use the exact command with your number like this:\n\`/pair ${ownerNumber}\``;
    
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
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

  // بٹن ہینڈلر
  bot.on('callback_query', (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = message.chat.id;

    if (data === 'status') {
      bot.sendMessage(chatId, `✅ *${botName}* is 24/7 Active on Railway Server!`, { parse_mode: "Markdown" });
    } else if (data === 'owner') {
      bot.sendMessage(chatId, `👑 *Owner & Developer*\n\nName: ${ownerName}\nNumber: +\`${ownerNumber}\`\nChannel: ${CHANNEL_LINK}`, { parse_mode: "Markdown" });
    }
    bot.answerCallbackQuery(callbackQuery.id);
  });

  // /pair کمانڈ ہینڈلر (مضبوط کنکشن کے ساتھ)
  bot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let phoneNumber = match[1].trim().replace(/[^0-9]/g, '');
    
    if (phoneNumber.length < 10) {
      bot.sendMessage(chatId, `❌ Please provide a valid phone number with country code.\nExample: \`/pair ${ownerNumber}\``, { parse_mode: "Markdown" });
      return;
    }

    bot.sendMessage(chatId, `⏳ *[${botName}]*\nGenerating official WhatsApp Pairing Code for \`+${phoneNumber}\`...\nPlease wait a few seconds.`, { parse_mode: "Markdown" });

    try {
      const { state, saveCreds } = await useMultiFileAuthState(`./sessions_${chatId}_${Date.now()}`);
      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
      });

      if (!sock.authState.creds.registered) {
        await delay(3000);
        let pairingCode = await sock.requestPairingCode(phoneNumber);
        pairingCode = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
        
        const responseText = `✨ *${botName} Official Pairing System* ✨\n\n📱 *Number:* \`+${phoneNumber}\`\n🔑 *Pairing Code:* \`\`\`${pairingCode}\`\`\`\n\n📢 *Channel:* [Join WhatsApp Channel](${CHANNEL_LINK})\n\n📌 *Instructions:* Open WhatsApp on your phone -> Linked Devices -> Link with phone number instead -> Enter this code.`;
        
        bot.sendMessage(chatId, responseText, { parse_mode: "Markdown", disable_web_page_preview: true });
      } else {
        bot.sendMessage(chatId, `⚠️ This number is already registered or connected!`);
      }

      sock.ev.on('creds.update', saveCreds);
    } catch (error) {
      console.error(error);
      bot.sendMessage(chatId, `❌ Connection timeout or network issue. Please try again with \`/pair ${phoneNumber}\`.`);
    }
  });
}

module.exports = { startBot };
