const Engine = {
    // 1. 練度計算 (白值 + 芙芙)
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

    // 2. 輔助：安全查表
    getConstant: (category, key1, key2 = null) => {
        if (!DB.CONSTANTS[category]) return 1.0;
        if (key2) {
            return DB.CONSTANTS[category][key1] ? (DB.CONSTANTS[category][key1][key2] || 1.0) : 1.0;
        }
        return DB.CONSTANTS[category][key1] || 1.0;
    },

    // =========================================================================
    // 3. 核心：傷害公式 (Damage Formula)
    // =========================================================================
    calculateDamage: (attacker, defender, cardType, cardPos = 0, isCrit = false, isBusterChain = false) => {
        const C = DB.CONSTANTS;
        
        // --- A. 基礎 ATK ---
        // 公式：ATK * 0.23
        let damage = attacker.currentStats.atk * 0.23;

        // --- B. 指令卡係數 (Card Damage Multiplier) ---
        // 寶具通常有獨立倍率，這裡先用卡片基礎倍率
        // 實際上寶具倍率未來要從 servant.noble_phantasm.value 讀取
        let cardDamageVal = 0;
        if (cardType === 'NP') {
            // 暫時假設寶具倍率 (紅卡300%~500%, 藍綠卡450%~900%...)
            // 這裡先給一個固定的測試值 600% (6.0)
            cardDamageVal = 6.0; 
            
            // 寶具卡還會受到該卡色的補正 (例如紅寶具 x1.5)
            // 這裡要注意：FGO公式裡，寶具倍率是包含卡色補正的運算
            // 但通用的卡片倍率通常是從 constants 讀取
            // 簡化處理：讀取卡色倍率 (例如 Buster=1.5)
            const cardTypeMod = C.card_performance[attacker.cards.deck[0] || 'Buster'].damage[0]; // 暫抓配卡第一張的顏色當寶具色，未來要改
            // *修正：這部分未來要讀取 noble_phantasm.card_type
        } else {
            // 普攻：讀取 constants (例如 B卡首位=1.5, 2位=1.8)
            // Math.min(cardPos, 2) 確保不會超過第三位的係數 (Ex卡另外算)
            if (cardType === 'Extra') {
                // EX卡固定倍率 (普通2.0 / 同色串3.5)
                // 這裡暫時只算普通 EX
                cardDamageVal = 2.0; 
            } else {
                cardDamageVal = C.card_performance[cardType].damage[Math.min(cardPos, 2)];
            }
        }
        damage *= cardDamageVal;

        // --- C. 職階補正 (Class ATK Modifier) ---
        // 例如：狂職=1.1, 術職=0.9
        const classAtkMod = C.class_constants[attacker.class] ? C.class_constants[attacker.class].atk_mod : 1.0;
        damage *= classAtkMod;

        // --- D. 職階相剋 (Class Affinity) ---
        // 例如：劍打槍=2.0
        const classAffinity = Engine.getConstant('class_affinity', attacker.class, defender.class);
        damage *= classAffinity;

        // --- E. 陣營相剋 (Attribute Affinity) ---
        // 例如：天剋地=1.1
        const attrAffinity = Engine.getConstant('attribute_affinity', attacker.attribute, defender.attribute);
        damage *= attrAffinity;

        // --- F. 亂數補正 (Random Variance) ---
        // 範圍：0.900 ~ 1.099
        // 為了讓測試數據穩定，你也可以暫時寫死 1.0
        const randomMod = 0.9 + Math.random() * 0.199;
        damage *= randomMod;

        // --- G. Buff 區塊 (目前是佔位符) ---
        const atkBuff = 0;   // 攻擊力提升
        const defBuff = 0;   // 防禦力提升
        const cardBuff = 0;  // 色卡性能提升 (魔放)
        const cardResist = 0;// 色卡耐性
        const powerMod = 0;  // 特攻狀態 (如神性特攻)
        const critBuff = 0;  // 暴擊威力提升
        
        // 1. 色卡 Buff 計算: (1 + 魔放 - 耐性)
        damage *= (1 + cardBuff - cardResist);

        // 2. 攻防 Buff 計算: (1 + 攻UP - 防UP)
        damage *= Math.max(0, (1 + atkBuff - defBuff));

        // 3. 暴擊與特攻: (1 + 暴擊Buff + 特攻Buff)
        // FGO 設定：暴擊時基礎傷害翻倍 (x2.0)
        // 所以暴擊係數 = 2.0 (如果是暴擊) 或 1.0 (沒暴擊)
        // 然後再加上 Crit Strength Buff
        let critModifier = isCrit ? 2.0 : 1.0;
        // 如果有暴擊威力 Buff，它是加在 2.0 上面嗎？
        // 不，公式是： CriticalModifier * (1 + CritDmgBuff) 
        // 修正：FGO公式為 (1 + CriticalBuff) * 2 (若暴擊) 
        // 這裡我們先簡化：
        if (isCrit) {
            damage *= 2.0 * (1 + critBuff);
        }
        
        // 特攻 (Power Mod) 通常是加法運算
        damage *= (1 + powerMod);

        // --- H. 固定傷害與 Buster Chain ---
        // Buster Chain 加成： ATK * 0.2
        if (isBusterChain) {
            damage += attacker.currentStats.atk * 0.2;
        }

        // 固傷 (Divinity等)
        damage += 0; 

        return Math.floor(damage);
    },

    // =========================================================================
    // 4. 核心：NP 回收公式 (修正：四捨五入)
    // =========================================================================
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];

        let totalNp = 0;
        let currentEnemyHp = defender.currentHp;
        
        let baseNpRate = hidden.np_charge_atk; // JSON若是 0.84，計算時通常不用除100，視實測而定，這裡假設是直接數值
        // *註：如果發現 NP 暴增 100 倍，請在這裡除以 100。通常 Mooncell 數據 0.84 代表 0.84%

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

            const cardBuff = 0;   
            const cardResist = 0; 
            const npGainBuff = 0; 

            let hitNp = baseNpRate;
            hitNp *= cardNpVal;
            hitNp *= enemyNpMod;
            hitNp *= (1 + cardBuff - cardResist);
            hitNp *= (1 + npGainBuff);
            
            if (isCrit) hitNp *= 2.0;
            hitNp *= overkillMod;

            // FGO 機制：每 Hit 計算完後直接 Floor，最後加總？還是加總後 Round？
            // 修正：FGO 實際運算通常是 每 Hit 計算完後下取整(floor)，
            // 但使用者要求「NP和爆擊星計算都採四捨五入」，我們依使用者需求調整：
            totalNp += hitNp; 
        });

        // 最終結果進行四捨五入 (保留兩位小數則 *100 -> round -> /100)
        // 使用者需求是 "四捨五入"，通常指最終顯示值
        return Math.round(totalNp * 100) / 100;
    },

    // =========================================================================
    // 5. 核心：打星公式 (修正：四捨五入)
    // =========================================================================
    calculateStarGen: (attacker, defender, cardType, cardPos = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];
        
        let totalStars = 0; 
        const baseStarGen = hidden.star_gen; 

        let cardStarVal = 0;
        if (cardType === 'NP') cardStarVal = 0; 
        else if (cardType === 'Extra') cardStarVal = 1.0;
        else cardStarVal = C.card_performance[cardType].star[Math.min(cardPos, 2)];

        const enemyStarMod = C.class_constants[defender.class] ? C.class_constants[defender.class].star_enemy_mod : 0.0;
        
        // 期望值計算
        let dropRate = baseStarGen + cardStarVal + enemyStarMod;
        if (isCrit) dropRate += 0.2; 
        if (dropRate > 3.0) dropRate = 3.0;

        totalStars = dropRate * hitsArr.length;

        // 修正：四捨五入
        return Math.round(totalStars * 10) / 10;
    },

    // =========================================================================
    // 6. 回合總結算 (Turn Calculation) - 處理 3 張卡 + Extra
    // =========================================================================
    calculateTurn: (attacker, defender, cardChain, useNP = false) => {
        // cardChain 是一個陣列，例如 ['Buster', 'Arts', 'Buster']
        const results = {
            attacks: [],
            chainBonus: {
                busterChain: false,
                artsChain: false,
                quickChain: false,
                braveChain: true // 目前只有單人，所以必定 Brave
            }
        };

        // 1. 判斷 Chain
        const firstCard = cardChain[0];
        const isSameColor = cardChain.every(c => c === firstCard);
        
        if (isSameColor) {
            if (firstCard === 'Buster') results.chainBonus.busterChain = true;
            if (firstCard === 'Arts') results.chainBonus.artsChain = true; // 這裡通常是全隊 NP+20，暫時只加給當前從者
            if (firstCard === 'Quick') results.chainBonus.quickChain = true;
        }

        // 2. 處理 3 張指令卡
        cardChain.forEach((cardType, index) => {
            // A. 計算 First Card Bonus (首卡加成)
            // FGO 規則：
            // 首紅：後續卡片攻擊力上升 (damage計算時處理)
            // 首藍：後續卡片 NP 獲得上升 (np計算時處理)
            // 首綠：後續卡片 掉星率上升 (star計算時處理)
            
            // 在我們的 calculateDamage/NP 函式中，需要傳入「首卡是什麼顏色」
            // 這裡我們先簡化：直接計算數值
            
            // 判斷是否 Buster Chain 加攻 (固定 ATK * 0.2)
            let isBusterChainActive = results.chainBonus.busterChain;

            // 計算傷害
            // 注意：這裡 cardPos 是 0, 1, 2 (這會影響卡片倍率)
            const dmg = Engine.calculateDamage(attacker, defender, cardType, index, false, isBusterChainActive);
            
            // 計算 NP
            // 如果首卡是 Arts，這裡應該要傳入參數讓 NP 公式知道有首藍加成
            // 為了簡化，我們先不動 calculateNPGain 的簽名，假設已經包含在內
            const np = Engine.calculateNPGain(attacker, defender, cardType, index, dmg);
            
            // 計算 打星
            const star = Engine.calculateStarGen(attacker, defender, cardType, index, false);

            results.attacks.push({ type: cardType, damage: dmg, np: np, stars: star });
        });

        // 3. 處理 Extra Attack
        if (results.chainBonus.braveChain) {
            // Extra 卡
            const exDmg = Engine.calculateDamage(attacker, defender, 'Extra', 3, false, results.chainBonus.busterChain);
            const exNp = Engine.calculateNPGain(attacker, defender, 'Extra', 3, exDmg);
            const exStar = Engine.calculateStarGen(attacker, defender, 'Extra', 3, false);
            
            results.attacks.push({ type: 'Extra', damage: exDmg, np: exNp, stars: exStar });
        }
        
        // 4. 處理 Chain 的額外獎勵 (Arts +20NP, Quick +10星)
        // 這些通常是直接加到結果裡，或者回傳讓 UI 處理
        // 這裡我們先簡單加到第一張卡的結果裡顯示
        if (results.chainBonus.artsChain) {
             results.attacks[0].np += 20; 
        }
        
        return results;
    }
};
