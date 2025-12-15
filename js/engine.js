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

    // 2. 輔助查表
    getConstant: (category, key1, key2 = null) => {
        if (!DB.CONSTANTS[category]) return 1.0;
        if (key2) {
            return DB.CONSTANTS[category][key1] ? (DB.CONSTANTS[category][key1][key2] || 1.0) : 1.0;
        }
        return DB.CONSTANTS[category][key1] || 1.0;
    },

    // =========================================================================
    // 3. 核心：傷害公式
    // =========================================================================
    calculateDamage: (attacker, defender, cardType, cardPos = 0, isCrit = false, isBusterChain = false) => {
        const C = DB.CONSTANTS;
        
        let damage = attacker.currentStats.atk * 0.23;

        let cardDamageVal = 0;
        if (cardType === 'NP') {
            cardDamageVal = 6.0; // 暫定倍率
        } else {
            if (cardType === 'Extra') {
                cardDamageVal = 2.0; 
            } else {
                cardDamageVal = C.card_performance[cardType].damage[Math.min(cardPos, 2)];
            }
        }
        damage *= cardDamageVal;

        const classAtkMod = C.class_constants[attacker.class] ? C.class_constants[attacker.class].atk_mod : 1.0;
        damage *= classAtkMod;

        const classAffinity = Engine.getConstant('class_affinity', attacker.class, defender.class);
        damage *= classAffinity;

        const attrAffinity = Engine.getConstant('attribute_affinity', attacker.attribute, defender.attribute);
        damage *= attrAffinity;

        const randomMod = 0.9 + Math.random() * 0.199;
        damage *= randomMod;

        // Buffs
        const atkBuff = 0;
        const defBuff = 0;
        const cardBuff = 0;
        const cardResist = 0;
        const powerMod = 0;
        const critBuff = 0;
        
        damage *= (1 + cardBuff - cardResist);
        damage *= Math.max(0, (1 + atkBuff - defBuff));

        if (isCrit) {
            damage *= 2.0 * (1 + critBuff);
        }
        
        damage *= (1 + powerMod);

        if (isBusterChain) {
            damage += attacker.currentStats.atk * 0.2;
        }

        return Math.floor(damage); // 傷害通常無條件捨去
    },

    // =========================================================================
    // 4. 核心：NP 回收公式
    // =========================================================================
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];

        let totalNp = 0.0; // 使用浮點數累積
        let currentEnemyHp = defender.currentHp;
        
        // 基礎 NP 率 (JSON 中通常為 0.84 這種數值，視作 %)
        let baseNpRate = hidden.np_charge_atk; 

        let cardNpVal = 0;
        if (cardType === 'NP') cardNpVal = 1.0; 
        else if (cardType === 'Extra') cardNpVal = 1.0;
        else cardNpVal = C.card_performance[cardType].np[Math.min(cardPos, 2)];

        const enemyNpMod = C.class_constants[defender.class] ? C.class_constants[defender.class].np_enemy_mod : 1.0;

        hitsArr.forEach((hitRatio, index) => {
            // Overkill 判定用的傷害 (這部分需要整數運算)
            const hitDamage = Math.floor(damageTotal * (hitRatio / 100));
            
            let isOverkill = false;
            if (currentEnemyHp <= 0) {
                isOverkill = true;
            } else {
                currentEnemyHp -= hitDamage;
                if (currentEnemyHp <= 0) isOverkill = true;
            }
            const overkillMod = isOverkill ? 1.5 : 1.0;

            // NP 計算係數
            const cardBuff = 0;   
            const cardResist = 0; 
            const npGainBuff = 0; 

            // 單 Hit NP (保持小數運算)
            let hitNp = baseNpRate;
            hitNp *= cardNpVal;
            hitNp *= enemyNpMod;
            hitNp *= (1 + cardBuff - cardResist);
            hitNp *= (1 + npGainBuff);
            
            if (isCrit) hitNp *= 2.0;
            hitNp *= overkillMod;

            // 這裡直接累加浮點數，不做任何捨去
            totalNp += hitNp; 
        });

        // 最終結果四捨五入到整數位
        return Math.round(totalNp);
    },

    // =========================================================================
    // 5. 核心：打星公式 (修正：過程浮點數計算，僅在最後結果四捨五入)
    // =========================================================================
    calculateStarGen: (attacker, defender, cardType, cardPos = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];
        
        // 1. 計算單擊掉星率 (Drop Rate) - 保持小數
        const baseStarGen = hidden.star_gen; 

        let cardStarVal = 0;
        if (cardType === 'NP') cardStarVal = 0; 
        else if (cardType === 'Extra') cardStarVal = 1.0;
        else cardStarVal = C.card_performance[cardType].star[Math.min(cardPos, 2)];

        const enemyStarMod = C.class_constants[defender.class] ? C.class_constants[defender.class].star_enemy_mod : 0.0;
        
        let dropRate = baseStarGen + cardStarVal + enemyStarMod;
        if (isCrit) dropRate += 0.2; 
        
        // 限制最大 300%
        if (dropRate > 3.0) dropRate = 3.0;

        // 2. 計算期望值總星數 (Rate * Hit數) - 保持小數
        // 這裡暫不考慮 Overkill 對打星的額外加成，純粹計算期望值
        let totalStars = dropRate * hitsArr.length;

        // 最終結果四捨五入到整數位
        return Math.round(totalStars);
    },

    // =========================================================================
    // 6. 回合總結算
    // =========================================================================
    calculateTurn: (attacker, defender, cardChain, useNP = false) => {
        const results = {
            attacks: [],
            chainBonus: {
                busterChain: false,
                artsChain: false,
                quickChain: false,
                braveChain: true // 目前邏輯暫定單人Brave，組隊時需修改判斷邏輯(UI層已處理)
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
