module.exports = async function(sock, m, command, from) {
    const toolCmds = ['sticker', 's', 'removebg', 'remini', 'weather', 'wikipedia'];
    if (!toolCmds.includes(command)) return false;

    if (command === 'sticker' || command === 's') {
        await sock.sendMessage(from, { text: '📸 *اسٹیکر میکر:* تصویر کے ساتھ یہ کمانڈ استعمال کریں۔' }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: `🛠️ *ٹول یوٹیلیٹی [.${command}]:* فیچر فعال ہے۔` }, { quoted: m });
    }
    return true;
};
