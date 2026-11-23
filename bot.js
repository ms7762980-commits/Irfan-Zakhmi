import { spawn } from "child_process";
import config from "./config.js";
import fs from "fs";
import os from "os";
import path from "path";

export default async function initializeTelegramBot(manager) {
  const ALLOWED_GROUP_ID = String(config.TG_GROUP_ID);
  const GROUP_INVITE_LINK = config.TG_GROUP_LINK;
  const TG_CHANNEL_ID = String(config.TG_CHANNEL_ID);
  const TG_CHANNEL_LINK = config.TG_CHANNEL_LINK;
  const WA_CHANNEL_LINK = config.WA_CHANNEL_LINK;
  const BOT_PIC_URL = config.BOT_PIC_URL;
  const BOT_NAME = config.BOT_NAME;
  const OWNER_NAME = config.OWNER_NAME;
  const DEVELOPER_NAME = config.DEVELOPER_NAME;
  const ADMIN_IDS = new Set(config.TG_ADMIN_IDS.map(String));
  const TG_ADMIN_ID = config.TG_ADMIN_IDS[0];
  const BOT_TOKEN = config.TG_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.warn("❌ [bot.js] BOT_TOKEN not set — skipping Telegram bot.");
    return null;
  }

  const { default: TelegramBot } = await import("node-telegram-bot-api");
  const tbot = new TelegramBot(BOT_TOKEN, { polling: { interval: 3000, timeout: 30 } });

  function premiumBox(title, lines = []) {
    const body = Array.isArray(lines) ? lines : [lines];
    return [
      `╭━━━━━━━━━━━━━━━━━━━━╮`,
      `┃ ✦ IRFAN ZAKHMI MD`,
      `┣━━━━━━━━━━━━━━━━━━━━┫`,
      ...body.map((line) => `┃ ${line}`),
      `╰━━━━━━━━━━━━━━━━━━━━╯`,
    ].join("\n");
  }

  async function safeReply(chatId, text, opts = {}) {
    const raw = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const boxed = premiumBox("IRFAN ZAKHMI MD", [raw]);
    return tbot.sendMessage(chatId, boxed, { parse_mode: "HTML", ...opts });
  }

  console.log(`🤖 [bot.js] Telegram Bot initialized for ${BOT_NAME}`);
  return tbot;
}
