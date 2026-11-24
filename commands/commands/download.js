module.exports = async function(sock, m, command, from, q) {
    const downloadCmds = ['tiktok', 'ttmp3', 'fb', 'igdl', 'play', 'apk'];
    if (!downloadCmds.includes(command)) return false;

    if (command === 'tiktok') {
        await sock.sendMessage(from, { text: '📥 *ٹک ٹاک ڈاؤنلوڈر:* براہ کرم ویڈیو کا لنک ساتھ ارسال کریں۔' }, { quoted: m });
    } else if (command === 'play') {
        await sock.sendMessage(from, { text: `🎵 *سونگ پلے:* آپ کی ریکوئسٹ [${q || 'گانا'}] پر پروسیسنگ جاری ہے۔..` }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: `📥 *میڈیا ڈاؤنلوডার [.${command}]:* فائل فیچ کی جا رہی ہے...` }, { quoted: m });
    }
    return true;
};
