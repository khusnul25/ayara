import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { spawn } from 'child_process'
import chalk from 'chalk'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Start a child process to run main.js
 */
function start(file) {
    let args = [join(__dirname, file), ...process.argv.slice(2)]
    
    // Memberikan informasi di terminal
    console.log(chalk.cyan(`[ SYSTEM ] Memulai proses: ${file}`))
    
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })

    // Mendengarkan pesan dari child process
    p.on('message', data => {
        console.log(chalk.magenta(`[ RECEIVED ] ${data}`))
        switch (data) {
            case 'reset':
                p.kill()
                start(file)
                break
            case 'uptime':
                p.send(process.uptime())
                break
        }
    })

    // Auto Restart jika terjadi error atau keluar (crash)
    p.on('exit', code => {
        console.error(chalk.red(`[ SYSTEM ] Bot berhenti dengan kode: ${code}`))
        if (code !== 0) {
            console.log(chalk.yellow(`[ SYSTEM ] Terdeteksi crash, memulai ulang...`))
            start(file)
        }
    })

    // Menangani error tak terduga
    p.on('error', err => {
        console.error(chalk.red(`[ ERROR ] Gagal menjalankan child process: ${err}`))
    })
}

// Menjalankan fungsi start dengan file target main.js
start('main.js')