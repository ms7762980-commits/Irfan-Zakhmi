const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');
const TelegramBot = require('node-telegram-bot-api');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');
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

  // /start کمانڈ اور سیمپل کمانڈ بٹن
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const userName = msg.from.first_name || "User";
    
    const replyText = `🔥 *Welcome to ${botName}* 🔥\n\nHello ${userName}!\nThis is the official 24/7 active bot managed by *${ownerName}*.\n\n👑 *Owner:* ${ownerName}\n📱 *Number:* +\`${ownerNumber}\`\n\nClick the button below to get the pairing command sample or type:\n\`/pair ${ownerNumber}\``;
    
    const opts = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "⚡ /pair Sample Command", switch_inline_query_current_chat: `/pair ${ownerNumber}` },
            { text: "🤖 Bot Status", callback_data: "status" }
          ],
          [
            { text: "👑 Owner Info", callback_data: "owner" },
            { text: "📢 Join WhatsApp Channel", url: CHANNEL_LINK }
          ]
        ]
      }
    };
    
    bot.sendMessage(chatId, replyText, opts);
  });

  // بٹن کلک ہینڈلر
  bot.on('callback_query', async (callbackQuery) => {
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

  // /pair کمانڈ ہینڈلر
  bot.onText(/\/pair (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    let phoneNumber = match[1].trim().replace(/[^0-9]/g, '');
    
    if (phoneNumber.length < 10) {
      bot.sendMessage(chatId, `❌ Please provide a valid phone number with country code.\nExample: \`/pair ${ownerNumber}\``, { parse_mode: "Markdown" });
      return;
    }

    bot.sendMessage(chatId, `⏳ *[${botName}]*\nConnecting securely to WhatsApp servers for \`+${phoneNumber}\`...\nPlease wait.`, { parse_mode: "Markdown" });
    generatePairingCode(bot, chatId, phoneNumber);
  });
}

// واٹس ایپ پیئرنگ کوڈ جنریٹ کرنے کا فول پروف اور ایرر فری فنکشن
async function generatePairingCode(bot, chatId, phoneNumber) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(`./sessions_${chatId}_${Date.now()}`);
    
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.macOS("Chrome"),
      logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    let codeRequested = false;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      
      // جب کنکشن اسٹیبلش ہو جائے تو پیئرنگ کوڈ ریکویسٹ کریں تاکہ کوئی ٹائم آؤٹ ایرر نہ آئے
      if (!codeRequested && !sock.authState.creds.registered) {
        codeRequested = true;
        try {
          await delay(2500);
          let pairingCode = await sock.requestPairingCode(phoneNumber);
          pairingCode = pairingCode?.match(/.{1,4}/g)?.join("-") || pairingCode;
          
          const responseText = `✨ *${botName} Official Pairing System* ✨\n\n📱 *Number:* \`+${phoneNumber}\`\n🔑 *Pairing Code:* \`\`\`${pairingCode}\`\`\`\n\n📢 *Channel:* [Join WhatsApp Channel](${CHANNEL_LINK})\n\n📌 *Instructions:* Open WhatsApp on your phone -> Linked Devices -> Link with phone number instead -> Enter this code.`;
          
          bot.sendMessage(chatId, responseText, { parse_mode: "Markdown", disable_web_page_preview: true });
        } catch (err) {
          console.error("Pairing Request Error:", err);
          bot.sendMessage(chatId, `❌ Failed to generate pairing code. Please verify the number and try again.`);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          console.log("Connection closed safely, preventing crash.");
        }
      }
    });

  } catch (error) {
    console.error("Socket Error Handled:", error);
    bot.sendMessage(chatId, `❌ Connection error. Please try again with \`/pair ${phoneNumber}\`.`);
  }
}

module.exports = { startBot };
