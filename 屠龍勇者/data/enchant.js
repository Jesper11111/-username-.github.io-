// 屠龍勇者：衝裝（依賴 player.js、items.js）
// 規則（天堂式）：
//   目前強化值 < 安定值：必定成功；一般卷軸 +1，祝福卷軸 +1～3
//   目前強化值 ≥ 安定值：機率成功 +1，失敗則裝備「蒸發」消失
//   詛咒卷軸：必定 -1
//   飾品（safe = -1）不能強化；最高 +15
const ENCHANT_MAX = 15;

function enchantSuccessRate(cur, safe) {
    if (cur < safe) return 1;
    return 0.5 / (cur - safe + 1.25);   // +安定→40%、+1→22%、+2→15%…
}

function enchantTargets(scrollDef) {
    const all = [...equippedList(), ...player.inv];
    return all.filter(x => {
        const d = ITEMS[x.id];
        if (d.safe == null || d.safe < 0) return false;
        return scrollDef.target === 'weapon' ? d.cat === 'weapon' : d.cat === 'armor';
    });
}

// 回傳 { ok, msg, gone }
function doEnchant(scrollUid, targetUid) {
    const scroll = findInv(scrollUid);
    const target = findAnyInst(targetUid);
    if (!scroll || !target) return { ok: false, msg: '找不到道具' };
    const sd = ITEMS[scroll.id], td = ITEMS[target.id];
    if (!enchantTargets(sd).includes(target)) return { ok: false, msg: '這張卷軸不能用在這件裝備上' };
    const cur = target.ench || 0;
    if (sd.bless >= 0 && cur >= ENCHANT_MAX) return { ok: false, msg: `已達最高 +${ENCHANT_MAX}` };
    consumeItem(scroll.id);
    const before = itemName(target);

    if (sd.bless < 0) {
        target.ench = cur - 1;
        clampHpMp();
        return { ok: true, msg: `${before} 散發出黑色的光芒……變成 ${itemName(target)}` };
    }
    if (cur < td.safe) {
        const gain = sd.bless > 0 ? rand(1, 3) : 1;
        target.ench = cur + gain;
        return { ok: true, msg: `${before} 發出${gain > 1 ? '耀眼的' : ''}藍色光芒！變成 ${itemName(target)}` };
    }
    if (chance(enchantSuccessRate(cur, td.safe))) {
        target.ench = cur + 1;
        addLog(`✨ 衝裝成功：${itemName(target)}`, 'rare');
        return { ok: true, msg: `${before} 發出藍色光芒！變成 ${itemName(target)}` };
    }
    const slot = slotOfEquipped(target.uid);
    if (slot) delete player.equip[slot];
    else removeInst(target.uid);
    clampHpMp();
    addLog(`💥 ${before} 蒸發了`, 'dead');
    return { ok: false, gone: true, msg: `${before} 發出強烈的光芒後……蒸發了！` };
}
