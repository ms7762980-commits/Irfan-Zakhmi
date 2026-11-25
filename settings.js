//base by Shahzad Zakhmi 007
//YouTube: Shahzad Zakhmi 007
//GitHub: ShahzadZakhmi007

const fs = require('fs')
const chalk = require('chalk')

//owner v card
global.ytname = "Shahzad Zakhmi 007" // آپ کا چینل نام
global.socialm = "GitHub: ShahzadZakhmi007" // آپ کا گٹ ہب
global.location = "Shujabad, Pakistan" // آپ کا علاقہ

//new
global.botname = 'شہزاد زخمی 007 واٹس ایپ بوٹ' // بوٹ کا نام
global.ownernumber = 'YOUR_NUMBER_HERE' // یہاں اپنا واٹس ایپ نمبر لکھیں (بغیر پلس کے، مثلاً 923xxxxxxxxx)
global.ownername = 'شہزاد زخمی 007' // اونر کا نام
global.websitex = "https://github.com"
global.wagc = "https://whatsapp.com"
global.themeemoji = '🛡️'
global.wm = "Shahzad Zakhmi WA Bot"
global.botscript = 'https://github.com/ShahzadZakhmi007' // اسکرپٹ لنک
global.packname = "Sticker By"
global.author = "👑 شہزاد زخمی 007 👑\n\n"
global.creator = "YOUR_JID_HERE@s.whatsapp.net" // یہاں اپنی واٹس ایپ JID درج کریں (مثلاً: 923xxxxxxxxx@s.whatsapp.net)
global.xprefix = ''
global.premium = ["YOUR_NUMBER_HERE"] // پریمیم یوزر نمبر
global.hituet = 0

//bot sett
global.typemenu = 'v8' // مینو ٹائپ
global.typereply = 'v2' // ریپلائی ٹائپ
global.autoblocknumber = '91' 
global.antiforeignnumber = '' 
global.welcome = true // ویلکم میसेज
global.anticall = true // کال کرنے پر آٹو بلاک
global.autoswview = true // آٹو اسٹیٹس ویو
global.adminevent = true 
global.groupevent = true 

//msg
global.mess = {
	limit: 'آپ کی لمیٹ ختم ہو گئی ہے!',
	nsfw: 'اس گروپ میں NSFW بند ہے، براہ کرم ایڈمن سے کہیں کہ اسے آن کرے',
    done: 'ہو گیا ✓',
    error: 'خرابی پیش آگئی!',
    success: 'یہ رہا آپ کا کام!'
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
