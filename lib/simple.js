import pkg from '@whiskeysockets/baileys';
const { jidDecode } = pkg;

export function smsg(conn, m) {
    if (!m) return m;
    if (m.key) {
        m.id = m.key.id;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '');
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0];
        m.msg = m.message[m.mtype];
        m.text = m.msg?.text || m.msg?.caption || m.message?.conversation || m.msg?.contentText || '';
        m.reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m });
    }
    return m;
}

export function protoFunctions(conn) {
    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
    };
}