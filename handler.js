import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import { unwatchFile, watchFile } from 'fs';
import chalk from 'chalk';

const isNumber = (x) => typeof x === 'number' && !isNaN(x);

export async function handler(chatUpdate) {
    if (!chatUpdate) return;
    this.pushMessage(chatUpdate.messages).catch(console.error);
    let m = chatUpdate.messages[chatUpdate.messages.length - 1];
    if (!m) return;
    if (global.db.data == null) await global.loadDatabase();
    try {
        m = smsg(this, m) || m;
        if (!m) return;
        m.exp = 0;
        m.limit = false;

        if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return;
        await (await import(`./lib/database.js?v=${Date.now()}`)).default(m, this);

        if (global.opts?.pconly && m.isGroup) return
        if (global.opts?.gconly && !m.isGroup) return
        if (typeof m.text !== 'string') m.text = '';

        const isROwner = [conn.decodeJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
        const isOwner = isROwner || m.fromMe;
        const isMods = isOwner || global.mods.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
        const isPrems = isROwner || db.data.users[m.sender].premiumTime > 0;

        if (!global.db.data.settings[this.user.jid].public && !isMods && !isOwner && !m.fromMe) return;
        if (m.isBaileys) return;

        // --- DATABASE USER (XP, LIMIT, BALANCE) ---
        let _user = global.db.data.users[m.sender];
        if (_user) {
            if (!isNumber(_user.exp)) _user.exp = 0;
            if (!isNumber(_user.limit)) _user.limit = 10;
            if (!isNumber(_user.balance)) _user.balance = 0; // Auto-create Balance
            if (!('registered' in _user)) _user.registered = false;
        }

        m.exp += Math.ceil(Math.random() * 10);

        let usedPrefix;
        const groupMetadata = (m.isGroup ? (conn.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch((_) => null)) : {}) || {};
        const participants = (m.isGroup ? groupMetadata.participants : []) || [];
        const user = (m.isGroup ? participants.find((u) => conn.getJid(u.id) === m.sender) : {}) || {}; 
        const bot = (m.isGroup ? participants.find((u) => conn.getJid(u.id) == this.user.jid) : {}) || {}; 
        const isRAdmin = user?.admin == 'superadmin' || false;
        const isAdmin = isRAdmin || user?.admin == 'admin' || false; 
        const isBotAdmin = bot?.admin || false; 

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');
        for (let name in global.plugins) {
            let plugin = global.plugins[name];
            if (!plugin || plugin.disabled) continue;
            const __filename = path.join(___dirname, name);
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename });
                } catch (e) { console.error(e); }
            }
            if (plugin.tags && plugin.tags.includes('admin')) continue;

            const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix;
            let match = (
                _prefix instanceof RegExp 
                    ? [[_prefix.exec(m.text), _prefix]]
                    : Array.isArray(_prefix) 
                        ? _prefix.map((p) => [new RegExp(str2Regex(p)).exec(m.text), new RegExp(str2Regex(p))])
                        : typeof _prefix === 'string' 
                            ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
                            : [[[], new RegExp()]]
            ).find((p) => p[1]);

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename,
                })) continue;
            }

            if (typeof plugin !== 'function') continue;
            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '');
                let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
                args = args || [];
                let text = args.join` `;
                command = (command || '').toLowerCase();
                let fail = plugin.fail || global.dfail;

                let isAccept = plugin.command instanceof RegExp 
                    ? plugin.command.test(command)
                    : Array.isArray(plugin.command) 
                        ? plugin.command.some((cmd) => cmd instanceof RegExp ? cmd.test(command) : cmd === command)
                        : typeof plugin.command === 'string' 
                            ? plugin.command === command
                            : false;

                if (!isAccept) continue;
                m.plugin = name;

                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    let chat = global.db.data.chats[m.chat];
                    let user = global.db.data.users[m.sender];
                    if (name != 'owner-unbanchat.js' && chat?.isBanned) return; 
                    if (name != 'owner-unbanuser.js' && user?.banned) return;
                }

                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue; }
                if (plugin.owner && !isOwner) { fail('owner', m, this); continue; }
                if (plugin.premium && !isPrems) { fail('premium', m, this); continue; }
                if (plugin.group && !m.isGroup) { fail('group', m, this); continue; }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue; }
                if (plugin.admin && !isAdmin) { fail('admin', m, this); continue; }
                if (plugin.register && !_user.registered) { fail('unreg', m, this); continue; }

                m.isCommand = true;
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17; 
                if (xp > 200) m.reply('Ngecit -_-');
                else m.exp += xp;

                if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
                    this.reply(m.chat, `Limit habis, beli via *${usedPrefix}buy limit*`, m);
                    continue;
                }

                let extra = {
                    match, usedPrefix, noPrefix, args, command, text, conn: this, participants, groupMetadata, user, bot, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename,
                };

                try {
                    await plugin.call(this, m, extra);
                    if (!isPrems) m.limit = m.limit || plugin.limit || false;
                } catch (e) {
                    m.error = e;
                    console.error(e);
                    if (e) m.reply(format(e));
                } finally {
                    if (m.limit) m.reply(+m.limit + ' Limit terpakai ✔️');
                }
                break;
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        // --- LOGIKA HITUNG PESAN & DATABASE CHAT ---
        let chat = global.db.data.chats[m.chat];
        if (m.isGroup && chat) {
            if (!isNumber(chat.totalpesan)) chat.totalpesan = 0;
            chat.totalpesan += 1; // Database total pesan per grup
        }

        let user = global.db.data.users[m.sender];
        if (m && user) {
            user.exp += m.exp;
            user.limit -= m.limit * 1;
        }

        try {
            await (await import(`./lib/print.js`)).default(m, this);
        } catch (e) { console.log(e); }
        
        if (global.db.data.settings[this.user.jid]?.autoread) await conn.readMessages([m.key]);
    }
}

