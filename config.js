const fs = require('fs')
const chalk = require('chalk')

// --- DATA UTAMA ---
global.owner = ['6285707149714'] // Ganti dengan nomor WhatsApp kamu
global.botNumber = '6285182291658' // Masukkan nomor bot kamu (awali dengan 62)
global.usePairingCode = true // Set true untuk pakai kode, false untuk scan QR
global.namaBot = 'Ayara Multi Device'
global.namaOwner = 'Afiya'
global.packname = 'Ayara-Bot' // Nama package sticker
global.author = 'By Afiya'   // Author sticker

// --- PENGATURAN EKONOMI (Limit & Balance) ---
global.limitAwal = 10      // Limit gratis harian untuk user biasa
global.balanceAwal = 1000  // Saldo awal user baru
global.limitPremium = 9999 // Limit untuk user premium
global.priceLimit = 1000    // Harga 1 limit jika dibeli dengan balance

// --- MEDIA ---
global.thumbnail = 'https://files.catbox.moe/pykr0e.jpg' // Link foto bot (URL)
global.thumb = fs.readFileSync('./media/thumbnail.jpg') // Path lokal jika ada

// --- PESAN REPLY (Add Msg Reply) ---
global.mess = {
    success: '✅ Berhasil!',
    admin: '❌ Perintah ini hanya untuk Admin Grup!',
    botAdmin: '❌ Bot harus menjadi Admin Grup terlebih dahulu!',
    owner: '❌ Perintah ini khusus untuk Owner Bot!',
    group: '❌ Perintah ini hanya bisa digunakan di dalam Grup!',
    private: '❌ Perintah ini hanya bisa digunakan di Chat Pribadi!',
    wait: '⏳ Sedang diproses, mohon tunggu...',
    error: '❌ Terjadi kesalahan pada fitur!',
    limit: '❌ Limit harian kamu telah habis! Silakan tunggu besok atau beli limit.',
    endLimit: 'Limit harian telah tercapai. Limit akan di-reset setiap jam 00:00.',
}

// --- UPDATE OTOMATIS ---
// Script ini akan memantau perubahan pada file config.js dan mengupdate-nya secara otomatis
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update '${__filename}'`))
	delete require.cache[file]
	require(file)
})