# 怪物模型規格（屠龍勇者 ARCHITECTURE.md 18.3）：每隻怪 walk／attack × down／right／up，每格一串 [sheet, x0, y0, x1, y1]（照播放順序）
# 沒寫的方向沿用 down；FLIP＝側面朝左要翻成朝右；inset＝有格線的表內縮避開框線
def S1(x, y, w, h): return ('S1', x + 3, y + 3, x + w - 3, y + h - 3)
def A(cx, row, half=38):
    Y = {'w1': (48, 132), 'w2': (128, 207), 'a1': (220, 300), 'a2': (294, 377), 'c1': (576, 664), 'c2': (654, 738)}[row]
    return ('A', cx - half, Y[0], cx + half, Y[1])
BX_WALK = [103, 147, 190, 233, 276, 319]; BX_ATK = [360, 400, 439, 479, 518, 558, 597]
BY = {'goblin': (27, 79), 'orcWarrior': (87, 140), 'gandiOrc': (147, 200), 'orcxOrc': (208, 261), 'lizardman': (268, 322),
      'beholder': (330, 383), 'floatingEye': (392, 445), 'castor': (690, 760), 'castorAtk': (690, 725)}
def B(row, xs, idx, yrow=None):
    y0, y1 = BY[yrow or row]
    return [('B', xs[i] + 3, y0 + 3, xs[i + 1] - 3, y1 - 3) for i in idx]
T, Bh = 70, 69
SKA = {'skeleton': [68, 137, 209], 'skeletonArcher': [290, 358, 430], 'skeletonAxe': [510, 582, 651], 'ghoul': [731, 802, 873], 'spartoi': [951, 1023, 1095]}
SPEC = {}
for k, xs in SKA.items():
    walk = ['w1', 'w2'] if k in ('skeleton', 'skeletonArcher', 'spartoi') else ['w1']
    SPEC[k] = {'walk': [[A(cx, r) for r in walk] for cx in xs], 'attack': [[A(cx, r) for r in ('a1', 'a2')] for cx in xs]}
SPEC['baphomet'] = {'walk': [[A(cx, 'c1', 48)] for cx in (1168, 1252, 1334)], 'attack': [[A(cx, 'c2', 48)] for cx in (1168, 1252, 1334)]}
for k in ('goblin', 'orcWarrior', 'gandiOrc', 'orcxOrc', 'lizardman', 'beholder'):
    wi = [0, 1, 3, 4] if k == 'goblin' else [0, 1, 2, 3, 4]
    ai = [0, 1, 3, 4, 5] if k == 'goblin' else [0, 1, 2, 3] if k == 'beholder' else range(6)
    SPEC[k] = {'walk': [B(k, BX_WALK, wi)], 'attack': [B(k, BX_ATK, ai)]}
SPEC['floatingEye'] = {'walk': [B('floatingEye', BX_WALK, [0, 1])], 'attack': [B('floatingEye', BX_ATK, [0])]}
SPEC['castor'] = {'walk': [B('castor', BX_WALK, range(5))], 'attack': [B('castor', BX_WALK, [0, 1])]}   # 攻擊格只有半高，用走路的前兩格（發光法術）
# 第一張表（2026-10-12 第一批，每方向 1 格）
OLD = {
 'orc':        {'walk': [(33,63,62,T),(98,63,62,T),(163,63,61,T)], 'attack': [(33,137,62,T),(98,137,62,T),(163,63,61,T)]},
 'orcArcher':  {'walk': [(230,63,56,T),(289,63,53,T),(345,63,53,T)], 'attack': [(230,137,56,T),(289,137,53,T),(345,137,54,T)]},
 'dwarf':      {'walk': [(432,63,62,T)], 'attack': [(432,137,62,T)]},
 'wolf':       {'walk': [(549,63,66,T),(618,63,66,T)], 'attack': [(549,137,66,T),(618,137,66,T)]},
 'werewolf':   {'walk': [(250,437,66,Bh),(319,437,65,Bh),(388,437,66,Bh)], 'attack': [(703,137,64,T),(770,137,64,T),(388,511,66,Bh)]},
 'lycan':      {'walk': [(856,63,68,T),(927,63,66,T)], 'attack': [(856,137,68,T),(927,230,66,T)]},
 'drake':      {'walk': [(939,437,66,Bh),(1009,437,65,Bh),(1078,437,65,Bh)], 'attack': [(939,609,66,Bh),(1009,609,65,Bh),(1078,609,65,Bh)]},
 'blackKnight':{'walk': [(1165,63,63,T),(1231,63,62,T),(1296,63,62,T)], 'attack': [(1165,137,63,T),(1231,137,62,T),(1296,137,62,T)]},
 'giantSpider':{'walk': [(478,437,67,Bh),(549,437,66,Bh),(619,437,66,Bh)], 'attack': [(478,511,67,Bh),(549,511,66,Bh),(619,511,66,Bh)]},
}
for k, v in OLD.items():
    SPEC[k] = {a: [[S1(*b)] for b in v[a]] for a in v}
