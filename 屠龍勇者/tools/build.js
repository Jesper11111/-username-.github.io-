// 黑暗大陸：建置＋混淆（ARCHITECTURE.md 第 58 節）。做法和修仙的 tools/build.js 相同（修仙 ARCHITECTURE.md 第 72 節）：
//   ① index.html 的 <script src="data/xxx.js?v=版本"> 依原順序接成一支 data/game.js，包進同一個函式範圍 (function(){ … })()：
//      player 等遊戲資料不再是全域變數，主控台打 player.gold = … 會出現 player is not defined。
//   ② HTML 與程式字串裡的事件（onclick="…" 等）用到的頂層函式／變數才掛回 window（等於「按按鈕」本來就能做的事）。
//      事件字串裡不要直接寫 player（建置會失敗）；程式內不要用 window.某函式 = … 替換遊戲函式。
//   ③ terser 壓縮＋混淆。gm.html 用到的 data/*.js 另外接成 data/gm-lib.js（只壓縮、不包範圍：GM 頁的內嵌程式要用全域名稱）。
//   ④ 不複製 *.md、tools/、.claude/、.bat、原始的 data/*.js。
// 發佈：根目錄 tools/build.js（GitHub Actions 執行）最後呼叫 buildDragon，覆蓋原樣複製過去的 dist/屠龍勇者/。
// 本機單獨測試：在 repo 根目錄 npm ci 後執行 node 屠龍勇者/tools/build.js → dist/屠龍勇者/，再開 http 伺服器測（存檔和開發版同網域會共用）。
// 開發與測試照舊用原始的 index.html（各檔分開載入、全部是全域）。
const fs = require('fs'), path = require('path');
const ROOT_MODULES = path.resolve(__dirname, '..', '..', 'node_modules');
const acorn = require(path.join(ROOT_MODULES, 'acorn'));
const { minify } = require(path.join(ROOT_MODULES, 'terser'));

const SRC = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
// 不能掛回 window 的名稱（掛回去就等於開放主控台改資料）；事件字串裡出現就建置失敗
const FORBIDDEN = new Set(['player', 'hunt', 'session', 'cloudSb', 'cloudUser']);
const SKIP = name => name.startsWith('.') || name.endsWith('.md') || name.endsWith('.bat') || ['data', 'tools', 'index.html', 'gm.html'].includes(name);

