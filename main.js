import pkg from '@whiskeysockets/baileys';
const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore 
} = pkg;

import pino from 'pino';
import { Boom } from '@hapi/boom';
import { protoFunctions } from './lib/simple.js';
import { handler } from './handler.js';
import fs from 'fs';

// --- KONFIGURASI ---
global.botNumber = '628xxx'; // PASTIKAN DIAWALI 62 (TANPA + ATAU SPASI)
global.usePairingCode = true;

async function startBot() {
    // 1. Inisialisasi Auth State (Sesi)
    const { state, saveCreds } = await useMultiFileAuthState('session');
    
    // 2. Ambil Versi WhatsApp Terbaru
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Menggunakan WA v${version.join('.')}, isLatest: ${isLatest}`);

    // 3. Konfigurasi Koneksi (Browser diatur agar stabil untuk Pairing)
    const conn = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !global.usePairingCode,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        // Browser ID Sangat Penting: Gunakan format ini agar tidak ditolak WA
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        getMessage: async (key) => { return { conversation: 'Halo' } } 
    });

    // 4. Logika Pairing Code
    if (global.usePairingCode && !conn.authState.creds.registered) {
        let phoneNumber = global.botNumber.replace(/[^0-9]/g, '');
        
        // Jeda 3 detik agar sistem siap sebelum meminta kode
        setTimeout(async () => {
            try {
                let code = await conn.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(`\n`);
                console.log(`  PAIRING CODE ANDA: ${code}    `);
                console.log(`\n`);
                console.log(`Buka WA > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan No Telepon.\n`);
            } catch (err) {
                console.error(' Gagal meminta Pairing Code. Pastikan nomor benar dan internet stabil.');
                console.error('Pesan Error:', err.message);
            }
        }, 3000);
    }

    // 5. Integrasi Fungsi Simple
    protoFunctions(conn);
    global.conn = conn;

    // 6. Event: Update Sesi (Penting agar tidak login ulang terus)
    conn.ev.on('creds.update', saveCreds);

    // 7. Event: Update Koneksi
    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
            
            if (reason === DisconnectReason.badSession) {
                console.log(' Sesi Buruk, Hapus folder session dan scan ulang.');
                process.exit();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log(' Koneksi ditutup, mencoba menyambung kembali...');
                startBot();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log(' Koneksi hilang, mencoba menyambung kembali...');
                startBot();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(' Perangkat Keluar, silakan hapus session dan scan ulang.');
                process.exit();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log(' Restart diperlukan, merestart bot...');
                startBot();
            } else if (reason === DisconnectReason.timedOut) {
                console.log(' Koneksi Timed Out, mencoba menyambung kembali...');
                startBot();
            } else {
                console.log(` Alasan putus tidak diketahui: ${reason}|${connection}`);
                startBot();
            }
        } else if (connection === 'open') {
            console.log('\n BOT BERHASIL TERHUBUNG!\n');
        }
    });

    // 8. Event: Pesan Masuk
    conn.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            if (!chatUpdate.messages) return;
            await handler.call(conn, chatUpdate);
        } catch (e) {
            console.error('Error di Handler:', e);
        }
    });

    return conn;
}

// Jalankan Bot
startBot().catch(err => console.error('Error saat start bot:', err));