FLIP = {('S1', 289 + 3, 63 + 3), ('S1', 289 + 3, 137 + 3), ('S1', 1009 + 3, 437 + 3), ('S1', 1009 + 3, 609 + 3), ('S1', 319 + 3, 437 + 3)}
# 第四張表 C.jpg（2026-10-12，侏儒戰士…鬼魂）：每隻 3 欄＝正面／側面／背面，走路 3 格、攻擊 3～4 格；裁切框由 specC.json 提供
import json as _json, os as _os
for _k, _v in _json.load(open(_os.path.join(_os.path.dirname(__file__), 'specC.json'))).items():
    SPEC[_k] = {a: [[tuple(b) for b in col] for col in _v[a]] for a in _v}
# 第五張表 D.jpg（2026-10-12，沉船海灣～泰坦墓穴）：AI 圖每列常混到別隻怪，逐格挑「真的是這隻」的圖，每方向 1 格；裁切框 specD.json
for _k, _v in _json.load(open(_os.path.join(_os.path.dirname(__file__), 'specD.json'))).items():
    SPEC[_k] = {a: [[tuple(b) for b in col] for col in _v[a]] for a in _v}
# 第六張表 E.jpg（2026-10-12，沉船海灣重畫版：海賊、海賊火槍手、巨蟹、溺死的水手、海賊王・德雷克）：走路 2 格、攻擊 3 格，覆蓋 D 表的版本；裁切框 specE.json
for _k, _v in _json.load(open(_os.path.join(_os.path.dirname(__file__), 'specE.json'))).items():
    SPEC[_k] = {a: [[tuple(b) for b in col] for col in _v[a]] for a in _v}
# 第七張表 F.jpg（2026-10-12，暮光法師塔：地獄犬、蛇女、墮落法師、法師塔守衛、惡魔）；地獄犬攻擊用攻擊第 3 列＋施法列（攻擊前兩列畫成蛇女）、惡魔走路用攻擊列（走路格是大張立繪）；裁切框 specF.json
for _k, _v in _json.load(open(_os.path.join(_os.path.dirname(__file__), 'specF.json'))).items():
    SPEC[_k] = {a: [[tuple(b) for b in col] for col in _v[a]] for a in _v}
# 攻擊格畫得比走路格小的怪：把攻擊列整體放大到和走路列同高（中位數）
NORM = {'hellhound', 'lamia', 'ivoryMage'}
# 第八張表 G.jpg（2026-10-12，焦灼沙漠～詛咒墓穴重畫版＋4 隻首領）：每隻正面／側面／背面各 1 張大圖，覆蓋 D 表；specG.json
for _k, _v in _json.load(open(_os.path.join(_os.path.dirname(__file__), 'specG.json'))).items():
    SPEC[_k] = {a: [[tuple(b) for b in col] for col in _v[a]] for a in _v}
NOHOLE = {'yeti', 'iceGolem', 'frostWitch', 'iceGiantKing', 'giantKingSpirit', 'snowWolf'}
