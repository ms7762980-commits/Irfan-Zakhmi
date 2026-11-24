module.exports = async function(sock, m, command, from, isOwner) {
    const ownerCmds = ['owner', 'antilink', 'kick', 'mute', 'tagall', 'vv'];
    if (!ownerCmds.includes(command)) return false;

    if (command === 'owner') {
        await sock.sendMessage(from, { text: '👑 *Bot Owner:* شہزاد زخمی\n📞 *Contact:* 923256326517\n🚩 *Brand:* شہزاد زخمی 007' }, { quoted: m });
    } else {
        await sock.sendMessage(from, { text: `🛡️ *گروپ/اونر سسٹم [.${command}]:* کمانڈ فعال ہے۔` }, { quoted: m });
    }
    return true;
};
