// 數字顯示格式（ARCHITECTURE.md 第 41 節）：必須是第一個載入的腳本（config-*.js 載入時就會用到）
// 1 萬以下照常加千分位（9,999）；1 萬以上改用中文單位：1.5萬、150萬、1000萬、1億、12.35億、3兆
// 小數位數依大小調整：個位數 2 位（12.35萬）、百位數 1 位（123.5萬）、千位數整數（1235萬），尾端 0 會省略

function fmtNum(n) {
    n = Number(n);
    if (!isFinite(n)) return String(n);
    let neg = n < 0, a = Math.abs(n), s;
    if (a < 1e4) s = a.toLocaleString();
    else {
        let [v, unit] = a < 1e8 ? [a / 1e4, '萬'] : a < 1e12 ? [a / 1e8, '億'] : [a / 1e12, '兆'];
        let digits = v >= 1000 ? 0 : v >= 100 ? 1 : 2;
        let r = Math.round(v * 10 ** digits) / 10 ** digits;
        if (r >= 10000 && unit !== '兆') {   // 進位後剛好滿 1 萬（例 9999.99萬 → 1億）
            r = r / 10000; unit = unit === '萬' ? '億' : '兆';
        }
        s = r.toLocaleString(undefined, { maximumFractionDigits: digits, useGrouping: false }) + unit;   // 1000萬（不加逗號）
    }
    return (neg ? '-' : '') + s;
}

// 戰鬥數字的畫面倍率（2026-09-29 使用者選「顯示 ×100」）：新制內部是小數字（凡人氣血約 52、妖獸攻擊約 0.7），
// 攻擊、氣血、靈力、傷害、回復量、戰力在畫面上一律 ×100 取整顯示（凡人氣血 5,200）；存檔、戰力榜、雲端規則的數值都不變。
// 顯示這類數字一律用 fmtCombat(v) 或 v.toCombat()，不要直接 toWan()／toFixed()。舊制倍率 1（照原本整數顯示）
function combatScale() { return typeof NUMERIC_V2 !== 'undefined' && NUMERIC_V2 ? 100 : 1; }
function fmtCombat(v) { return fmtNum(Math.round(Number(v) * combatScale())); }
Object.defineProperty(Number.prototype, 'toCombat', { value: function () { return fmtCombat(this); }, writable: true, configurable: true });

// 讓所有 xxx.toWan() 都能用（取代原本的 toLocaleString()，全遊戲統一）；字串也支援，避免誤用時報錯
Object.defineProperty(Number.prototype, 'toWan', { value: function () { return fmtNum(this); }, writable: true, configurable: true });
Object.defineProperty(String.prototype, 'toWan', {
    value: function () { let n = Number(this); return this.trim() !== '' && isFinite(n) ? fmtNum(n) : String(this); },
    writable: true, configurable: true
});
