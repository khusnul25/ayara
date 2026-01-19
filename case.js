const fs = require('fs');
const chalk = require('chalk');
require('./config');

module.exports = async (sock, m, chatUpdate) => {
    try {
        const { type, from, sender, body, prefix, command, args, isGroup, groupMetadata, pushname } = m;
        const db_user = JSON.parse(fs.readFileSync('./database/user.json'));
        const user = db_user.find(u => u.id === sender);
        const isOwner = global.owner.includes(sender.split('@')[0]);

        // Fungsi simpan database
        const saveDB = () => fs.writeFileSync('./database/user.json', JSON.stringify(db_user, null, 2));

        // Logika Pengurangan Limit Otomatis (kecuali Owner)
        const limitKurang = () => {
            if (!isOwner && user.limit > 0) {
                user.limit -= 1;
                saveDB();
            }
        };

        switch (command) {
            // --- MENU INFO ---
            case 'menu':
            case 'help':
                let menuTxt = `*── 「 ${global.namaBot} 」 ──*\n\n`
                menuTxt += ` ◦  *User:* ${pushname}\n`
                menuTxt += ` ◦  *Limit:* ${user.limit}\n`
                menuTxt += ` ◦  *Balance:* Rp${user.balance.toLocaleString()}\n\n`
                menuTxt += `*USER MENU*\n`
                menuTxt += ` > ${prefix}me\n`
                menuTxt += ` > ${prefix}buylimit [jumlah]\n\n`
                menuTxt += `*GROUP MENU*\n`
                menuTxt += ` > ${prefix}hidetag [teks]\n`
                menuTxt += ` > ${prefix}totag`
                menuTxt += ` > ${prefix}tagall`
                menuTxt += ` > ${prefix}kick @tag\n\n`
                menuTxt += ` > ${prefix}cekpesan`
                menuTxt += ` > ${prefix}rcekpesan`
                menuTxt += ` > ${prefix}totalchat`
                menuTxt += ` > ${prefix}rtotalchat`
                menuTxt += `*OWNER MENU*\n`
                menuTxt += ` > ${prefix}addlimit @tag [jumlah]\n`
                menuTxt += ` > ${prefix}addbalance @tag [jumlah]\n`
                sock.sendMessage(from, { text: menuTxt }, { quoted: m });
                break;

            case 'me':
            case 'limit':
                sock.sendMessage(from, { text: `*USER STATUS*\n\nNama: ${pushname}\nLimit: ${user.limit}\nBalance: Rp${user.balance.toLocaleString()}` }, { quoted: m });
                break;

            // --- EKONOMI SYSTEM ---
            case 'buylimit':
                if (!args[0]) return m.reply(`Ketik ${prefix + command} [jumlah]`);
                let amount = parseInt(args[0]);
                let harga = amount * global.priceLimit;
                if (user.balance < harga) return m.reply(`Balance tidak cukup! Harga 1 limit = Rp${global.priceLimit}`);
                user.balance -= harga;
                user.limit += amount;
                saveDB();
                m.reply(`Berhasil membeli ${amount} limit seharga Rp${harga.toLocaleString()}`);
                break;

            // --- OWNER ONLY ---
            case 'addlimit':
                if (!isOwner) return m.reply(global.mess.owner);
                let mention = m.message.extendedTextMessage?.contextInfo?.mentionedJid[0] || args[0] + '@s.whatsapp.net';
                let addAmt = parseInt(args[1]) || 10;
                let targetIdx = db_user.findIndex(u => u.id === mention);
                if (targetIdx !== -1) {
                    db_user[targetIdx].limit += addAmt;
                    saveDB();
                    m.reply(`Berhasil menambah ${addAmt} limit ke user tersebut.`);
                }
                break;

            // --- GROUP ONLY ---
case 'setwelcome': {
    if (!m.isGroup) return m.reply('Hanya untuk grup!')
    if (!isAdmin) return m.reply('Hanya admin yang bisa!')
    if (!text) return m.reply(`Masukan teks welcome!\n\nContoh:\n${usedPrefix + command} Selamat datang @user di @subject\n\nTag: @user, @subject, @desc`)
    global.db.data.chats[m.chat].sWelcome = text
    m.reply('✅ Berhasil mengatur pesan welcome khusus grup ini.')
}
break

case 'setbye': {
    if (!m.isGroup) return m.reply('Hanya untuk grup!')
    if (!isAdmin) return m.reply('Hanya admin yang bisa!')
    if (!text) return m.reply(`Masukan teks bye!\n\nContoh:\n${usedPrefix + command} Dadah @user 👋`)
    global.db.data.chats[m.chat].sBye = text
    m.reply('✅ Berhasil mengatur pesan bye khusus grup ini.')
}
break

case 'totalpesan': 
case 'totalchat': {
    let chatData = global.db.data.chats
    let groups = Object.entries(chatData).filter(([id, data]) => id.endsWith('@g.us') && data.totalpesan)
    if (groups.length === 0) return m.reply('Belum ada data.')
    let sorted = groups.sort((a, b) => b[1].totalpesan - a[1].totalpesan)
    let teks = `*📊 STATISTIK TOTAL PESAN GRUP*\n\n`
    sorted.map(([id, data], i) => {
        teks += `${i + 1}. *${conn.getName(id)}*\n   💌 ${data.totalpesan.toLocaleString()} pesan\n\n`
    })
    m.reply(teks.trim())
}
break

case 'cekpesan':
case 'cekchat': {
    if (!m.isGroup) return m.reply('Hanya di grup!')
    let chat = global.db.data.chats[m.chat]
    m.reply(`📍 *Grup:* ${await conn.getName(m.chat)}\n✉️ *Total Pesan:* ${chat.totalpesan || 0}`)
}
break

case 'resettotalpesan':
case 'rtotalpesan':
case 'resettotalchat':
case 'rtotalchat': {
    if (!isOwner) return m.reply('Khusus Owner!')
    let chats = global.db.data.chats
    Object.keys(chats).forEach(id => chats[id].totalpesan = 0)
    m.reply('✅ Seluruh statistik pesan semua grup telah direset.')
}
break

case 'resetcekpesan':
case 'resetcekchat':
case 'rcekpesan':
case 'rcekchat': {
    if (!m.isGroup) return m.reply('Hanya di grup!')
    if (!isAdmin) return m.reply('Hanya admin!')
    global.db.data.chats[m.chat].totalpesan = 0
    m.reply('✅ Statistik pesan di grup ini telah direset ke 0.')
}
break

case 'hidetag':
case 'h': {
    if (!m.isGroup) return m.reply('Hanya di grup!')
    if (!isAdmin && !isOwner) return m.reply('Hanya admin!')
    let users = participants.map(u => u.id)
    let q = m.quoted ? m.quoted : m
    let c = m.quoted ? m.quoted.text : text
    if (!c) return m.reply('Teksnya mana?')
    conn.sendMessage(m.chat, { text: c, mentions: users }, { quoted: m })
}
break

case 'totag': {
    if (!m.isGroup) return m.reply('Hanya di grup!')
    if (!isAdmin && !isOwner) return m.reply('Hanya admin!')
    if (!m.quoted) return m.reply('Reply media yang ingin di totag!')
    let users = participants.map(u => u.id)
    conn.copyNForward(m.chat, m.quoted, false, { mentions: users })
}
break

case 'tagall': {
    if (!m.isGroup) return m.reply('Hanya di grup!')
    if (!isAdmin && !isOwner) return m.reply('Hanya admin!')
    let pesan = text ? text : 'Tidak ada pesan'
    let teks = `––––– *TAGALL* –––––\n\n`
    teks += `*Pesan admin:* ${pesan}\n\n`
    for (let mem of participants) {
        teks += `→ @${mem.id.split('@')[0]}\n`
    }
    teks += `\n*Total:* ${participants.length} Member`
    conn.sendMessage(m.chat, { text: teks, mentions: participants.map(a => a.id) }, { quoted: m })
}
break