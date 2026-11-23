import express from "express";
import bodyParser from "body-parser";
import getPort from "get-port";
import initializeTelegramBot from "./bot.js";
import "./config.js";

const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    status: "Irfan Zakhmi MD Bot is Running 24/7",
  });
});

const PORT = process.env.PORT || (await getPort({ port: 8080 }));

(async function init() {
  try {
    console.log("[app] Starting Irfan Zakhmi MD Server...");

    app.listen(PORT, () => {
      console.log(`[app] 🚀 Server successfully listening on port ${PORT}`);
    });

    try {
      await initializeTelegramBot();
      console.log("🤖 Telegram Bot initialized successfully!");
    } catch (err) {
      console.error("Telegram bot initialization error:", err);
    }
  } catch (err) {
    console.error("Fatal initialization error:", err);
    process.exit(1);
  }
})();
