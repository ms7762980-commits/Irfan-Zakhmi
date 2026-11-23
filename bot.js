/**
 * Ultimate WhatsApp Bot with Web Pairing, Auto-Reaction & Full Menu
 * Owner & Creator: شہزاد زخمی (923256326517)
 * Channel: https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. ویب پیئرنگ پینل (Web Pairing Panel for Users)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ur">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>شہزاد زخمی بوٹ - Pairing Panel</title>
            <style>
                body { background-color: #0f172a; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 40px; }
                .container { background: #1e293b; padding: 30px; border-radius: 12px; display: inline-block; box-shadow: 0 4px 15px rgba(0,0,0,0.6); max-width: 400px; width: 100%; }
                input { padding: 12px; width: 85%; margin: 15px 0; border-radius: 6px; border: none; font-size: 16px; text-align: center; }
                button { background: #22c55e; color: white; border: none; padding: 12px 25px; font-size: 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
                button:hover { background: #16a34a; }
                #code-display { font-size: 20px; color: #38bdf8; margin-top: 20px; font-weight: bold; word-break: break-all; }
                .channel-link { margin-top: 20px; display: block; color: #facc15; text-decoration: none; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>شہزاد زخمی واٹس ایپ بوٹ پینل</h2>
                <p>اپنا واٹس ایپ نمبر کنٹری کوڈ کے ساتھ لکھیں (مثلاً: 92325...)</p>
                <input type="text" id="phone" placeholder="923256326517">
                <br>
                <button onclick="getPairingCode()">کوڈ حاصل کریں</button>
                <div id="code-display"></div>
                <a class="channel-link" href="https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z" target="_blank">فالو کریں: شہزاد زخمی واٹس ایپ چینل</a>
            </div>
            <script>
                async function getPairingCode() {
                    const phone = document.getElementById('phone').value
