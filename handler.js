import { smsg } from './lib/simple.js'

export async function handler(chatUpdate) {
    if (!chatUpdate.messages) return
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m.message) return
    
    // Inisialisasi Database Sederhana di Memori
    global.db = global.db || { chats: {} }
    
    try {
        m = smsg(this, m)
        
        // Logika Hitung Total Pesan Grup
        if (m.isGroup) {
            if (!global.db.chats[m.chat]) global.db.chats[m.chat] = { totalpesan: 0 }
            global.db.chats[m.chat].totalpesan += 1
        }

        const prefix = '.'
        const isCmd = m.text.startsWith(prefix)
        const command = isCmd ? m.text.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
        const text = m.text.replace(prefix + command, '').trim()
        
        // Data Grup
        const groupMetadata = m.isGroup ? await this.groupMetadata(m.chat) : {}
        const participants = m.isGroup ? groupMetadata.participants : []
        const isAdmin = m.isGroup ? participants.find(u => u.id === m.sender)?.admin : false

        switch (command) {
            case 'totalpesan':
            case 'statgrup':
                if (!m.isGroup) return m.reply('Fitur ini hanya untuk di dalam grup!')
                m.reply(`📊 *STATISTIK GRUP*\n\nTotal pesan terekam: *${global.db.chats[m.chat].totalpesan}* pesan.`)
                break

            case 'cekpesan':
                if (!m.isGroup) return m.reply('Hanya bisa di grup!')
                m.reply(`💌 Kamu telah mengirim pesan di grup ini. Total: *${global.db.chats[m.chat].totalpesan}*`)
                break

            case 'resettotalpesan':
                if (!m.isGroup || !isAdmin) return m.reply('Hanya Admin yang bisa reset data!')
                global.db.chats[m.chat].totalpesan = 0
                m.reply('✅ Statistik pesan grup ini telah direset ke 0.')
                break

            case 'h':
            case 'ht':
            case 'hidetag':
                if (!m.isGroup || !isAdmin) return
                this.sendMessage(m.chat, { text: text, mentions: participants.map(u => u.id) })
                break

            case 'tagall':
                if (!m.isGroup || !isAdmin) return
                let list = `––––– *TAGALL* –––––\n*Pesan:* ${text || 'Tidak ada'}\n\n`
                for (let mem of participants) list += `→ @${mem.id.split('@')[0]}\n`
                this.sendMessage(m.chat, { text: list, mentions: participants.map(u => u.id) }, { quoted: m })
                break
        }
    } catch (e) {
        console.error(e)
    }
}