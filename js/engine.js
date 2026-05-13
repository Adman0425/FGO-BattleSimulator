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
        'extra_dmg_up': 'Extra指令卡威力提升',
        
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
        // 強制將輸入轉為整數，避免字串比對錯誤
        const level = parseInt(levelInput) || 90; 

        let hp = data.stats.natural.hp;
        let atk = data.stats.natural.atk;
        
        // 等級成長計算
        if (level > 90) {
            const ratio = (level - 90) / 30; // 120等時 ratio = 1
            if (data.stats.lv120) {
                const maxHp = data.stats.lv120.hp;
                const maxAtk = data.stats.lv120.atk;
                hp = hp + (maxHp - hp) * ratio;
                atk = atk + (maxAtk - atk) * ratio;
            }
        }

        let currentNp = 0;
        let buffs = [];

        // 概念禮裝
        if (data.ce) {
            hp += data.ce.hp || 0;
            atk += data.ce.atk || 0;
            // 如果禮裝有常駐 Buff (例如起始 NP)，塞入陣列
            if (data.ce.buffs) buffs.push(...data.ce.buffs); 
        }

        // 附加技能
        if (data.appends) {
            // EX 卡性能提升 (Lv1=30% ~ Lv10=50%)
            if (data.appends.skill1 > 0) {
                let exVal = 30 + ((data.appends.skill1 - 1) / 9) * 20;
                // turn: -1 代表永久被動
                buffs.push({ id: 'app1', name: '附加技1', type: 'extra_dmg_up', val: exVal / 100, turn: -1, isDebuff: false, unremovable: true });
            }
            // 初始 NP 增加 (Lv1=10% ~ Lv10=20%)
            if (data.appends.skill2 > 0) {
                let npVal = 10 + Math.floor(((data.appends.skill2 - 1) / 9) * 10);
                currentNp += npVal;
            }
            // 爆擊威力提升 (Lv1=20% ~ Lv10=30%)
            if (data.appends.skill4 > 0) {
                let critVal = 20 + ((data.appends.skill4 - 1) / 9) * 10;
                buffs.push({ id: 'app4', name: '附加技4', type: 'crit_dmg_up', val: critVal / 100, turn: -1, isDebuff: false, unremovable: true });
            }
            // 技能 CD 減少 (Lv10 減 2，Lv6-9 減 1)
            if (data.appends.skill5 > 0 && data.skills) {
                let cdCharges = (data.appends.skill5 === 10) ? 3 : (data.appends.skill5 >= 6 ? 2 : 1);
                // 賦予一個隱藏的減免次數變數
                data.cdReductionCharges = cdCharges;
            }
        }

        // 結算常駐型起始 NP
        buffs.forEach(b => {
            if (b.type === 'np_charge' && b.turn === -1) {
                currentNp += (b.val * 100); // 確保對齊NP數值比例
            }
        });

        return {
            ...data,
            level: level,
            maxHp: Math.floor(hp),
            currentHp: Math.floor(hp),
            atk: Math.floor(atk),
            currentNp: Math.min(300, currentNp), // 開局不超過 300%
            buffs: buffs
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
        
        // 偵測 Mighty Chain
        const hasBuster = cards.some(c => c.type === 'Buster');
        const hasArts = cards.some(c => c.type === 'Arts');
        const hasQuick = cards.some(c => c.type === 'Quick');
        const isMightyChain = hasBuster && hasArts && hasQuick;

        const ownerId = cards[0].attacker.id;
        const isBraveChain = cards.length === 3 && cards.every(c => c.attacker.id === ownerId);

        return {
            chainBonuses: {
                busterChain: isBusterChain,
                artsChain: isArtsChain,
                quickChain: isQuickChain,
                braveChain: isBraveChain,
                mightyChain: isMightyChain
            }
        };
    },

    // 卡牌執行
    simulateCardExecution: (attacker, defender, card, firstCardType, chainBonuses = {}, ocLevel = 1) => {
        const isNP = card.isNP || false;
        const cardType = card.type;       
        const pos = card.position || 0;   
        const isCrit = card.isCrit || false;

        const npLevel = attacker.npLevel || 1; 
        const npLevelIdx = npLevel - 1; 
        
        // 確保 OC 等級在 1~5 之間 (對應陣列 0~4)
        const ocIdx = Math.min(4, Math.max(0, ocLevel - 1));

        const isBusterChain = chainBonuses.busterChain || false;
        const isMightyChain = chainBonuses.mightyChain || false;
        const isSameColorChain = chainBonuses.busterChain || chainBonuses.artsChain || chainBonuses.quickChain;

        const footprintAtk = (!isNP && card.footprint) ? card.footprint : 0;
        const baseATK = attacker.atk + footprintAtk;

        // ==========================================
        // 1. 基礎倍率與位置補正
        // ==========================================
        let dmgCardValue = 0, npCardMod = 0, starCardMod = 0;
        let posModDmg = 1.0, posModNp = 1.0, posModStar = 1.0;
        let dmgTypeMod = 1.0;

        if (isNP) {
            const npData = attacker.noble_phantasm;
            dmgCardValue = Array.isArray(npData.val) ? npData.val[npLevelIdx] : (npData.val || 450);
            
            if (cardType === 'Arts') { dmgTypeMod = 1.0; npCardMod = 3.0; starCardMod = 0; }
            else if (cardType === 'Buster') { dmgTypeMod = 1.5; npCardMod = 0; starCardMod = 0.1; }
            else if (cardType === 'Quick') { dmgTypeMod = 0.8; npCardMod = 1.0; starCardMod = 0.8; }
        } else {
            if (cardType === 'Arts') { dmgCardValue = 100; dmgTypeMod = 1.0; npCardMod = 3.0 + (pos * 1.5); starCardMod = 0; }
            else if (cardType === 'Buster') { dmgCardValue = 100; dmgTypeMod = 1.5; npCardMod = 0; starCardMod = 0.1 + (pos * 0.05); }
            else if (cardType === 'Quick') { dmgCardValue = 100; dmgTypeMod = 0.8; npCardMod = 1.0 + (pos * 0.5); starCardMod = 0.8 + (pos * 0.2); }
            else if (cardType === 'Extra') { 
                dmgCardValue = 100; 
                dmgTypeMod = 1.0; 
                npCardMod = 1.0; 
                starCardMod = 1.0; 
                // Mighty Brave Chain 的 EX 卡倍率也視同同色為 3.5
                posModDmg = (isSameColorChain || isMightyChain) ? 3.5 : 2.0; 
            }
            
            if (cardType !== 'Extra') {
                const posMods = [1.0, 1.2, 1.4];
                posModDmg = posMods[pos] || 1.0;
            }
        }

        let firstCardDmgBonus = (!isNP && (firstCardType === 'Buster' || isMightyChain)) ? 0.5 : 0; 
        let firstCardNpBonus = (!isNP && (firstCardType === 'Arts' || isMightyChain)) ? 1.0 : 0; 
        let firstCardStarBonus = (!isNP && (firstCardType === 'Quick' || isMightyChain)) ? 0.2 : 0;
        
        if (!isNP && cardType !== 'Extra' && (firstCardType === 'Quick' || isMightyChain)) {
            card.critChance = Math.min(100, (card.critChance || 0) + 20);
        }

        // ==========================================
        // 2. 乘區結算 (包含防禦端修正)
        // ==========================================
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        const defBuff = Engine.getBuffTotal(defender, 'def_up');
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', cardType);
        const npBuff = isNP ? Engine.getBuffTotal(attacker, 'np_dmg_up') : 0;
        const critBuff = isCrit ? Engine.getBuffTotal(attacker, 'crit_dmg_up') : 0;
        
        // 攻方的特攻 減去 守方的特防
        const powerMod = Engine.getBuffTotal(attacker, 'special_dmg_up');
        const specialDefMod = Engine.getBuffTotal(defender, 'special_dmg_down'); 
        const extraBuff = cardType === 'Extra' ? Engine.getBuffTotal(attacker, 'extra_dmg_up') : 0; 
        
        let classAffinity = Engine.CLASS_MATRIX[attacker.class] ? (Engine.CLASS_MATRIX[attacker.class][defender.class] || Engine.CLASS_MATRIX[attacker.class]['default'] || 1.0) : 1.0;
        if (attacker.class === 'berserker' && defender.class === 'shielder') classAffinity = 1.0;
        let attributeMod = Engine.ATTRIBUTE_MATRIX[attacker.attribute] ? (Engine.ATTRIBUTE_MATRIX[attacker.attribute][defender.attribute] || 1.0) : 1.0;
        let classAtkMod = Engine.CLASS_ATK_MODIFIER[attacker.class] || 1.0;

        // 寶具特攻吃 OC 動態階段
        let specialNPMod = 1.0;
        if (isNP && attacker.noble_phantasm.special_mod) {
            const mod = attacker.noble_phantasm.special_mod;
            const targetTraits = Array.isArray(mod.trait) ? mod.trait : [mod.trait];
            const enemyTraits = (defender.traits || []).concat([defender.attribute]);
            if (targetTraits.some(t => enemyTraits.includes(t))) {
                specialNPMod = Array.isArray(mod.val) ? mod.val[ocIdx] : mod.val;
            }
        }

        // ==========================================
        // 3. 最終傷害計算與盾系判定
        // ==========================================
        let baseDmg = baseATK * 0.23 * classAtkMod;
        let cardFactor = (dmgTypeMod * posModDmg * (1 + cardBuff)) + firstCardDmgBonus;
        let buffsFactor = Math.max(0, 1 + atkBuff - defBuff);
        let specialFactor = Math.max(0, 1.0 + critBuff + npBuff + powerMod + extraBuff - specialDefMod); 
        let critMultiplier = isCrit ? 2.0 : 1.0;

        // 特殊耐性乘區
        const resistMod = Engine.getBuffTotal(defender, 'dmg_resist_up') - Engine.getBuffTotal(defender, 'dmg_resist_down');
        const resistFactor = Math.max(0, 1.0 - resistMod);

        let totalDamage = baseDmg * (dmgCardValue / 100) * cardFactor * classAffinity * attributeMod * buffsFactor * specialFactor * critMultiplier * specialNPMod * resistFactor;
        totalDamage *= (0.9 + Math.random() * 0.199); 
        totalDamage += (Engine.getBuffTotal(attacker, 'dmg_plus') - Engine.getBuffTotal(defender, 'dmg_cut'));
        
        if (isBusterChain && !isNP && cardType !== 'Extra') { 
            totalDamage += (baseATK * 0.2); 
        }
        totalDamage = Math.max(0, Math.floor(totalDamage));

        // 無敵、迴避、對肅正防禦 絕對判定
        const hasAntiPurge = defender.buffs && defender.buffs.some(b => b.type === 'anti_purge_defense');
        const hasInvincible = defender.buffs && defender.buffs.some(b => b.type === 'invincible');
        const hasEvade = defender.buffs && defender.buffs.some(b => b.type === 'evade');
        
        const ignoreInvincible = attacker.buffs && attacker.buffs.some(b => b.type === 'ignore_invincible');
        const sureHit = attacker.buffs && attacker.buffs.some(b => b.type === 'sure_hit');

        if (hasAntiPurge) {
            totalDamage = 0; // 絕對防禦，無解
        } else if (hasInvincible && !ignoreInvincible) {
            totalDamage = 0; // 無敵被無敵貫通克制
        } else if (hasEvade && !ignoreInvincible && !sureHit) {
            totalDamage = 0; // 迴避被貫通與必中克制
        }

        // ==========================================
        // 4. Hit-by-Hit 結算 (包含 Break 鎖血與 Guts)
        // ==========================================
        const hitDistribution = (attacker.cards && attacker.cards.hits && attacker.cards.hits[cardType]) 
            ? attacker.cards.hits[cardType] 
            : [100]; 

        let generatedNP = 0;
        let generatedStars = 0;
        let currentEnemyHp = defender.currentHp;
        
        // 敵方受擊的隱藏 NP 與掉星補正
        const enemyNpMod = defender.hidden_stats ? (defender.hidden_stats.np_mod || 1.0) : 1.0;
        const enemyStarMod = defender.hidden_stats ? (defender.hidden_stats.star_mod || 0) : 0;

        const baseNPRate = attacker.hidden_stats ? attacker.hidden_stats.np_charge_atk : 0.5;
        const baseStarRate = attacker.hidden_stats ? attacker.hidden_stats.star_gen : 0.1;

        let isBreakLock = false; // 是否觸發破條鎖血

        for (let i = 0; i < hitDistribution.length; i++) {
            let hitWeight = hitDistribution[i] / 100;
            let hitDmg = Math.floor(totalDamage * hitWeight);
            
            // 只要觸發鎖血，後續 Hits 皆視為 Overkill
            let isOverkill = (currentEnemyHp <= 0 || currentEnemyHp - hitDmg <= 0) || isBreakLock;

            if (!(cardType === 'Buster' && firstCardType !== 'Arts' && !isMightyChain)) {
                let npModFactor = isOverkill ? 1.5 : 1.0;
                let hitNP = baseNPRate * ((npCardMod * (1 + cardBuff)) + firstCardNpBonus) * enemyNpMod * npModFactor * (1 + Engine.getBuffTotal(attacker, 'np_gain_up')) * critMultiplier;
                generatedNP += hitNP;
            }

            let starChance = baseStarRate + enemyStarMod + (starCardMod * (1 + cardBuff)) + firstCardStarBonus + Engine.getBuffTotal(attacker, 'star_gen_up') + (isOverkill ? 0.3 : 0);
            if (isCrit) starChance += 0.2;
            
            let stars = 0;
            while(starChance >= 1.0) { stars++; starChance -= 1.0; }
            if (Math.random() < starChance) stars++;
            generatedStars += stars;

            // Break 條鎖血判定
            if (!isBreakLock) {
                currentEnemyHp -= hitDmg;
                // 若敵方資料庫中擁有 breakBars 且血量歸零，立刻鎖血
                if (currentEnemyHp <= 0 && defender.breakBars && defender.breakBars.length > 0) {
                    currentEnemyHp = 0;
                    isBreakLock = true;
                }
            }
        }

        defender.currentHp = Math.max(0, currentEnemyHp);

        // 戰鬥續行判定 (若未觸發轉階段且血量為0)
        let triggeredGuts = false;
        if (defender.currentHp <= 0 && !isBreakLock) {
            let gutsBuff = defender.buffs ? defender.buffs.find(b => b.type === 'guts') : null;
            if (gutsBuff) {
                defender.currentHp = gutsBuff.val; // 以 Guts 指定血量復活
                triggeredGuts = true;
                if (gutsBuff.count !== null) {
                    gutsBuff.count--;
                    if (gutsBuff.count <= 0) defender.buffs = defender.buffs.filter(b => b !== gutsBuff);
                } else {
                    defender.buffs = defender.buffs.filter(b => b !== gutsBuff);
                }
            }
        }

        return {
            damage: totalDamage,
            npGained: Math.floor(generatedNP * 100) / 100, 
            starsGained: generatedStars,
            isEnemyDead: defender.currentHp <= 0,
            triggeredBreak: isBreakLock, // UI 端可根據這個播放碎條動畫
            triggeredGuts: triggeredGuts // UI 端可根據這個播放復活動畫
        };
    },

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
        // 確保這是一個有冷卻時間的主動技能 (排除被動技能的誤觸)
        if (skill.initialCd !== undefined) {
            // 1. 技能施放後，優先進入基礎冷卻
            skill.currentCd = skill.initialCd;

            // 2. 結算被動5的減免機制
            if (user.cdReductionCharges && user.cdReductionCharges > 0) {
                // 將當前 CD 減 1，並確保不會變成負數
                skill.currentCd = Math.max(0, skill.currentCd - 1);
                // 消耗掉一次減免機會
                user.cdReductionCharges -= 1; 
            }
        }
        // ----------------------------------------------------

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
        let isDebuff = effect.is_debuff || effect.isDebuff || false;
        
        // 弱化機率與免疫判定
        if (isDebuff) {
            // 判定弱化無效 (如 Boss 技能)
            if (target.buffs && target.buffs.some(b => b.type === 'debuff_immune')) {
                return; // 被阻擋，直接中斷賦予
            }

            // 若 JSON 中沒寫 chance，預設為 100% (1.0)
            let baseChance = (effect.chance !== undefined) ? effect.chance : 1.0; 
            
            let successUp = Engine.getBuffTotal(source, 'debuff_success_up') - Engine.getBuffTotal(source, 'debuff_success_down');
            let resistUp = Engine.getBuffTotal(target, 'debuff_resist_up') - Engine.getBuffTotal(target, 'debuff_resist_down');
            
            // 無視弱化耐性
            let ignoreResist = source.buffs && source.buffs.some(b => b.type === 'ignore_debuff_resist');
            if (ignoreResist) resistUp = 0; 

            let finalChance = baseChance + successUp - resistUp;
            
            // 亂數骰大於成功率，代表 Miss
            if (Math.random() > finalChance) {
                return; 
            }
        }

        const buff = {
            id: Date.now() + Math.random(),
            name: Engine.BUFF_NAMES[effect.type] || effect.type, 
            type: effect.type, 
            val: effect.val,
            turn: effect.turn || 0,
            count: effect.count || null,
            isDebuff: isDebuff,
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

        // 1. 先進行回合數扣減與過期篩選
        // 只有 turn > 0 的 Buff 才需要扣除回合數
        servant.buffs.forEach(b => {
            if (b.turn > 0) {
                b.turn--;
            }
        });

        // 2. 移除所有「回合結束且次數歸零」或「回合結束且時間到期」的 Buff
        // 定義移除條件：時間到期 (turn === 0) 且 沒有剩餘使用次數 (count === null 或 count === 0)
        servant.buffs = servant.buffs.filter(b => {
            const isExpired = (b.turn === 0);
            const isCountEmpty = (b.count !== null && b.count <= 0);
            
            // 如果是永久 Buff (turn === -1) 或 count 還有，則保留
            if (b.turn === -1) return true;
            return !(isExpired || isCountEmpty);
        });

        // 3. 結算每回合觸發的效果 (Regen / DoT)
        // 這裡確保只有「依然存活」且「未被移除」的 Buff 才會觸發
        servant.buffs.forEach(b => {
            // 處理 HP 回復與掉血
            if (b.type === 'hp_regen') {
                servant.currentHp = Math.min(servant.maxHp, servant.currentHp + b.val);
            }
            if (b.type === 'poison' || b.type === 'burn' || b.type === 'curse') {
                // 毒/燒/咒扣血 (不會致死，保留 1 滴血)
                servant.currentHp = Math.max(1, servant.currentHp - b.val);
            }
            
            // 處理 NP 獲得
            if (b.type === 'np_regen') {
                servant.currentNp = Math.min(300, servant.currentNp + b.val * 100);
            }
            
            // 處理獲得星星
            if (b.type === 'star_regen') {
                // 建議這裡不要直接引用 UI，而是透過一個事件機制或全域變數處理
                if (typeof UI !== 'undefined' && UI.gameState) {
                    UI.gameState.stars += b.val;
                }
            }

            // 處理效果使用次數扣減 (若該 Buff 是次數型 Buff，例如「攻擊時賦予毒」的 Buff)
            if (b.count !== null && b.count > 0) {
                // 注意：這裡是結算回合觸發，有些 count 是被攻擊才扣，這裡僅處理回合觸發型的 count
            }
        });
    },
};
