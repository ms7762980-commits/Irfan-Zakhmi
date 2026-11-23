import { fileURLToPath } from 'url'
import { watchFile, unwatchFile } from 'fs'

global.owner = [
  ['923256326517', 'Irfan Zakhmi', true]
]
global.suittag = ['923256326517']
global.prems = ['923256326517']

global.BOT_NAME = "IRFAN ZAKHMI MD"
global.OWNER_NAME = "Irfan Zakhmi"
global.DEVELOPER_NAME = "Shahzad"
global.BOT_PIC_URL = "https://files.catbox.moe/92e8l2.jpg"

global.TG_BOT_TOKEN = "9208160776:AAFJIagiA9NpRKTXqXNXcQFqh76DBcJkhl0"

global.WA_CHANNEL_LINK = "https://whatsapp.com/channel/0029VbEKCPj0gcfIJkc5XE3Z"

export default {
  BOT_NAME: global.BOT_NAME,
  OWNER_NAME: global.OWNER_NAME,
  DEVELOPER_NAME: global.DEVELOPER_NAME,
  TG_BOT_TOKEN: global.TG_BOT_TOKEN,
  WA_CHANNEL_LINK: global.WA_CHANNEL_LINK
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log("Update 'config.js'")
  import(`${file}?update=${Date.now()}`)
})
