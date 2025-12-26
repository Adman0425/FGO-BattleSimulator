const Engine = {
    // 翻譯對照表
    BUFF_NAMES: {
        // --- 基礎數值 ---
        'atk_up': '攻擊力提升',
        'atk_down': '攻擊力下降',
        'def_up': '防禦力提升',
        'def_down': '防禦力下降',
        'atk_def_up': '攻防提升',
        'atk_def_down': '攻防下降',
        'special_dmg_up': '特攻',
        'special_dmg_down': '傷害減免',
        'dmg_resist_up': '特殊耐性提升',
        'dmg_resist_down': '特殊耐性下降',
        'atk_add_buff': '攻擊附加強化',
        'atk_add_debuff': '攻擊附加弱化',
        'dmg_cut': '被傷害減免',
        'dmg_plus': '傷害附加',
        
        // --- 寶具與暴擊 ---
        'np_dmg_up': '寶具威力提升',
        'np_dmg_down': '寶具威力下降',
        'oc_up': '充能階段上升',
        'crit_dmg_up': '暴擊威力提升',
        'crit_dmg_down': '暴擊威力下降',
        
        // --- 指令卡 ---
        'card_up': '指令卡性能提升', // 通用
        'buster_card_up': 'Buster指令卡性能提升',
        'arts_card_up': 'Arts指令卡性能提升',
        'quick_card_up': 'Quick指令卡性能提升',
        'card_gather_up': '指令卡集星提升', // 通用
        'buster_card_gather_up': 'Buster指令卡集星提升',
        'arts_card_gather_up': 'Arts指令卡集星提升',
        'quick_card_gather_up': 'Quick指令卡集星提升',
        
        // --- NP 與 星星 ---
        'np_charge': 'NP增加',
        'np_regen': '每回合NP獲得',
        'np_gain_up': 'NP獲得量提升',
        'np_gain_on_hit_up': '受擊NP獲得量提升',
        'np_gain_on_hit_down': '受擊NP獲得量下降',
        'star_gen_flat': '獲得暴擊星',
        'star_regen': '每回合獲得暴擊星',
        'star_gen_up': '暴擊星掉落率提升',
        'star_gen_down': '暴擊星掉落率下降',
        'star_gather_up': '集星率提升',
        'star_gather_down': '集星率下降',
        'crit_rate_down': '暴擊發生率下降',
        'crit_resist_up': '被暴擊發生耐性提升',
        'np_loss_turn_end': '回合結束NP減少',

        // --- 生存 ---
        'hp_recover': 'HP回復',
        'hp_regen': '每回合HP回復',
        'heal_efficacy_up': '回復量提升',
        'heal_efficacy_down': '回復量下降',
        'max_hp_up': '最大HP提升',
        'sure_hit': '必中',
        'evade': '迴避',
        'ignore_invincible': '無敵貫通',
        'invincible': '無敵',
        'anti_purge_defense': '對肅正防禦',
        'guts': '毅力',

        // --- 弱化與控制 ---
        'debuff_success_up': '弱化成功率提升',
        'debuff_success_down': '弱化成功率下降',
        'debuff_resist_up': '弱化耐性提升',
        'debuff_resist_down': '弱化耐性下降',
        'ignore_debuff_resist': '無視弱化耐性',
        'buff_removal_resist_up': '強化解除耐性提升',
        'buff_block': '強化無效',
        'debuff_immune': '弱化無效',
        'instant_death_success_up': '即死成功率提升',
        'instant_death_success_down': '即死成功率下降',
        'instant_death_resist_up': '即死耐性提升',
        'instant_death_resist_down': '即死耐性下降',
        'instant_death_immune': '即死無效',
        'np_drain': '滅氣',
        'cooldown_reduce': '技能冷卻減少',
        'stun': '眩暈',
        'charm': '魅惑',
        'sleep': '睡眠',
        'permanent_sleep': '永久睡眠',
        'skill_seal': '技能封印',
        'np_seal': '寶具封印',
        'remove_debuff': '弱化狀態解除',
        'poison': '毒',
        'poison_up': '蝕毒',
        'burn': '灼傷',
        'curse': '詛咒',
        'order_change': '交換',
        'buff_boost': '效果增幅',

        // --- 特殊/固有技能 ---
        'delayed_buff': '延遲發動效果',
        'target_focus': '目標集中',
        'mystic_eyes_death': '直死之魔眼',
        'yin_yang': '陰陽魚',
        'cage_of_stars': '星之籠',
        'fifth_form': '第五勢',
        'fifth_force': '第五盛',
        'protection_underworld': '冥界守護',
        'volumen_hydrargyrum': '完全流體',
        'reshuffle': '指令卡洗牌',
        'faceless_moon': '無貌之月',
        'burning_star_halo': '妖星火輪',
        'mermaid_flesh': '人魚肉',
        'alias_alien_octopus': '雅號·異星蛸',
        'horizon_of_light': '光之地平線',
        'blue_star_eye': '青之星瞳',
        'red_star_eye': '赤之星瞳',
        'seven_crowns': '七頂獸冠',
        'contact_with_wisdom': '與睿智的接觸',
        'magic_bullet': '魔彈',
        'robin': '羅賓鳥',
        'cherry_blossom_eater': '噬櫻者',
        'graceful_charme': '秀麗風情'
    },

    // 屬性相剋表 (1.0 = 無克制, 2.0 = 克制, 0.5 = 被克)
    ATTRIBUTE_MATRIX: {
        'sky': { 'sky': 1.0, 'earth': 1.1, 'man': 0.9, 'star': 1.0, 'beast': 1.0 },
        'earth': { 'sky': 0.9, 'earth': 1.0, 'man': 1.1, 'star': 1.0, 'beast': 1.0 },
        'man': { 'sky': 1.1, 'earth': 0.9, 'man': 1.0, 'star': 1.0, 'beast': 1.0 },
        'star': { 'sky': 1.0, 'earth': 1.0, 'man': 1.0, 'star': 1.0, 'beast': 1.1 },
        'beast': { 'sky': 1.0, 'earth': 1.0, 'man': 1.0, 'star': 1.1, 'beast': 1.0 }
    },

    // 職階相剋表 (簡化版)
    CLASS_MATRIX: {
        'saber': { 'lancer': 2.0, 'archer': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'archer': { 'saber': 2.0, 'lancer': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'lancer': { 'archer': 2.0, 'saber': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'rider': { 'caster': 2.0, 'assassin': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'caster': { 'assassin': 2.0, 'rider': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'assassin': { 'rider': 2.0, 'caster': 0.5, 'ruler': 0.5, 'conqueror': 1.0 },
        'berserker': { 'default': 1.5, 'shielder': 1.0, 'foreigner': 0.5, 'conqueror': 1.5 },
        'shielder': { 'default': 1.0 },
        'ruler': { 'moon_cancer': 2.0, 'avenger': 0.5, 'berserker': 2.0, 'conqueror': 1.0, 'default': 0.5 },
        'avenger': { 'ruler': 2.0, 'moon_cancer': 0.5, 'conqueror': 1.0 },
        'moon_cancer': { 'avenger': 2.0, 'ruler': 0.5, 'conqueror': 1.0 },
        'alter_ego': { 'rider': 1.5, 'caster': 1.5, 'assassin': 1.5, 'saber': 0.5, 'archer': 0.5, 'lancer': 0.5, 'conqueror': 1.0 },
        'pretender': { 'saber': 1.5, 'archer': 1.5, 'lancer': 1.5, 'rider': 0.5, 'caster': 0.5, 'assassin': 0.5, 'conqueror': 1.0 },
        'conqueror': { 'default': 1.0 } // 預設白字
    },

    initServant: (data, level) => {
        let hp = data.stats.natural.hp;
        let atk = data.stats.natural.atk;
        
        // 簡易等級成長計算 (線性模擬)
        if (level > 90) {
            const ratio = (level - 90) / 30;
            const maxHp = data.stats.lv120.hp;
            const maxAtk = data.stats.lv120.atk;
            hp = hp + (maxHp - hp) * ratio;
            atk = atk + (maxAtk - atk) * ratio;
        }

        return {
            ...data,
            level: parseInt(level),
            maxHp: Math.floor(hp),
            currentHp: Math.floor(hp),
            atk: Math.floor(atk),
            currentNp: 0,
            buffs: []
        };
    },

    // 獲取 Buff 總和
    getBuffTotal: (servant, type, cardType = null) => {
        if (!servant.buffs) return 0;
        let total = 0;
        
        // 1. 先計算 Buff Boost (如奧伯龍)
        let boostMap = {}; // { 'np_dmg_up': 1.0 }
        servant.buffs.forEach(b => {
            if (b.type === 'buff_boost' && b.sub_type) {
                boostMap[b.sub_type] = (boostMap[b.sub_type] || 0) + b.val;
            }
        });

        // 2. 計算實際 Buff
        servant.buffs.forEach(b => {
            if (b.type === type) {
                // 如果指定了卡色 (如 Arts卡性能)，則必須符合
                if (b.card && cardType && b.card !== cardType) return;
                
                let val = b.val;
                // 應用 Boost
                if (boostMap[type]) {
                    val += val * boostMap[type];
                }
                total += val;
            }
        });
        return total;
    },

    // 核心傷害計算
    calculateDamage: (attacker, defender, cardType, cardPosition, isCrit, isBusterChain) => {
        // 1. 基礎參數
        const ATK = attacker.atk;
        const NP_LEVEL_IDX = 4; // 【預設】使用 NP5 (索引4)。改為 0 就是 NP1。
        
        // 2. 指令卡/寶具倍率
        let cardDamageValue = 0;
        let cardTypeMod = 1.0;
        const isNP = (cardPosition === 0 && attacker.noble_phantasm.card === cardType && arguments[3] === 0); // 簡易判斷

        if (isNP) {
            const npData = attacker.noble_phantasm;
            // 【修正】處理寶具倍率陣列
            if (Array.isArray(npData.val)) {
                cardDamageValue = npData.val[NP_LEVEL_IDX] || npData.val[0];
            } else {
                cardDamageValue = npData.val || 450; // 預設 450
            }
            
            // 寶具卡色補正 (Arts: 1.0, Buster: 1.5, Quick: 0.8)
            if (cardType === 'Arts') cardTypeMod = 1.0;
            else if (cardType === 'Buster') cardTypeMod = 1.5;
            else if (cardType === 'Quick') cardTypeMod = 0.8;

        } else {
            // 普通指令卡
            if (cardType === 'Arts') { cardDamageValue = 100; cardTypeMod = 1.0; }
            else if (cardType === 'Buster') { cardDamageValue = 150; cardTypeMod = 1.5; }
            else if (cardType === 'Quick') { cardDamageValue = 80; cardTypeMod = 0.8; }
            else if (cardType === 'Extra') { cardDamageValue = 100; cardTypeMod = 1.0; } // Extra 獨立算
            
            // 卡位補正 (1st: 1.0, 2nd: 1.2, 3rd: 1.4)
            if (cardType !== 'Extra') {
                const posMods = [1.0, 1.2, 1.4];
                cardDamageValue = cardDamageValue * (posMods[cardPosition] || 1.0);
            }
        }

        // 3. 職階相剋
        let classAffinity = 1.0;
        const atkClass = attacker.class;
        const defClass = defender.class;
        
        if (Engine.CLASS_MATRIX[atkClass]) {
            classAffinity = Engine.CLASS_MATRIX[atkClass][defClass] || Engine.CLASS_MATRIX[atkClass]['default'] || 1.0;
        }
        // 狂職特殊處理
        if (atkClass === 'berserker' && defClass === 'shielder') classAffinity = 1.0;

        // 4. 陣營相剋 (天地人)
        let attributeMod = 1.0;
        if (Engine.ATTRIBUTE_MATRIX[attacker.attribute]) {
            attributeMod = Engine.ATTRIBUTE_MATRIX[attacker.attribute][defender.attribute] || 1.0;
        }

        // 5. Buff 計算
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        const defBuff = Engine.getBuffTotal(defender, 'def_up'); // 需注意無視防禦
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', cardType);
        const npBuff = isNP ? Engine.getBuffTotal(attacker, 'np_dmg_up') : 0;
        const critBuff = isCrit ? Engine.getBuffTotal(attacker, 'crit_dmg_up') : 0;
        const powerMod = Engine.getBuffTotal(attacker, 'special_dmg_up'); // 特攻狀態
        const dmgPlus = Engine.getBuffTotal(attacker, 'dmg_plus');
        const dmgCut = Engine.getBuffTotal(defender, 'dmg_cut');

        // 無視防禦判定
        const ignoreDef = attacker.buffs.some(b => b.type === 'ignore_defense') || (isNP && attacker.noble_phantasm.ignore_defense);
        const effectiveDef = ignoreDef ? 0 : defBuff;

        // 6. 寶具特攻 (Super Effective)
        let specialNPMod = 1.0; // 預設 100%
        if (isNP && attacker.noble_phantasm.special_mod) {
            const mod = attacker.noble_phantasm.special_mod;
            let match = false;
            
            // 檢查特攻對象 (Trait)
            const targetTraits = Array.isArray(mod.trait) ? mod.trait : [mod.trait];
            // 檢查敵人的 trait 或 attribute
            const enemyTraits = (defender.traits || []).concat([defender.attribute]);
            
            if (targetTraits.some(t => enemyTraits.includes(t))) {
                match = true;
            }

            if (match) {
                specialNPMod = mod.val; // e.g. 1.5
            }
        }

        // 7. 公式計算 (FGO 近似公式)
        // Dmg = ATK * Multiplier * (FirstCardBonus + (CardValue * (1 + CardBuff))) * Class * Attribute * Random * ATK_Buff * Special_Buff * NP_Buff * Crit_Buff
        
        // 簡化版公式：
        let baseDmg = ATK * (cardDamageValue / 100);
        
        // 色卡加成 (First Card Bonus 暫略，直接乘卡色係數和Buff)
        let cardFactor = cardTypeMod * (1 + cardBuff);
        if (isBusterChain) cardFactor += 0.2; // Buster Chain 加成

        let buffsFactor = Math.max(0, 1 + atkBuff - effectiveDef);
        
        // 特攻與暴擊
        let specialFactor = 1.0 + critBuff + npBuff + powerMod; 

        // 總傷害
        let totalDamage = baseDmg * cardFactor * classAffinity * attributeMod * buffsFactor * specialFactor * specialNPMod * 0.23;
        
        // 亂數 (0.9 ~ 1.099)
        const rand = 0.9 + Math.random() * 0.199;
        totalDamage *= rand;

        // 加減傷
        totalDamage += (dmgPlus - dmgCut);

        return Math.floor(Math.max(0, totalDamage));
    },

    calculateNPGain: (attacker, defender, cardType, cardPosition, damage, isCrit) => {
        // 簡易 NP 獲取公式
        // 基礎 * 卡片補正 * (1 + 藍放/綠放) * (1 + NP獲取率Buff) * 敵補正
        
        if (cardType === 'Buster') return 0; // 紅卡通常無 NP (除非有特殊被動，暫略)

        const baseNP = attacker.hidden_stats ? attacker.hidden_stats.np_charge_atk : 0.5;
        let cardMod = 1.0;
        if (cardType === 'Arts') cardMod = 3.0 + (cardPosition * 1.5); // 1st: 3.0, 2nd: 4.5, 3rd: 6.0 (概略)
        if (cardType === 'Quick') cardMod = 1.0 + (cardPosition * 0.5);
        if (cardType === 'Extra') cardMod = 1.0;

        // 如果是寶具 (假設寶具算 1st card)
        if (arguments.length > 6 || (cardPosition === 0 && attacker.noble_phantasm.card === cardType)) { 
             // 寶具的 NP 回收通常較低，這裡用 hits 修正或固定係數
             // 暫時用 Arts 3.0, Quick 1.0
        }

        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', cardType);
        const npGainBuff = Engine.getBuffTotal(attacker, 'np_gain_up');
        
        let np = baseNP * cardMod * (1 + cardBuff) * (1 + npGainBuff);
        
        if (isCrit) np *= 2; // 暴擊 NP 翻倍 (概略)
        
        // 乘上 Hit 數 (假設每 Hit 獲取相同)
        let hits = 1;
        if (attacker.cards && attacker.cards.hits && attacker.cards.hits[cardType]) {
            const hitArr = attacker.cards.hits[cardType];
            hits = hitArr.length > 0 ? hitArr.length : 1; 
        }
        
        return Math.floor(np * hits);
    },

    calculateStarGen: (attacker, defender, cardType, cardPosition, isCrit) => {
        // 簡易打星公式
        if (cardType === 'Arts') return 0; // 藍卡打星極低
        
        let stars = 0;
        let baseRate = 0.1; // 10%
        
        if (cardType === 'Quick') baseRate = 0.8 + (cardPosition * 0.2);
        if (cardType === 'Buster') baseRate = 0.1 + (cardPosition * 0.05);
        
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', cardType);
        const starGenBuff = Engine.getBuffTotal(attacker, 'star_gen_up');
        
        let chance = baseRate + cardBuff + starGenBuff;
        if (isCrit) chance += 0.2;
        
        // 乘上 Hit 數
        let hits = 1;
        if (attacker.cards && attacker.cards.hits && attacker.cards.hits[cardType]) {
            const hitArr = attacker.cards.hits[cardType];
            hits = hitArr.length > 0 ? hitArr.length : 1;
        }

        // 每一擊判斷
        for(let i=0; i<hits; i++) {
            if (Math.random() < chance) stars++;
        }
        
        return stars;
    },

    distributeStars: (hand, stars) => {
        // 簡單權重分配 (目前全隨機)
        hand.forEach(card => {
            card.critChance = 0;
        });
        
        for(let i=0; i<stars; i++) {
            const luckyIdx = Math.floor(Math.random() * hand.length);
            if (hand[luckyIdx].critChance < 100) {
                hand[luckyIdx].critChance += 10;
            }
        }
        return 0; // 剩餘星星
    },

    // 技能處理 (含 Buff 施加)
    useSkill: (user, target, skill) => {
        if (!skill.effects) return;

        skill.effects.forEach(effect => {
            
            // 1. 直接數值變更
            if (effect.type === 'np_charge') {
                target.currentNp += effect.val;
                if (target.currentNp > 300) target.currentNp = 300;
                // log...
            }
            else if (effect.type === 'np_drain') {
                target.currentNp -= effect.val; // for enemy (gauge) logic needed later
                if (target.currentGauge !== undefined) target.currentGauge = Math.max(0, target.currentGauge - effect.val);
            }
            else if (effect.type === 'star_gen_flat') {
                // UI.gameState.stars += effect.val; // 需要存取 UI state，暫略
            }
            else if (effect.type === 'deck_shuffle') {
                // UI 處理
            }
            // ... 其他即時效果

            // 2. 施加 Buff (狀態)
            else if (['atk_up', 'def_up', 'card_up', 'np_dmg_up', 'crit_dmg_up', 'invincible', 'taunt', 'np_gain_up', 'ignore_defense', 'permanent_sleep', 'anti_purge_defense'].includes(effect.type)) {
                Engine.applyBuff(user, target, effect);
            }
            
            // 3. 解除狀態
            else if (effect.type === 'remove_debuff') {
                if (target.buffs) {
                    target.buffs = target.buffs.filter(b => !b.isDebuff || b.unremovable);
                }
            }
            else if (effect.type === 'remove_buff') {
                if (target.buffs) {
                    target.buffs = target.buffs.filter(b => b.isDebuff || b.unremovable);
                }
            }
            else if (effect.type === 'remove_buff_by_name') {
                if (target.buffs && effect.buff_name) {
                    target.buffs = target.buffs.filter(b => b.name !== effect.buff_name);
                }
            }
            
            // 4. 特殊：變身 (UI 處理)
            else if (effect.type === 'transform') {
                // 標記需要變身，由 UI 執行
                target.pendingTransform = effect;
            }
        });
    },

    applyBuff: (source, target, effect) => {
        const buff = {
            id: Date.now() + Math.random(),
            name: Engine.BUFF_NAMES[effect.type] || effect.type, 
            type: effect.type, 
            val: effect.val,
            turn: effect.turn || 0,
            count: effect.count || null,
            isDebuff: effect.is_debuff || false,
            unremovable: effect.unremovable || false, 
            
            sourceId: source.id,
            card: effect.card || null,       
            trait: effect.trait || null,     
            cond_class: effect.cond_class || null,
            sub_type: effect.sub_type || null 
        };

        if (!target.buffs) target.buffs = [];
        target.buffs.push(buff);
    },

    processTurnEnd: (servant) => {
        if (!servant.buffs) return;

        // 1. 處理回合結束效果 (如奧伯龍睡眠扣NP)
        // 這裡需要遍歷找 buff.type === 'np_loss_turn_end' (暫略)

        // 2. 扣除回合數
        servant.buffs.forEach(b => {
            if (b.turn > 0) b.turn--;
        });

        // 3. 移除過期 Buff (回合=0 且 次數=0/null)
        servant.buffs = servant.buffs.filter(b => {
            if (b.turn === 0 && (b.count === null || b.count === 0)) return false;
            return true;
        });
    }
};
