module.exports = async function(sock, m, command, from) {
    const funCmds = ['shayari', 'bewafa', 'akela', 'joke', 'dosti'];
    if (!funCmds.includes(command)) return false;

    if (command === 'shayari') {
        await sock.sendMessage(from, { text: '💔 *شہزاد زخمی شاعری:* محبت میں ہر ایک انداز نرالا دیکھا، ہم نے ہر شخص کو یہاں بدلنے والا دیکھا... 🖤' }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: `🎭 *فن سیکشن [.${command}]:* تفریحی کمانڈ فعال ہے۔` }, { quoted: m });
    }
    return true;
};