export async function deleteUpdate(message) {
    try {
        const { fromMe, id, participant } = message;
        if (fromMe) return;
        let msg = this.serializeM(this.loadMessage(id));
        if (!msg || !msg.isGroup) return; // Anti-Delete HANYA di Group

        let chat = global.db.data.chats[msg.chat];
        if (!chat || !chat.delete) return; 

        await this.reply(msg.chat, `Terdeteksi @${participant.split`@`[0]} menghapus pesan.`, msg, { mentions: [participant] });
        this.copyNForward(msg.chat, msg, false).catch((e) => console.log(e));
    } catch (e) { console.error(e); }
}

export async function participantsUpdate({ id, participants, action, simulate = false }) {
    if (this.isInit && !simulate) return;
    if (global.db.data == null) await loadDatabase();
    let chat = global.db.data.chats[id] || {};
    switch (action) {
        case 'add':
            if (chat.welcome) {
                for (let user of participants) {
                    let userJid = this.getJid(user)
                    let avatar = await this.profilePictureUrl(userJid, 'image').catch(() => 'https://i.ibb.co/2WzLyGk/profile.jpg')
                    let text = (this.welcome || 'Welcome @user').replace('@user', '@' + userJid.split('@')[0])
                    await this.sendMessage(id, { image: { url: avatar }, caption: text, mentions: [userJid] })
                }
            }
            break;
    }
}

export async function groupsUpdate(groupsUpdate) {
    for (const groupUpdate of groupsUpdate) {
        const id = groupUpdate.id;
        let chats = global.db.data.chats[id];
        if (!chats?.detect) continue;
        if (groupUpdate.subject) await this.sendMessage(id, { text: 'Judul diganti: ' + groupUpdate.subject });
    }
}

global.dfail = (type, m, conn) => {
    let msg = {
        rowner: `Khusus Developer`,
        owner: `Khusus Owner`,
        premium: `Khusus Premium`,
        group: `Hanya di Grup`,
        admin: `Hanya Admin Grup`,
        botAdmin: `Bot harus Admin`,
        unreg: `Daftar dulu: .daftar Nama.Umur`
    }[type]
    if (msg) return conn.reply(m.chat, msg, m)
}

let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
    unwatchFile(file);
    console.log(chalk.redBright("Update 'handler.js'"));
    if (global.reloadHandler) console.log(await global.reloadHandler());
});