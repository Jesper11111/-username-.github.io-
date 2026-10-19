// 黑暗大陸：防改檔（ARCHITECTURE.md 第 60 節；依賴 config）
// 純前端擋不住會讀程式的人，目標是擋掉一般玩家常用的三種改法，並讓改過的存檔碰不到交易所／共用倉庫：
//   ① 本機存檔加密＋簽章（saveEncode／saveDecode）：localStorage 裡是亂碼，用存檔編輯器或手改文字 → 簽章不符 → 標記
//   ② 雲端存檔簽章（guardCloudSig）：上傳時對等級、經驗、金幣、道具算 SHA-256，伺服器重算（tools/anticheat.sql），
//      直接用 API 改雲端存檔 → 伺服器擋交易所；下載到被改過的雲端存檔 → 標記
//   ③ 記憶體數值偽裝（guardWrap）：金幣、經驗、等級等不以原本的數字存在記憶體，修改器（GameGuardian、Cheat Engine）搜不到；被改到 → 標記
// 標記＝player.integrity = { flagged, reason, at }：存在存檔裡，上傳後伺服器記成 tamper，交易所／共用倉庫擋到管理者處理為止。不擋單機遊玩。

// ───────── 共用：雜湊 ─────────
function guardHash(str, seed) {   // cyrb53：53 位元，回傳 14 位十六進位
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

// ───────── 標記 ─────────
// 同一個原因 24 小時內只記一次（伺服器以 reason＋at 判斷是不是新事件）
function guardFlag(reason, p = player) {
    if (!p || SIM_MODE) return;
    const ig = p.integrity;
    if (ig && ig.flagged && ig.reason === reason && Date.now() - Date.parse(ig.at) < 24 * 3600 * 1000) return;
    p.integrity = { flagged: true, reason, at: new Date().toISOString() };
}

// ───────── ① 本機存檔加密＋簽章 ─────────
// 格式：'DS1' + 初始值 8 位 + 簽章 28 位 + base64(XOR 後的 UTF-8)。初始值由內容算出：同樣內容得到同樣的文字（cloud.js 用文字比對判斷有沒有變動）
const GUARD_LS_KEY = 'q7Lx!dS-2026-ark';
const GUARD_FMT_KEY = 'dragonSlayer_sv';   // 這台裝置的存檔已全部轉成加密格式；之後再出現未加密的存檔＝被換過
const GUARD_SINCE = Date.parse('2026-10-20T00:00:00+08:00');   // 這之後的存檔代碼一定有簽章
function guardStream(seed) {   // mulberry32
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return (t ^ (t >>> 14)) >>> 0;
    };
}
function guardXor(bytes, nonceHex) {
    const next = guardStream(parseInt(guardHash(GUARD_LS_KEY + nonceHex, 3).slice(-8), 16));
    let r = 0;
    for (let i = 0; i < bytes.length; i++) {
        if ((i & 3) === 0) r = next();
        bytes[i] ^= (r >>> ((i & 3) * 8)) & 255;
    }
    return bytes;
}
function guardSign(nonceHex, body) {
    return guardHash(GUARD_LS_KEY + nonceHex + body, 7) + guardHash(body + nonceHex + GUARD_LS_KEY, 11);
}
function saveEncode(text) {
    const nonce = guardHash(text, 5).slice(-8);
    const bytes = guardXor(new TextEncoder().encode(text), nonce);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    const body = btoa(bin);
    return 'DS1' + nonce + guardSign(nonce, body) + body;
}
// 回傳 { text, bad }：bad＝被修改的原因（空字串＝正常）；沒有內容回傳 null
function saveDecode(raw) {
    if (!raw) return null;
    if (raw.charAt(0) === '{') {   // 改版前的未加密存檔：這台裝置轉換過以後還出現＝被換過（更新後一週內不算：同時開著的舊版分頁會寫回未加密格式）
        let fmt = '';
        try { fmt = localStorage.getItem(GUARD_FMT_KEY); } catch (e) {}
        return { text: raw, bad: fmt && Date.now() >= GUARD_SIG_GRACE ? '本機存檔被換成未加密的內容' : '' };
    }
    if (raw.slice(0, 3) !== 'DS1') return { text: raw, bad: '本機存檔格式不明' };
    const nonce = raw.slice(3, 11), sig = raw.slice(11, 39), body = raw.slice(39);
    const bin = atob(body), bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { text: new TextDecoder().decode(guardXor(bytes, nonce)), bad: sig === guardSign(nonce, body) ? '' : '本機存檔簽章不符' };
}
// 解出存檔物件（壞掉會丟出例外，呼叫端照原本的 JSON.parse 一樣處理）
function saveParse(raw) {
    const d = saveDecode(raw);
    return d ? JSON.parse(d.text) : null;
}
// 啟動時（main.js）：這台裝置的未加密存檔全部轉成加密格式，記下已轉換
function saveFormatMigrate() {
    try {
        if (localStorage.getItem(GUARD_FMT_KEY)) return;
        for (let i = 0; i < MAX_SLOTS; i++) {
            const raw = localStorage.getItem(slotKey(i));
            if (raw && raw.charAt(0) === '{') { JSON.parse(raw); localStorage.setItem(slotKey(i), saveEncode(raw)); }
        }
        localStorage.setItem(GUARD_FMT_KEY, '1');
    } catch (e) {}
}

