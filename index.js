import "./config.js";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs-extra";
import getPort from "get-port";
import { fileURLToPath } from "url";
import initializeTelegramBot from "./bot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json({ limit: "1mb" }));

const SESSIONS_DIR = path.join(process.cwd(), "sessions");
await fs.mkdirp(SESSIONS_DIR);

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    status: "Irfan Zakhmi MD Bot is Running",
  });
});

const PORT = process.env.PORT || (await getPort({ port: 3000 }));

(async function init() {
  try {
    console.log("[app] Initializing Irfan Zakhmi MD...");

    const server = app.listen(PORT, () => {
      console.log(`[app] 🚀 Server listening on port ${PORT}`);
    });

    try {
      // Initialize Telegram Bot
      await initializeTelegramBot();
      console.log("🤖 Telegram Bot started successfully!");
    } catch (error) {
      console.error("Telegram bot error:", error);
    }
  } catch (err) {
    console.error("Fatal initialization error:", err);
    process.exit(1);
  }
})();
