const express = require('express');
const { startBot } = require('./bot');
const { botName, boardName, ownerName, developerName, ownerNumber } = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html dir="ltr">
      <head>
        <meta charset="UTF-8">
        <title>${botName}</title>
        <style>
          body { background: #0d1117; color: #00ffcc; font-family: sans-serif; text-align: center; padding-top: 40px; }
          .card { background: rgba(22, 27, 34, 0.9); border: 2px solid #00ffcc; border-radius: 15px; padding: 25px; max-width: 400px; margin: auto; box-shadow: 0 0 20px rgba(0, 255, 204, 0.4); }
          h1 { color: #ff0055; text-shadow: 0 0 10px rgba(255, 0, 85, 0.5); }
          p { color: #ffffff; font-size: 15px; text-align: left; direction: ltr; margin: 8px 0; }
          .status { display: inline-block; background: #00ffcc; color: #0d1117; padding: 6px 15px; border-radius: 20px; font-weight: bold; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🔥 ${botName} 🔥</h1>
          <p><b>Board:</b> ${boardName}</p>
          <p><b>Owner & Developer:</b> ${ownerName}</p>
          <p><b>Owner Number:</b> +${ownerNumber}</p>
          <div class="status">● Status: 24/7 Active</div>
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`${botName} server is running on port ${PORT}`);
  startBot();
});
