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
    // 4. 核心：NP 回收公式 (NP Gain per Hit)
    // =========================================================================
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        // 取得該卡片的 Hit 分佈陣列
        // 範例: Quick: [25, 75]
        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100]; // 防呆，預設 1 Hit

        let totalNp = 0;
        
        // 計算「每一 Hit」的傷害 (平均分配總傷害)
        // 這是為了計算 Overkill。如果這一刀下去怪死了，這刀就是 Overkill。
        let currentEnemyHp = defender.currentHp;
        
        // 取得基礎參數
        let baseNpRate = hidden.np_charge_atk / 100; // 轉成小數 (0.84 -> 0.0084) 
        // 注意：如果你 JSON 裡存的是 0.84，這邊可能要除 100，或者之後乘 100
        // 通常 JSON 裡是 0.84 (%)，所以計算時要留意單位。
        // 我們這裡假設 JSON 裡的 0.84 就是 0.84%，計算時用數值運算
        
        // 卡片補正 (NP Card Constant)
        let cardNpVal = 0;
        if (cardType === 'NP') {
            cardNpVal = 1.0; // 寶具卡倍率通常不隨位置改變
        } else if (cardType === 'Extra') {
            cardNpVal = 1.0;
        } else {
            cardNpVal = C.card_performance[cardType].np[Math.min(cardPos, 2)];
        }

        // 敵方補正 (Enemy Server Mod)
        // 來自 constants 的 class_constants (例如 術=1.2, 殺=0.9)
        const enemyNpMod = C.class_constants[defender.class] ? C.class_constants[defender.class].np_enemy_mod : 1.0;

        // 遍歷每一個 Hit 進行計算
        hitsArr.forEach((hitRatio, index) => {
            // 1. 判斷 Overkill
            // 該 Hit 造成的傷害
            const hitDamage = Math.floor(damageTotal * (hitRatio / 100));
            
            // 判斷：攻擊「前」怪已經死了？ 或是 攻擊「後」怪死了？
            // FGO 邏輯：如果攻擊前血量已經 <= 0，這一下必定 Overkill
            // 如果攻擊前血量 > 0，但這一下打完 <= 0，這一下算 Overkill (FGO鞭屍判定更複雜，這是簡化版)
            let isOverkill = false;
            if (currentEnemyHp <= 0) {
                isOverkill = true;
            } else {
                currentEnemyHp -= hitDamage;
                if (currentEnemyHp <= 0) isOverkill = true; // 這一下致死也算
            }
            const overkillMod = isOverkill ? 1.5 : 1.0;

            // 2. Buff 區塊
            const cardBuff = 0;   // 魔放
            const cardResist = 0; // 敵方耐性
            const npGainBuff = 0; // 黃金律 (NP獲得量提升)

            // 3. 單 Hit NP 公式
            // NP = 基礎率 * 卡片補正 * 敵補正 * (1 + 魔放 - 耐性) * (1 + 黃金律) * 暴擊補正 * Overkill
            
            let hitNp = hidden.np_charge_atk; // 0.84
            hitNp *= cardNpVal;               // x3.0 (如果是藍卡首位)
            hitNp *= enemyNpMod;              // x1.0 (打劍職)
            hitNp *= (1 + cardBuff - cardResist);
            hitNp *= (1 + npGainBuff);
            
            if (isCrit) hitNp *= 2.0;         // 暴擊 NP 翻倍！
            hitNp *= overkillMod;             // 鞭屍 x1.5

            // FGO 是每一擊都會進行 floor (捨去小數點後兩位，只留兩位)
            // 例如算出來 3.456 -> 3.45
            // 這裡我們先累加，最後再修整
            totalNp += hitNp;
        });

        // 寶具如果是 Arts 卡，通常回收量很大，但公式是一樣的
        // 只是寶具卡本身的 cardNpVal 不同

        return Math.floor(totalNp * 100) / 100; // 回傳保留兩位小數的數字
    },

    // =========================================================================
    // 5. 核心：打星公式 (Star Generation per Hit)
    // =========================================================================
    calculateStarGen: (attacker, defender, cardType, cardPos = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;

        // 取得 Hit 分佈
        let hitsArr = attacker.cards.hits[cardType];
        if (!hitsArr) hitsArr = [100];
        
        let totalStars = 0; // 期望值 (不是實際顆數，因為打星是機率)

        // 基礎參數
        const baseStarGen = hidden.star_gen; // 0.1 (10%)

        // 卡片補正 (Star Drop Mod)
        let cardStarVal = 0;
        if (cardType === 'NP') {
            cardStarVal = 0; // 寶具卡通常看色卡，這裡簡化
        } else if (cardType === 'Extra') {
            cardStarVal = 1.0;
        } else {
            cardStarVal = C.card_performance[cardType].star[Math.min(cardPos, 2)];
        }

        // 敵方補正 (Server Mod)
        const enemyStarMod = C.class_constants[defender.class] ? C.class_constants[defender.class].star_enemy_mod : 0.0;

        // Buff
        const starGenBuff = 0; // 千里眼 (掉星率提升)
        const cardBuff = 0;    // 魔放

        // 遍歷 Hit (雖然打星率通常整張卡一樣，但為了 Overkill 還是要分開算)
        // 這裡簡化：假設沒有 Overkill，全部算在一起
        // 每一擊的掉星率 (Drop Rate)
        // Rate = 基礎 + 卡片 + 敵補正 + (1+魔放) + 掉星Buff + 暴擊補正(20%) + Overkill(30%)
        
        let dropRate = baseStarGen + cardStarVal + enemyStarMod + starGenBuff;
        // 注意：魔放對打星的影響比較特殊，通常是 (卡片值 * (1+魔放)) + 其他
        // 這裡採用簡易公式：
        
        if (isCrit) dropRate += 0.2; // 暴擊 +20%
        // if (isOverkill) dropRate += 0.3; // 鞭屍 +30% (這裡暫時省略 Overkill 判定)

        // 限制：最大 300% (3顆)
        if (dropRate > 3.0) dropRate = 3.0;

        // 期望星星數 = 每一擊的機率 * Hit數
        // 實際模擬應該要跑 Math.random()，這裡回傳「期望獲得顆數」
        totalStars = dropRate * hitsArr.length;

        return Math.floor(totalStars * 10) / 10;
    }
};
