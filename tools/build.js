// 建置（ARCHITECTURE.md 第 72 節）：把 data/*.js 打包＋混淆成 dist/，GitHub Actions（.github/workflows/pages.yml）把 dist/ 發佈到 GitHub Pages。
//   用法：npm ci && node tools/build.js   → 產出 dist/（本機測試：在 dist/ 開 http 伺服器）
//   ① index.html 的 <script src="data/xxx.js?v=版本"> 依原順序接成一支，包進同一個函式範圍 (function(){ … })()：
//      player 等遊戲資料不再是全域變數，主控台打 player.coins = … 沒有作用。
//   ② HTML 與程式字串裡的事件（onclick="…"、onchange="…"、config 的 action: "…"、活動的 openFn: "…"）用到的頂層函式，
//      才掛回 window（等於「點按鈕」能做的事）；事件裡用到的頂層變數（例：refineSelIdx）用 getter／setter 掛回。
//      新增事件時不用改這裡：建置時自動掃描；但事件字串裡不要直接寫 player（會被擋，見下方檢查）。
//   ③ terser 壓縮＋混淆（函式範圍內的名稱全部換成短名、註解移除）。
//   ④ gm.html 用到的 data/*.js 另外接成 data/gm-lib.js（只壓縮，不包範圍：GM 頁的內嵌程式要用到這些全域名稱）。
//   ⑤ HTML 註解移除；不複製 ARCHITECTURE.md、CLAUDE.md、tools/、原始的 data/*.js。
// 開發與測試照舊用原始的 index.html（各檔分開載入、全部是全域），所以 Playwright 測試、除錯都不受影響。
const fs = require('fs'), path = require('path');
const acorn = require('acorn');
const { minify } = require('terser');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// 不能掛回 window 的名稱（掛回去就等於開放主控台改資料）；事件字串裡出現就建置失敗
const FORBIDDEN = new Set(['player', 'enemies', 'DefenseBattle', 'ZhenmoTower']);

function scriptList(html) {
    return [...html.matchAll(/<script src="(data\/[^"?]+)\?v=([^"]+)"><\/script>/g)].map(m => ({ file: m[1], ver: m[2], tag: m[0] }));
}
function topLevelDecls(files) {
    const decl = {};
    for (const f of files) {
        const ast = acorn.parse(read(f), { ecmaVersion: 2022, sourceType: 'script' });
        for (const n of ast.body) {
            if (n.type === 'FunctionDeclaration') decl[n.id.name] = 'function';
            else if (n.type === 'ClassDeclaration') decl[n.id.name] = 'class';
            else if (n.type === 'VariableDeclaration') n.declarations.forEach(d => { if (d.id.type === 'Identifier') decl[d.id.name] = n.kind; });
        }
    }
    return decl;
}
// 事件字串裡用到的頂層名稱
function handlerNames(texts, decl) {
    const snippets = [];
    for (const t of texts) {
        for (const m of t.matchAll(/\bon[a-z]+\s*=\s*\\?(["'])([\s\S]*?)\\?\1/g)) snippets.push(m[2]);
        for (const m of t.matchAll(/\baction\s*:\s*(["'`])([\s\S]*?)\1/g)) snippets.push(m[2]);
        for (const m of t.matchAll(/\bopenFn\s*:\s*(["'`])([\s\S]*?)\1/g)) snippets.push(m[2]);
        for (const m of t.matchAll(/javascript:([^"']*)/g)) snippets.push(m[1]);
    }
    const used = new Set();
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

async function build() {
    fs.rmSync(OUT, { recursive: true, force: true });
    fs.mkdirSync(path.join(OUT, 'data'), { recursive: true });

    // ---- 遊戲本體 ----
    const html = read('index.html');
    const list = scriptList(html);
    if (!list.length) throw new Error('index.html 找不到 data/*.js');
    const ver = list[0].ver;
    if (list.some(s => s.ver !== ver)) throw new Error('index.html 的 ?v= 版本號不一致');
    const files = list.map(s => s.file);
    const decl = topLevelDecls(files);
    const exportsList = handlerNames([html, ...files.map(read)], decl);
    const bad = exportsList.filter(n => FORBIDDEN.has(n));
    if (bad.length) throw new Error('事件字串裡直接用到不能公開的名稱：' + bad.join(', ') + '（請改成呼叫一個函式）');
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
    const min = await minify(bundle, {
        compress: { passes: 2, keep_infinity: true },
        mangle: true,
        format: { comments: false, ascii_only: false }
    });
    if (min.error) throw min.error;
    fs.writeFileSync(path.join(OUT, 'data', 'game.js'), min.code);

    // index.html：第一支 data 腳本換成 game.js，其餘拿掉
    let outHtml = html;
    list.forEach((s, i) => { outHtml = outHtml.replace(s.tag, i === 0 ? `<script src="data/game.js?v=${ver}"></script>` : ''); });
    fs.writeFileSync(path.join(OUT, 'index.html'), stripHtmlComments(outHtml).replace(/\n\s*\n+/g, '\n'));

    // ---- GM 頁 ----
    const gm = read('gm.html');
    const gmList = scriptList(gm);
    const gmMin = await minify(gmList.map(s => read(s.file)).join('\n;\n'), { compress: { passes: 1 }, mangle: { toplevel: false }, format: { comments: false } });
    fs.writeFileSync(path.join(OUT, 'data', 'gm-lib.js'), gmMin.code);
    let outGm = gm;
    gmList.forEach((s, i) => { outGm = outGm.replace(s.tag, i === 0 ? `<script src="data/gm-lib.js?v=${ver}"></script>` : ''); });
    fs.writeFileSync(path.join(OUT, 'gm.html'), stripHtmlComments(outGm));

    // ---- 其他檔案 ----
    const SKIP_ROOT = new Set(['data', 'dist', 'tools', 'node_modules', '.git', '.github', 'package.json', 'package-lock.json', '.gitignore']);
    for (const e of fs.readdirSync(ROOT, { withFileTypes: true })) {
        if (SKIP_ROOT.has(e.name) || e.name.startsWith('.') || e.name.endsWith('.md') || e.name === 'index.html' || e.name === 'gm.html') continue;
        const s = path.join(ROOT, e.name), d = path.join(OUT, e.name);
        if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
    }
    fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
    const kb = n => (n / 1024).toFixed(0) + ' KB';
    console.log(`建置完成 v=${ver}：${files.length} 支檔案 → data/game.js ${kb(min.code.length)}（原始 ${kb(bundle.length)}）；公開 ${fnExports.length} 個函式、${varExports.length} 個變數：${varExports.join(', ')}`);
}
build().catch(e => { console.error('建置失敗：', e.message || e); process.exit(1); });
