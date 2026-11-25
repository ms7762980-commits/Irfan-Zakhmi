const fs = require('fs')
const chalk = require('chalk')

// --- Owner & Developer Configuration ---
global.owner = ['923256326517', '92333626862'] // آپ کے دونوں اونر نمبرز
global.ownernomer = '923256326517' // مین اونر نمبر
global.ownername = 'شہزاد زخمی' // اونر کا نام
global.developer = 'شہزاد زخمی' // ڈویلپر کا نام
global.botname = 'شہزاد زخمی بوٹ' // بوٹ کا نام
global.packname = 'شہزاد زخمی اسٹیکر'
global.author = 'Shahzad Zakhmi'

// --- Bot Settings (Public / Multi-User Mode) ---
global.mode = 'public' // 'public' کا مطلب ہے کہ ہر کوئی بوٹ استعمال کر سکتا ہے
global.autoRead = false
global.anticall = false // کال پروٹیکشن (اگر آپ چاہیں تو true کر سکتے ہیں)

// --- Messsages ---
global.mess = {
    admin: 'یہ کمانڈ صرف گروپ ایڈمن کے لیے ہے!',
    owner: 'یہ کمانڈ صرف میرے مالک (شہزاد زخمی) کے لیے ہے!',
    group: 'یہ کمانڈ صرف گروپس میں کام کرے گی!',
    private: 'یہ کمانڈ صرف ان باکس (پرائیویٹ چیٹ) میں کام کرے گی!',
    bot: 'یہ کمانڈ صرف بوٹ استعمال کر سکتا ہے!',
    wait: 'براہ کرم انتظار کریں، آپ کی درخواست پر کام ہو رہا ہے...',
    done: 'کام مکمل ہو گیا!',
}

global.thumb = fs.readFileSync('./XeonMedia/theme/cheems.jpg')

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
