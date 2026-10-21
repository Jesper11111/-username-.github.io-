// 隔離 DOM 定位回歸：PC 樓層按鈕在頂端時，戰鬥訊息框仍使用左下 CSS 定位。
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const src = fs.readFileSync(path.join(__dirname, '../data/ui-panels.js'), 'utf8');
const fn = src.slice(src.indexOf('function renderLogPop()'), src.indexOf('\nfunction huntButtonsHtml()'));
let pc = true, hasCtrl = true, geometryReads = 0;
const pop = { classList: { toggle() {} }, style: { bottom: '640px' } };
const ctrl = { offsetParent: {}, getBoundingClientRect() { geometryReads++; return { top: pc ? 100 : 500 }; } };
const frame = { getBoundingClientRect() { geometryReads++; return { bottom: 720 }; } };
const nodes = { 'log-pop': pop, frame };
const ctx = vm.createContext({
    player: {}, logDrawerOpen: true, logPopTab: 'log', isPcFrame: () => pc,
    $: id => nodes[id], document: { querySelector: () => hasCtrl ? ctrl : null }
});
vm.runInContext(fn, ctx);
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '', 'PC 應清掉舊的 inline 定位，使用左下 CSS');
assert.equal(geometryReads, 0, 'PC 不應跟著頂端上下樓操作列定位');
pc = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '224px', '手機仍應避開底部操作列');
hasCtrl = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '', '沒有操作列時恢復 CSS 定位');
hasCtrl = true; ctx.logDrawerOpen = false;
vm.runInContext('renderLogPop()', ctx);
assert.equal(pop.style.bottom, '', '關閉訊息框應清掉暫時定位');
console.log('PASS：PC 頂端樓層操作列不推高訊息框、清除舊位置、手機避開操作列、關閉／切頁恢復 CSS。');
