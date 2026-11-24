module.exports = async function(sock, m, command, from) {
    const islamicCmds = ['adhan', 'namaz_times', 'dua_morning', 'dua_evening', 'surah_fatiha', 'ayatul_kursi'];
    if (!islamicCmds.includes(command)) return false;

    if (command === 'adhan') {
        await sock.sendMessage(from, { text: '🕌 *اذان ریمائنڈر:* بے شک نماز مومن پر فرض ہے اپنے وقت پر۔' }, { quoted: m });
    } else if (command === 'namaz_times') {
        await sock.sendMessage(from, { text: '🕌 *نماز کے اوقات:* اپنے علاقے کے مطابق وقت کی پابندی کریں۔' }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: `📖 *اسلامی سیکشن [.${command}]:* ذکر الٰہی دلوں کا سکون ہے۔` }, { quoted: m });
    }
    return true;
};
