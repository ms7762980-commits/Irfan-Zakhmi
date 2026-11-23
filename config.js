import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
  ['923256326517', 'Irfan Zakhmi', true]
]
global.suittag = ['923256326517']
global.prems = ['923256326517']

global.BOT_NAME = "IRFAN ZAKHMI MD"
global.OWNER_NAME = "Irfan Zakhmi"
global.DEVELOPER_NAME = "Shahzad Zakhmi"
global.BOT_PIC_URL = "https://files.catbox.moe/92e8l2.jpg"

global.TG_BOT_TOKEN = "8793716383:AAECYgD7T5cmVks0IKWq5XDGrJ42IY-FMp0"
global.TG_GROUP_ID = "-1002422312211"
global.TG_GROUP_LINK = "https://t.me/"
global.TG_CHANNEL_ID = "-1002422312211"
global.TG_CHANNEL_LINK = "https://t.me/"
global.WA_CHANNEL_LINK = "https://whatsapp.com/channel/0059..."
global.TG_ADMIN_IDS = ["923256326517"]

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})

export default global