function scriptList(html) {
    return [...html.matchAll(/<script src="(data\/[^"?]+)\?v=([^"]+)"><\/script>/g)].map(m => ({ file: m[1], ver: m[2], tag: m[0] }));
}
function topLevelDecls(files) {
    const decl = {};
    for (const f of files) {
        const ast = acorn.parse(read(f), { ecmaVersion: 'latest', sourceType: 'script' });
        for (const n of ast.body) {
            if (n.type === 'FunctionDeclaration') decl[n.id.name] = 'function';
            else if (n.type === 'ClassDeclaration') decl[n.id.name] = 'class';
            else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { if (d.id.type === 'Identifier') decl[d.id.name] = n.kind; });
        }
    }
    return decl;
}
// 事件字串裡用到的頂層名稱；程式裡「剛好是頂層函式名稱」的字串字面值也一併公開（函式名以字串傳進去再組成 onclick 的寫法）
function handlerNames(texts, decl) {
    const snippets = [];
    for (const t of texts) {
        for (const m of t.matchAll(/\bon[a-z]+\s*=\s*\\?(["'])([\s\S]*?)\\?\1/g)) snippets.push(m[2]);
        for (const m of t.matchAll(/javascript:([^"']*)/g)) snippets.push(m[1]);
    }
    const used = new Set();
    for (const t of texts) for (const m of t.matchAll(/["'`]([A-Za-z_$][\w$]*)["'`]/g)) if (decl[m[1]] === 'function') used.add(m[1]);
    for (let h of snippets) {
        h = h.replace(/\$\{[^{}]*(\{[^{}]*\}[^{}]*)*\}/g, ' 0 ').replace(/'[^']*'|"[^"]*"|`[^`]*`/g, ' 0 ');
        for (const m of h.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)/g)) if (decl[m[2]]) used.add(m[2]);
    }
    return [...used].sort();
}
function stripHtmlComments(html) { return html.replace(/<!--[\s\S]*?-->/g, ''); }
function copyDir(src, dst, skip) {
    fs.mkdirSync(dst, { recursive: true });
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
        if (skip && skip(e.name)) continue;
        const s = path.join(src, e.name), d = path.join(dst, e.name);
        if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
    }
}

async function buildDragon(OUT) {
    fs.rmSync(OUT, { recursive: true, force: true });
    copyDir(SRC, OUT, SKIP);
    fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });

    // ---- 遊戲本體 ----
    const html = read('index.html');
    const list = scriptList(html);
    if (!list.length) throw new Error('屠龍勇者/index.html 找不到 data/*.js');
    const ver = list[0].ver;
    if (list.some(s => s.ver !== ver)) throw new Error('屠龍勇者/index.html 的 ?v= 版本號不一致');
    const files = list.map(s => s.file);
    const decl = topLevelDecls(files);
    const exportsList = handlerNames([html, ...files.map(read)], decl);
    const bad = exportsList.filter(n => FORBIDDEN.has(n));
    if (bad.length) throw new Error('黑暗大陸的事件字串裡直接用到不能公開的名稱：' + bad.join(', ') + '（請改成呼叫一個函式）');
    const fnExports = exportsList.filter(n => decl[n] === 'function');
    const varExports = exportsList.filter(n => decl[n] !== 'function');
    const glue = '\n;(function(w){'
        + fnExports.map(n => `w[${JSON.stringify(n)}]=${n};`).join('')
        + varExports.map(n => decl[n] === 'const'
            ? `w[${JSON.stringify(n)}]=${n};`
            : `Object.defineProperty(w,${JSON.stringify(n)},{configurable:true,get:function(){return ${n}},set:function(v){${n}=v}});`).join('')
        + '})(window);\n';
    const body = files.map(f => `\n// ${f}\n${read(f)}\n;`).join('');
    const bundle = `(function(){${body}${glue}})();`;
    const min = await minify(bundle, { compress: { passes: 2, keep_infinity: true }, mangle: true, format: { comments: false, ascii_only: false } });
    if (min.error) throw min.error;
    fs.writeFileSync(path.join(OUT, 'data', 'game.js'), min.code);
    let outHtml = html;
    list.forEach((s, i) => { outHtml = outHtml.replace(s.tag, i === 0 ? `<script src="data/game.js?v=${ver}"></script>` : ''); });
    fs.writeFileSync(path.join(OUT, 'index.html'), stripHtmlComments(outHtml).replace(/\n\s*\n+/g, '\n'));

    // ---- GM 頁 ----
    const gm = read('gm.html');
    const gmList = scriptList(gm);
    const gmMin = await minify(gmList.map(s => read(s.file)).join('\n;\n'), { compress: { passes: 1 }, mangle: { toplevel: false }, format: { comments: false } });
    if (gmMin.error) throw gmMin.error;
    fs.writeFileSync(path.join(OUT, 'data', 'gm-lib.js'), gmMin.code);
    let outGm = gm;
    gmList.forEach((s, i) => { outGm = outGm.replace(s.tag, i === 0 ? `<script src="data/gm-lib.js?v=${gmList[0].ver}"></script>` : ''); });
    fs.writeFileSync(path.join(OUT, 'gm.html'), stripHtmlComments(outGm));

    const kb = n => (n / 1024).toFixed(0) + ' KB';
    console.log(`黑暗大陸建置完成 v=${ver}：${files.length} 支檔案 → data/game.js ${kb(min.code.length)}（原始 ${kb(bundle.length)}）；公開 ${fnExports.length} 個函式、${varExports.length} 個變數：${varExports.join(', ')}`);
}

module.exports = { buildDragon };
if (require.main === module) {
    buildDragon(path.resolve(SRC, '..', 'dist', path.basename(SRC))).catch(e => { console.error('黑暗大陸建置失敗：', e.message || e); process.exit(1); });
}