// ───────── ② 雲端存檔簽章 ─────────
// ⚠️ 必須和 tools/anticheat.sql 的 dragon_sig_key()、dragon_save_canon() 完全一致
const GUARD_SIG_KEY = 'dS-guard-7f3c91ae-2026';
const GUARD_SIG_GRACE = Date.parse('2026-10-26T00:00:00+08:00');   // 這之後上傳的雲端存檔一定要有簽章（同 dragon_sig_grace）
function guardCv(v) {   // 和 PostgreSQL 的 jsonb ->> 取出的文字一致
    if (v == null) return '';
    if (typeof v === 'number') return isFinite(v) ? JSON.stringify(v) : '';
    if (typeof v === 'string') return v;
    if (typeof v === 'boolean') return String(v);
    return JSON.stringify(v);
}
function guardItemCanon(x) {
    x = x && typeof x === 'object' ? x : {};
    const af = Array.isArray(x.af) ? x.af.map(a => (a && typeof a === 'object' ? a : {})).map(a => guardCv(a.k) + ':' + guardCv(a.v)).join('/') : '';
    return [x.uid, x.id, x.n, x.ench, x.q].map(guardCv).join(',') + ',' + af;
}
function guardListCanon(arr) { return Array.isArray(arr) ? arr.map(guardItemCanon).join(';') : ''; }
function guardSaveCanon(uid, slot, p) {
    const eq = p.equip && typeof p.equip === 'object' && !Array.isArray(p.equip) ? p.equip : {};
    const eqs = Object.keys(eq).filter(k => eq[k] !== undefined).sort().map(k => k + '=' + guardItemCanon(eq[k])).join(';');
    return [uid, String(slot), guardCv(p.lv), guardCv(p.exp), guardCv(p.gold), 'inv:' + guardListCanon(p.inv), 'st:' + guardListCanon(p.storage), 'eq:' + eqs].join('|');
}
async function guardCloudSig(uid, slot, p) {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(GUARD_SIG_KEY + '|' + guardSaveCanon(uid, slot, p)));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return ''; }   // 不是 https（或瀏覽器不支援）：不簽，伺服器寬限期後會擋交易所
}
// 下載的雲端存檔：簽章不符（或寬限期後沒有簽章）→ 在那份存檔記上標記（會跟著下次上傳讓伺服器記 tamper）
async function guardCheckCloud(uid, slot, data, clientT) {
    if (!data || !data.player) return;
    const mine = await guardCloudSig(uid, slot, data.player);
    if (!mine) return;   // 這個瀏覽器算不出簽章（不是 https）：不判斷
    let bad = '';
    if (!data.sig) { if ((clientT || 0) >= GUARD_SIG_GRACE) bad = '雲端存檔沒有簽章'; }
    else if (data.sig !== mine) bad = '雲端存檔內容被修改';
    if (bad) guardFlag(bad, data.player);
}

// ───────── ③ 記憶體數值偽裝 ─────────
// 數字拆成 64 位元的兩半各自 XOR 亂數存放，另存一份用不同亂數的檢查碼；每次寫入都換亂數。
// 用 getter／setter 掛在 player 上：程式照舊寫 player.gold += n，JSON.stringify 也照樣存出數字
const GUARD_FIELDS = ['gold', 'exp', 'lv', 'statPoints', 'elixirs'];
const guardF64 = new Float64Array(1), guardU32 = new Uint32Array(guardF64.buffer);
const guardWrapped = new WeakSet();
function guardRnd() { return (Math.random() * 4294967296) >>> 0; }
function guardBox(p, field, value) {
    let num = false, raw, w0 = 0, w1 = 0, c0 = 0, c1 = 0, k0 = 0, k1 = 0, k2 = 0, k3 = 0;
    const set = x => {
        if (typeof x !== 'number') { num = false; raw = x; return; }
        num = true; raw = undefined;
        k0 = guardRnd(); k1 = guardRnd(); k2 = guardRnd(); k3 = guardRnd();
        guardF64[0] = x;
        w0 = guardU32[0] ^ k0; w1 = guardU32[1] ^ k1; c0 = guardU32[0] ^ k2; c1 = guardU32[1] ^ k3;
    };
    const get = () => {
        if (!num) return raw;
        const a0 = (w0 ^ k0) >>> 0, a1 = (w1 ^ k1) >>> 0;
        if (a0 !== ((c0 ^ k2) >>> 0) || a1 !== ((c1 ^ k3) >>> 0)) {
            guardFlag('記憶體數值被修改（' + field + '）', p);
            c0 = a0 ^ k2; c1 = a1 ^ k3;   // 只記一次
        }
        guardU32[0] = a0; guardU32[1] = a1;
        return guardF64[0];
    };
    set(value);
    Object.defineProperty(p, field, { enumerable: true, configurable: true, get, set });
}
function guardWrap(p) {
    if (!p || typeof p !== 'object' || guardWrapped.has(p)) return p;
    guardWrapped.add(p);
    for (const f of GUARD_FIELDS) guardBox(p, f, p[f]);
    return p;
}
