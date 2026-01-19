import { decodeJid, getDevice } from '@whiskeysockets/baileys'
import extractMessageContent from '@whiskeysockets/baileys'

export function smsg(conn, m, store) {
    if (!m) return m
    let M = m.constructor
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0]
        m.msg = (m.mtype == 'viewOnceMessageV2' ? m.message[m.mtype].message[Object.keys(m.message[m.mtype].message)[0]] : m.message[m.mtype])
        m.text = m.msg.text || m.msg.caption || m.msg.contentText || m.msg || ''
        if (typeof m.text !== 'string') {
            if (['protocolMessage', 'advertisementMessage', 'reactionMessage', 'stickerMessage'].includes(m.mtype)) {
                m.text = ''
            } else {
                m.text = m.text?.conversation || m.text?.extendedTextMessage?.text || m.text?.caption || ''
            }
        }
        
        // Fungsi m.reply agar lebih pendek
        m.reply = (text, chatId, options) => conn.reply(chatId ? chatId : m.chat, text, m, options)
        
        // Fungsi m.copyNForward untuk fitur Anti-Delete
        m.copyNForward = (jid, forceForward = false, options = {}) => conn.copyNForward(jid, m, forceForward, options)
    }
    return m
}

export function logic(check, b, c) {
    if (check.constructor !== Array) throw new Error('Check must be an array')
    if (check.length !== b.length || b.length !== c.length) throw new Error('Length mismatch')
    for (let i = 0; i < check.length; i++) {
        if (check[i]) return b[i]
    }
    return c[0]
}

// Fungsi pembantu tambahan
export function protoFunctions(conn) {
    conn.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = decodeJid(jid)
            return decode
        }
        return jid
    }
    
    conn.reply = (jid, text, quoted, options) => {
        return conn.sendMessage(jid, { text: text, ...options }, { quoted })
    }

    conn.getName = (jid, withoutContact = false) => {
        jid = conn.decodeJid(jid)
        let v
        if (jid.endsWith('@g.us')) return new Promise(async (resolve) => {
            v = conn.chats[jid] || {}
            if (!(v.name || v.subject)) v = await conn.groupMetadata(jid).catch(_ => ({}))
            resolve(v.name || v.subject || jid)
        })
        else v = jid === conn.user.id ? conn.user : (conn.chats[jid] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || jid.split('@')[0]
    }
    
    // Untuk fitur anti-delete
    conn.copyNForward = async (jid, m, forceForward = false, options = {}) => {
        let vtype
        if (options.readViewOnce) {
            m.message = m.message && m.message.viewOnceMessageV2 && m.message.viewOnceMessageV2.message ? m.message.viewOnceMessageV2.message : (m.message || undefined)
            vtype = Object.keys(m.message)[0]
            delete m.message[vtype].viewOnce
            m.message = {
                ...m.message
            }
        }
        let content = m.message
        let ctype = Object.keys(content)[0]
        let contextInfo = {}
        if (ctype != "conversation") contextInfo = m.message[ctype].contextInfo
        content[ctype].contextInfo = {
            ...contextInfo,
            ...options.contextInfo
        }
        const message = {
            ...content,
            ...options
        }
        return await conn.sendMessage(jid, message, {
            quoted: m,
            ...options
        })
    }
}
