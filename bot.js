const { ownerName, ownerNumber, botName, boardName, developerName, telegramToken } = require('./config');

console.log(`Initialising ${botName}...`);
console.log(`Board: ${boardName}`);
console.log(`Developer: ${developerName}`);
console.log(`Owner: ${ownerName} (+${ownerNumber})`);
console.log(`Telegram Token Loaded: ${telegramToken ? "Yes" : "No"}`);

function startBot() {
  console.log(`${botName} is getting ready to connect with Telegram & WhatsApp...`);
  // Add your connection logic here
}

module.exports = { startBot };
