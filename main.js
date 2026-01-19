import './config.js'
import { 
    makeWASocket, 
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    disconnectReason, 
    PHONENUMBER_MCC 
} from '@whiskeysockets/baileys'
import pino from 'pino'
import { Boom } from '@hapi/boom'
import fs from 'fs'
import readline from 'readline'
import { protoFunctions } from './lib/simple.js'
import { handler, participantsUpdate, deleteUpdate } from './handler.js'

// Interface untuk membaca input di terminal jika diperlukan
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    const { version } = await fetchLatestBaileysVersion()

    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !global.usePairingCode, // QR hanya muncul jika pairing code mati
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    })

    // --- LOGIKA PAIRING CODE OTOMATIS ---
    if (global.usePairingCode && !conn.authState.creds.registered) {
        let phoneNumber = global.botNumber.replace(/[^0-9]/g, '')

        // Validasi nomor (harus terdaftar di WhatsApp)
        if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
            console.log("❌ Nomor bot di config.js salah! Harus diawali kode negara (contoh: 628xxx)")
            process.exit(0)
        }

        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNumber)
                code = code?.match(/.{1,4}/g)?.join("-") || code
                console.log(`\n\n┌──────────────────────────────┐`)
                console.log(`│ 💌 PAIRING CODE ANDA: ${code} │`)
                console.log(`└──────────────────────────────┘\n\n`)
                console.log(`Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan Nomor Ponsel.\n`)
            } catch (e) {
                console.error('Gagal meminta pairing code:', e)
            }
        }, 3000)
    }

    // Aktifkan simple.js
    protoFunctions(conn)
    global.conn = conn

    // Connection Update
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason !== disconnectReason.loggedOut) {
                startBot()
            } else {
                console.log('Sesi keluar. Hapus folder session dan scan ulang.')
            }
        } else if (connection === 'open') {
            console.log('✅ Bot Berhasil Terhubung!')
        }
    })

    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            await handler.call(conn, chatUpdate)
        } catch (e) { console.error(e) }
    })

    conn.ev.on('message.delete', async (message) => {
        try { await deleteUpdate.call(conn, message) } catch (e) { console.error(e) }
    })

    conn.ev.on('group-participants.update', async (update) => {
        try { await participantsUpdate.call(conn, update) } catch (e) { console.error(e) }
    })

    return conn
}

startBot()