const Engine = {
    // 1. 練度計算
    calculateStats: (servantData, levelSetting) => {
        let baseHp = 0, baseAtk = 0, fouHp = 0, fouAtk = 0;

        if (levelSetting === 'natural') {
            baseHp = servantData.stats.natural.hp;
            baseAtk = servantData.stats.natural.atk;
            fouHp = 1000; fouAtk = 1000;
        } else if (levelSetting === 'lv100') {
            baseHp = servantData.stats.lv100.hp;
            baseAtk = servantData.stats.lv100.atk;
            fouHp = 2000; fouAtk = 2000;
        } else if (levelSetting === 'lv120') {
            baseHp = servantData.stats.lv120.hp;
            baseAtk = servantData.stats.lv120.atk;
            fouHp = 2000; fouAtk = 2000;
        }

        return {
            hp: baseHp + fouHp,
            atk: baseAtk + fouAtk
        };
    },

    getConstant: (category, key1, key2 = null) => {
        if (!DB.CONSTANTS[category]) return 1.0;
        if (key2) {
            return DB.CONSTANTS[category][key1] ? (DB.CONSTANTS[category][key1][key2] || 1.0) : 1.0;
        }
        return DB.CONSTANTS[category][key1] || 1.0;
    },

    // =========================================================================
    // 【新增】技能與 Buff 系統
    // =========================================================================

    // 施放技能 (由 UI 呼叫)
    useSkill: (user, target, skill, party) => {
        const results = {
            npCharged: 0,
            starsGained: 0,
            buffsAdded: []
        };

        if (!skill.effects) return results;

        skill.effects.forEach(effect => {
            // 處理直接效果 (Instant Effects)
            if (effect.type === 'np_charge') {
                const charge = effect.val;
                // 判斷目標 (若是 party，UI 層會傳入個別的 target 呼叫多次 useSkill，或在此處特殊處理)
                // 為了簡化，我們假設 UI 層會處理 'party' 類型的迴圈，這裡只對單一 target 生效
                // 但如果是 'star_gen_flat' 這種全隊共享資源，則直接加
                target.currentNp += charge;
                if (target.currentNp > 300) target.currentNp = 300; // 上限暫定300
                results.npCharged += charge;
            } 
            else if (effect.type === 'star_gen_flat') {
                // 星星是全隊共享，直接回傳給 UI 加
                results.starsGained += effect.val;
            }
            else if (effect.type === 'hp_recover') {
                target.currentHp += effect.val;
                if (target.currentHp > target.maxHp) target.currentHp = target.maxHp;
            }
            // 處理狀態賦予 (Buffs/Debuffs)
            else {
                // 排除一些非 Buff 的類型 (如 start_np 被動)
                if (effect.type !== 'start_np' && effect.type !== 'skill_cooldown_reduce_trigger') {
                    Engine.applyBuff(user, target, effect);
                    results.buffsAdded.push(effect.type);
                }
            }
        });

        return results;
    },

    // 施加 Buff
    applyBuff: (source, target, effect) => {
        // 建立 Buff 物件
        const buff = {
            id: Date.now() + Math.random(), // 唯一 ID
            name: effect.type, // 暫時用 type 當名字，理想是傳入 skill name
            type: effect.type, 
            val: effect.val,
            turn: effect.turn || 0,
            count: effect.count || null,
            isDebuff: effect.is_debuff || false,
            sourceId: source.id,
            // 特殊欄位
            card: effect.card || null,       // for card_up
            trait: effect.trait || null,     // for special_dmg_up
            cond_class: effect.cond_class || null // for atk_up_vs_class
        };

        if (!target.buffs) target.buffs = [];
        target.buffs.push(buff);
    },

    // 計算 Buff 總和 (Helper)
    getBuffTotal: (servant, buffType, filterFn = null) => {
        if (!servant.buffs) return 0;
        let total = 0;
        servant.buffs.forEach(b => {
            if (b.type === buffType) {
                if (filterFn && !filterFn(b)) return;
                total += b.val;
            }
        });
        return total;
    },

    // =========================================================================
    // 3. 核心：傷害公式 (更新：讀取 Buffs)
    // =========================================================================
    calculateDamage: (attacker, defender, cardType, cardPos = 0, isCrit = false, isBusterChain = false) => {
        const C = DB.CONSTANTS;
        
        let damage = attacker.currentStats.atk * 0.23;

        // 卡片基礎倍率
        let cardDamageVal = 0;
        if (cardType === 'NP') cardDamageVal = 6.0; // 暫定倍率
        else if (cardType === 'Extra') cardDamageVal = 2.0; 
        else cardDamageVal = C.card_performance[cardType].damage[Math.min(cardPos, 2)];
        
        damage *= cardDamageVal;

        const classAtkMod = C.class_constants[attacker.class] ? C.class_constants[attacker.class].atk_mod : 1.0;
        damage *= classAtkMod;

        const classAffinity = Engine.getConstant('class_affinity', attacker.class, defender.class);
        damage *= classAffinity;

        const attrAffinity = Engine.getConstant('attribute_affinity', attacker.attribute, defender.attribute);
        damage *= attrAffinity;

        const randomMod = 0.9 + Math.random() * 0.199;
        damage *= randomMod;

        // --- 【更新】Buff 計算區域 ---
        
        // 1. 攻擊力 Buff (atk_up) - 防禦力 Debuff (def_down = 敵方 def_up 負值)
        // 注意：FGO 中 攻Buff 和 防Debuff 是加算
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        // 簡化：暫時不計算敵人的防禦 Buff
        const defBuff = 0; 

        // 2. 色卡 Buff (card_up)
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
        const cardResist = 0; 

        // 3. 寶具威力 Buff (np_dmg_up)
        let powerMod = 0;
        if (cardType === 'NP') {
            powerMod += Engine.getBuffTotal(attacker, 'np_dmg_up');
        }

        // 4. 特攻 Buff (special_dmg_up)
        // 檢查攻擊者是否有對敵人的特攻狀態
        if (attacker.buffs) {
            attacker.buffs.forEach(b => {
                if (b.type === 'special_dmg_up') {
                    // 檢查敵人是否有該 trait (假設敵人 traits 存在 defender.traits)
                    if (defender.traits && defender.traits.includes(b.trait)) {
                        powerMod += b.val;
                    }
                    // 簡化：如果沒寫 trait，假設全特攻(不常見)
                }
            });
        }

        // 5. 暴擊威力 Buff (crit_dmg_up)
        let critBuff = 0;
        if (isCrit) {
            critBuff = Engine.getBuffTotal(attacker, 'crit_dmg_up', b => b.card === cardType || b.card === null);
        }
        
        // --- 套用 Buff ---
        damage *= (1 + cardBuff - cardResist);
        damage *= Math.max(0, (1 + atkBuff - defBuff));

        if (isCrit) {
            damage *= 2.0 * (1 + critBuff);
        }
        
        // 寶具威力與特攻屬於 Power Mod
        damage *= (1 + powerMod);

        if (isBusterChain) {
            damage += attacker.currentStats.atk * 0.2;
        }

        // 判斷對肅正防禦 (anti_purge_defense)
        // 假設如果傷害 > 0 且有此狀態，則傷害為 0 (需在扣血邏輯處理，或在此回傳 0)
        // 這裡回傳的是「理論傷害」，實際扣血邏輯在 UI/Turn flow 處理更佳
        // 但為了簡單，若有無敵/對肅正，可以在這裡回傳 0
        // (先暫保留，等待 Phase 2 敵人回合與防禦邏輯)

        return Math.floor(damage);
    },

    // =========================================================================
    // 4. 核心：NP 回收公式 (更新：讀取 Buffs)
    // =========================================================================
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];

        let totalNp = 0.0;
        let currentEnemyHp = defender.currentHp;
        
        let baseNpRate = hidden.np_charge_atk; 

        let cardNpVal = 0;
        if (cardType === 'NP') cardNpVal = 1.0; 
        else if (cardType === 'Extra') cardNpVal = 1.0;
        else cardNpVal = C.card_performance[cardType].np[Math.min(cardPos, 2)];

        const enemyNpMod = C.class_constants[defender.class] ? C.class_constants[defender.class].np_enemy_mod : 1.0;

        hitsArr.forEach((hitRatio, index) => {
            const hitDamage = Math.floor(damageTotal * (hitRatio / 100));
            
            let isOverkill = false;
            if (currentEnemyHp <= 0) {
                isOverkill = true;
            } else {
                currentEnemyHp -= hitDamage;
                if (currentEnemyHp <= 0) isOverkill = true;
            }
            const overkillMod = isOverkill ? 1.5 : 1.0;

            // --- 【更新】Buff 計算 ---
            const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
            const npGainBuff = Engine.getBuffTotal(attacker, 'np_gain_up'); 
            const cardResist = 0; 

            let hitNp = baseNpRate;
            hitNp *= cardNpVal;
            hitNp *= enemyNpMod;
            hitNp *= (1 + cardBuff - cardResist);
            hitNp *= (1 + npGainBuff); // 黃金律
            
            if (isCrit) hitNp *= 2.0;
            hitNp *= overkillMod;

            totalNp += hitNp; 
        });

        return Math.round(totalNp);
    },

    // =========================================================================
    // 5. 核心：打星公式 (無需大幅變動，僅預留 Buff 空間)
    // =========================================================================
    calculateStarGen: (attacker, defender, cardType, cardPos = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];
        
        const baseStarGen = hidden.star_gen; 

        let cardStarVal = 0;
        if (cardType === 'NP') cardStarVal = 0; 
        else if (cardType === 'Extra') cardStarVal = 1.0;
        else cardStarVal = C.card_performance[cardType].star[Math.min(cardPos, 2)];

        const enemyStarMod = C.class_constants[defender.class] ? C.class_constants[defender.class].star_enemy_mod : 0.0;
        
        // 這裡可以加入 'star_gen_up' Buff
        const starGenBuff = Engine.getBuffTotal(attacker, 'star_gen_up');

        let dropRate = baseStarGen + cardStarVal + enemyStarMod + starGenBuff;
        if (isCrit) dropRate += 0.2; 
        
        if (dropRate > 3.0) dropRate = 3.0;

        let totalStars = dropRate * hitsArr.length;
        return Math.round(totalStars);
    },

    // =========================================================================
    // 6. 回合總結算
    // =========================================================================
    calculateTurn: (attacker, defender, cardChain, useNP = false) => {
        // ... (保持原本邏輯，這裡不需要變動，因為它會呼叫上面的函式) ...
        const results = {
            attacks: [],
            chainBonus: {
                busterChain: false,
                artsChain: false,
                quickChain: false,
                braveChain: true 
            }
        };

        const firstCard = cardChain[0];
        const isSameColor = cardChain.every(c => c === firstCard);
        
        if (isSameColor) {
            if (firstCard === 'Buster') results.chainBonus.busterChain = true;
            if (firstCard === 'Arts') results.chainBonus.artsChain = true;
            if (firstCard === 'Quick') results.chainBonus.quickChain = true;
        }

        cardChain.forEach((cardType, index) => {
            let isBusterChainActive = results.chainBonus.busterChain;

            const dmg = Engine.calculateDamage(attacker, defender, cardType, index, false, isBusterChainActive);
            const np = Engine.calculateNPGain(attacker, defender, cardType, index, dmg);
            const star = Engine.calculateStarGen(attacker, defender, cardType, index, false);

            results.attacks.push({ type: cardType, damage: dmg, np: np, stars: star });
        });

        if (results.chainBonus.braveChain) {
            const exDmg = Engine.calculateDamage(attacker, defender, 'Extra', 3, false, results.chainBonus.busterChain);
            const exNp = Engine.calculateNPGain(attacker, defender, 'Extra', 3, exDmg);
            const exStar = Engine.calculateStarGen(attacker, defender, 'Extra', 3, false);
            
            results.attacks.push({ type: 'Extra', damage: exDmg, np: exNp, stars: exStar });
        }
        
        if (results.chainBonus.artsChain) {
             results.attacks[0].np += 20; 
        }
        
        return results;
    }
};
