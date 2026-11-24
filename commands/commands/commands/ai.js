module.exports = async function(sock, m, command, from, q) {
    const aiCmds = ['chatgpt', 'gemini', 'deepseek', 'copilot'];
    if (!aiCmds.includes(command)) return false;

    await sock.sendMessage(from, { text: `🤖 *اے آئی اسسٹنٹ [.${command}]:* فرمائیے شہزاد بھائی، آپ کا سوال پروسیس ہو رہا ہے!` }, { quoted: m });
    return true;
};
