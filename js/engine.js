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
        'max_hp_down': '最大HP減少',
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

    // 屬性相剋表
    ATTRIBUTE_MATRIX: {
        'sky': { 'sky': 1.0, 'earth': 1.1, 'man': 0.9, 'star': 1.0, 'beast': 1.0 },
        'earth': { 'sky': 0.9, 'earth': 1.0, 'man': 1.1, 'star': 1.0, 'beast': 1.0 },
        'man': { 'sky': 1.1, 'earth': 0.9, 'man': 1.0, 'star': 1.0, 'beast': 1.0 },
        'star': { 'sky': 1.0, 'earth': 1.0, 'man': 1.0, 'star': 1.0, 'beast': 1.1 },
        'beast': { 'sky': 1.0, 'earth': 1.0, 'man': 1.0, 'star': 1.1, 'beast': 1.0 }
    },

    // 職階相剋表
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
        'conqueror': { 'default': 1.0 }
    },

    // 職階攻擊力補正係數
    CLASS_ATK_MODIFIER: {
        'saber': 1.0, 'archer': 0.95, 'lancer': 1.05,
        'rider': 1.0, 'caster': 0.9, 'assassin': 0.9,
        'berserker': 1.1, 'shielder': 1.0, 'ruler': 1.1,
        'avenger': 1.1, 'moon_cancer': 1.0, 'alter_ego': 1.0,
        'pretender': 1.0, 'foreigner': 1.0, 'conqueror': 1.0
    },

    initServant: (data, levelInput) => {
        // 【修正】強制將輸入轉為整數，避免字串比對錯誤
        const level = parseInt(levelInput) || 90; 

        let hp = data.stats.natural.hp;
        let atk = data.stats.natural.atk;
        
        // 等級成長計算 (線性模擬)
        if (level > 90) {
            const ratio = (level - 90) / 30; // 120等時 ratio = 1
            // 確保 lv120 資料存在，否則不計算
            if (data.stats.lv120) {
                const maxHp = data.stats.lv120.hp;
                const maxAtk = data.stats.lv120.atk;
                hp = hp + (maxHp - hp) * ratio;
                atk = atk + (maxAtk - atk) * ratio;
            }
        }

        return {
            ...data,
            level: level,
            maxHp: Math.floor(hp),
            currentHp: Math.floor(hp),
            atk: Math.floor(atk),
            currentNp: 0,
            buffs: []
        };
    },

    getBuffTotal: (servant, type, cardType = null) => {
        if (!servant.buffs) return 0;
        let total = 0;
        
        let boostMap = {}; 
        servant.buffs.forEach(b => {
            if (b.type === 'buff_boost' && b.sub_type) {
                boostMap[b.sub_type] = (boostMap[b.sub_type] || 0) + b.val;
            }
        });

        servant.buffs.forEach(b => {
            if (b.type === type) {
                if (b.card && cardType && b.card !== cardType) return;
                
                let val = b.val;
                if (boostMap[type]) {
                    val += val * boostMap[type];
                }
                total += val;
            }
        });
        return total;
    },

    calculateTurn: (servant, target, cards, isExtra) => {
        const isBusterChain = cards.every(c => c.type === 'Buster' || (c.isNP && c.type === 'Buster'));
        const isArtsChain = cards.every(c => c.type === 'Arts' || (c.isNP && c.type === 'Arts'));
        const isQuickChain = cards.every(c => c.type === 'Quick' || (c.isNP && c.type === 'Quick'));
        
        const ownerId = cards[0].attacker.id;
        const isBraveChain = cards.length === 3 && cards.every(c => c.attacker.id === ownerId);

        return {
            chainBonus: {
                busterChain: isBusterChain,
                artsChain: isArtsChain,
                quickChain: isQuickChain,
                braveChain: isBraveChain
            }
        };
    },

    // 卡牌執行
    simulateCardExecution: (attacker, defender, card, firstCardType, isBusterChain) => {
        const isNP = card.isNP || false;
        const cardType = card.type;       // 'Arts', 'Buster', 'Quick', 'Extra'
        const pos = card.position || 0;   // 0, 1, 2
        const isCrit = card.isCrit || false;

        const npLevel = attacker.npLevel || 1; 
        const npLevelIdx = npLevel - 1; 

        // 獸之足跡
        const footprintAtk = (!isNP && card.footprint) ? card.footprint : 0;
        const baseATK = attacker.atk + footprintAtk;

        // ==========================================
        // 1. 基礎倍率與位置補正 (Damage, NP, Star)
        // ==========================================
        let dmgCardValue = 0, npCardMod = 0, starCardMod = 0;
        let posModDmg = 1.0, posModNp = 1.0, posModStar = 1.0;
        let dmgTypeMod = 1.0;

        if (isNP) {
            const npData = attacker.noble_phantasm;
            dmgCardValue = Array.isArray(npData.val) ? npData.val[npLevelIdx] : (npData.val || 450);
            
            // 寶具不吃位置補正
            if (cardType === 'Arts') { dmgTypeMod = 1.0; npCardMod = 3.0; starCardMod = 0; }
            else if (cardType === 'Buster') { dmgTypeMod = 1.5; npCardMod = 0; starCardMod = 0.1; }
            else if (cardType === 'Quick') { dmgTypeMod = 0.8; npCardMod = 1.0; starCardMod = 0.8; }
        } else {
            if (cardType === 'Arts') { dmgCardValue = 100; dmgTypeMod = 1.0; npCardMod = 3.0 + (pos * 1.5); starCardMod = 0; }
            else if (cardType === 'Buster') { dmgCardValue = 150; dmgTypeMod = 1.5; npCardMod = 0; starCardMod = 0.1 + (pos * 0.05); }
            else if (cardType === 'Quick') { dmgCardValue = 80; dmgTypeMod = 0.8; npCardMod = 1.0 + (pos * 0.5); starCardMod = 0.8 + (pos * 0.2); }
            else if (cardType === 'Extra') { dmgCardValue = 100; dmgTypeMod = 1.0; npCardMod = 1.0; starCardMod = 1.0; posModDmg = 2.0; }
            
            if (cardType !== 'Extra') {
                const posMods = [1.0, 1.2, 1.4];
                posModDmg = posMods[pos] || 1.0;
            }
        }

        // 首卡加成
        let firstCardDmgBonus = (!isNP && firstCardType === 'Buster') ? 0.5 : 0;
        let firstCardNpBonus = (!isNP && firstCardType === 'Arts') ? 1.0 : 0;
        let firstCardStarBonus = (!isNP && firstCardType === 'Quick') ? 0.2 : 0;

        // ==========================================
        // 2. 乘區與 Buff 結算
        // ==========================================
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        const defBuff = Engine.getBuffTotal(defender, 'def_up');
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', cardType);
        const npBuff = isNP ? Engine.getBuffTotal(attacker, 'np_dmg_up') : 0;
        const critBuff = isCrit ? Engine.getBuffTotal(attacker, 'crit_dmg_up') : 0;
        const powerMod = Engine.getBuffTotal(attacker, 'special_dmg_up');
        const npGainBuff = Engine.getBuffTotal(attacker, 'np_gain_up');
        const starGenBuff = Engine.getBuffTotal(attacker, 'star_gen_up');
        
        // 相剋
        let classAffinity = Engine.CLASS_MATRIX[attacker.class] ? (Engine.CLASS_MATRIX[attacker.class][defender.class] || Engine.CLASS_MATRIX[attacker.class]['default'] || 1.0) : 1.0;
        if (attacker.class === 'berserker' && defender.class === 'shielder') classAffinity = 1.0;
        let attributeMod = Engine.ATTRIBUTE_MATRIX[attacker.attribute] ? (Engine.ATTRIBUTE_MATRIX[attacker.attribute][defender.attribute] || 1.0) : 1.0;
        let classAtkMod = Engine.CLASS_ATK_MODIFIER[attacker.class] || 1.0;

        // 寶具特攻
        let specialNPMod = 1.0;
        if (isNP && attacker.noble_phantasm.special_mod) {
            const mod = attacker.noble_phantasm.special_mod;
            const targetTraits = Array.isArray(mod.trait) ? mod.trait : [mod.trait];
            const enemyTraits = (defender.traits || []).concat([defender.attribute]);
            if (targetTraits.some(t => enemyTraits.includes(t))) specialNPMod = mod.val;
        }

        // ==========================================
        // 3. 傷害總公式計算
        // ==========================================
        let baseDmg = baseATK * 0.23 * classAtkMod;
        let cardFactor = (dmgTypeMod * posModDmg * (1 + cardBuff)) + firstCardDmgBonus;
        let buffsFactor = Math.max(0, 1 + atkBuff - defBuff);
        let specialFactor = Math.max(0, 1.0 + critBuff + npBuff + powerMod);
        let critMultiplier = isCrit ? 2.0 : 1.0;

        let totalDamage = baseDmg * (dmgCardValue / 100) * cardFactor * classAffinity * attributeMod * buffsFactor * specialFactor * critMultiplier * specialNPMod;
        totalDamage *= (0.9 + Math.random() * 0.199); 
        totalDamage += (Engine.getBuffTotal(attacker, 'dmg_plus') - Engine.getBuffTotal(defender, 'dmg_cut'));
        
        if (isBusterChain && !isNP && cardType !== 'Extra') {
            totalDamage += (baseATK * 0.2); // Buster Chain 固定加傷
        }
        totalDamage = Math.max(0, Math.floor(totalDamage));

        // ==========================================
        // 4. Hit-by-Hit 結算 (Overkill, NP, 打星)
        // ==========================================
        const hitDistribution = (attacker.cards && attacker.cards.hits && attacker.cards.hits[cardType]) 
            ? attacker.cards.hits[cardType] 
            : [100]; 

        let generatedNP = 0;
        let generatedStars = 0;
        let currentEnemyHp = defender.currentHp;
        
        // 從者基礎數值
        const baseNPRate = attacker.hidden_stats ? attacker.hidden_stats.np_charge_atk : 0.5;
        const baseStarRate = attacker.hidden_stats ? attacker.hidden_stats.star_gen : 0.1;

        for (let i = 0; i < hitDistribution.length; i++) {
            let hitWeight = hitDistribution[i] / 100;
            let hitDmg = Math.floor(totalDamage * hitWeight);
            
            // Overkill 判定
            let isOverkill = (currentEnemyHp <= 0 || currentEnemyHp - hitDmg <= 0);

            // NP 計算 (紅卡若無首藍不回NP)
            if (!(cardType === 'Buster' && firstCardType !== 'Arts')) {
                let npModFactor = isOverkill ? 1.5 : 1.0;
                let hitNP = baseNPRate * ((npCardMod * (1 + cardBuff)) + firstCardNpBonus) * npModFactor * (1 + npGainBuff) * critMultiplier;
                generatedNP += hitNP;
            }

            // 打星計算 (藍卡若無首綠不打星，但有機率 Buff 還是會掉)
            let starChance = baseStarRate + (starCardMod * (1 + cardBuff)) + firstCardStarBonus + starGenBuff + (isOverkill ? 0.3 : 0);
            if (isCrit) starChance += 0.2;
            
            let stars = 0;
            while(starChance >= 1.0) { stars++; starChance -= 1.0; }
            if (Math.random() < starChance) stars++;
            generatedStars += stars;

            // 扣除血量
            currentEnemyHp -= hitDmg;
        }

        // 更新敵人血量
        defender.currentHp = Math.max(0, currentEnemyHp);

        // 回傳此卡的詳細結果
        return {
            damage: totalDamage,
            npGained: Math.floor(generatedNP * 100) / 100, // 保留小數點，最後才 Math.floor
            starsGained: generatedStars,
            isEnemyDead: defender.currentHp <= 0
        };
    }

    distributeStars: (hand, stars) => {
        hand.forEach(card => {
            card.critChance = 0;
        });
        
        for(let i=0; i<stars; i++) {
            const luckyIdx = Math.floor(Math.random() * hand.length);
            if (hand[luckyIdx].critChance < 100) {
                hand[luckyIdx].critChance += 10;
            }
        }
        return 0;
    },

    useSkill: (user, target, skill) => {
        if (!skill.effects) return;

        skill.effects.forEach(effect => {
            if (effect.type === 'np_charge') {
                target.currentNp += effect.val;
                if (target.currentNp > 300) target.currentNp = 300;
            }
            else if (effect.type === 'np_drain') {
                target.currentNp -= effect.val;
                if (target.currentNp < 0) target.currentNp = 0;
                if (target.currentGauge !== undefined) target.currentGauge = Math.max(0, target.currentGauge - effect.val);
            }
            else if (effect.type === 'star_gen_flat') {
                // UI 處理
            }
            else if (effect.type === 'deck_shuffle') {
                // UI 處理
            }
            else if (effect.type === 'hp_recover') {
                target.currentHp = Math.min(target.maxHp, target.currentHp + effect.val);
            }
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
            else if (effect.type === 'transform') {
                target.pendingTransform = effect;
            }
            else if (effect.type === 'cooldown_reduce') {
                if (target.skills) {
                    target.skills.forEach(s => {
                        // 假設 skill 物件裡有 currentCd 屬性
                        if (s.currentCd > 0) s.currentCd = Math.max(0, s.currentCd - effect.val);
                    });
                }
            }
            else {
                Engine.applyBuff(user, target, effect);
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

        //  結算每回合觸發的效果 (Regen / DoT)
        servant.buffs.forEach(b => {
            if (b.type === 'hp_regen') {
                servant.currentHp = Math.min(servant.maxHp, servant.currentHp + b.val);
            }
            if (b.type === 'np_regen') {
                servant.currentNp = Math.min(300, servant.currentNp + b.val);
            }
            if (b.type === 'star_regen') {
                // 假設全域變數是 BattleManager.stars
                // BattleManager.stars += b.val; 
            }
            if (b.type === 'poison' || b.type === 'burn' || b.type === 'curse') {
                // 毒/燒/咒扣血 (不會致死，保留 1 滴血)
                servant.currentHp = Math.max(1, servant.currentHp - b.val);
            }
        });

        // 扣減 Buff 回合數並移除過期 Buff
        servant.buffs.forEach(b => {
            if (b.turn > 0) b.turn--;
        });
        servant.buffs = servant.buffs.filter(b => b.turn !== 0 || (b.count !== null && b.count > 0));
    },
};
