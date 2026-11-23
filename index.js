import express from "express";
import config from "./config.js";
import initializeTelegramBot from "./bot.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send(`${config.BOT_NAME} is 24/7 Active on Railway!`);
});

app.listen(PORT, () => {
  console.log(`${config.BOT_NAME} server is running on port ${PORT}`);
});

(async () => {
  try {
    console.log(`${config.BOT_NAME} is getting ready to connect with Telegram & WhatsApp...`);
    await initializeTelegramBot();
  } catch (error) {
    console.error("Failed to start bot:", error);
  }
})();
