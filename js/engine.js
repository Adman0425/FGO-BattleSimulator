const Engine = {
    // =========================================================================
    // 1. 初始化與練度計算 (含被動技解鎖)
    // =========================================================================
    initServant: (servantData, levelSetting) => {
        // 1. 基礎數值計算
        let baseHp = 0, baseAtk = 0, fouHp = 0, fouAtk = 0;
        let maxLevel = 90;

        if (levelSetting === 'natural') {
            baseHp = servantData.stats.natural.hp;
            baseAtk = servantData.stats.natural.atk;
            fouHp = 1000; fouAtk = 1000;
            maxLevel = 90;
        } else if (levelSetting === 'lv100') {
            baseHp = servantData.stats.lv100.hp;
            baseAtk = servantData.stats.lv100.atk;
            fouHp = 2000; fouAtk = 2000;
            maxLevel = 100;
        } else if (levelSetting === 'lv120') {
            baseHp = servantData.stats.lv120.hp;
            baseAtk = servantData.stats.lv120.atk;
            fouHp = 2000; fouAtk = 2000;
            maxLevel = 120;
        }

        // 複製一份資料以免汙染原始 DB
        const servant = JSON.parse(JSON.stringify(servantData));
        
        servant.currentStats = {
            hp: baseHp + fouHp,
            atk: baseAtk + fouAtk
        };
        servant.currentHp = servant.currentStats.hp;
        servant.maxHp = servant.currentStats.hp;
        servant.currentNp = 0;
        servant.buffs = []; // 初始化 Buff 列表

        // 2. 被動技能解鎖 (Append Skills)
        if (!servant.passive_skills) servant.passive_skills = [];
        
        if (servant.append_skills) {
            // 規則：Lv100 開放 2技(充能) & 5技(CD)；Lv120 開放全部(1-5)
            // 這裡假設: 
            // id:1 (追擊), id:2 (充能), id:3 (對職階), id:4 (暴擊), id:5 (CD)
            // 根據你的需求客製化
            
            const appendToUnlock = [];
            if (levelSetting === 'lv100') {
                appendToUnlock.push(2, 5); // 開放被動 2, 5
            } else if (levelSetting === 'lv120') {
                appendToUnlock.push(1, 2, 3, 4, 5); // 全部開放
            }

            servant.append_skills.forEach(skill => {
                if (appendToUnlock.includes(skill.id)) {
                    servant.passive_skills.push(skill);
                }
            });
        }

        // 3. 處理「開場生效」的被動 (如：魔力裝填)
        servant.passive_skills.forEach(skill => {
            skill.effects.forEach(effect => {
                if (effect.type === 'start_np') {
                    servant.currentNp += effect.val;
                }
            });
        });

        // 處理超過 300% 的情況
        if (servant.currentNp > 300) servant.currentNp = 300;

        return servant;
    },

    // 輔助查表
    getConstant: (category, key1, key2 = null) => {
        if (!DB.CONSTANTS[category]) return 1.0;
        if (key2) {
            return DB.CONSTANTS[category][key1] ? (DB.CONSTANTS[category][key1][key2] || 1.0) : 1.0;
        }
        return DB.CONSTANTS[category][key1] || 1.0;
    },

    // =========================================================================
    // 2. 戰鬥階段邏輯：集星分配 (Star Distribution)
    // =========================================================================
    distributeStars: (handCards, totalStars) => {
        // 1. 計算每張卡的權重 (Base Absorb + Card Mod + Random)
        // 手牌結構預期: { type: 'Buster', owner: servantObj, critChance: 0 }
        
        let totalWeight = 0;
        const weights = [];

        handCards.forEach(card => {
            const servant = card.owner; // 注意：這裡 UI 必須傳入從者物件引用
            let weight = servant.hidden_stats.star_absorb;

            // 加上集星 Buff
            weight += Engine.getBuffTotal(servant, 'star_gather_up');
            
            // 運氣補正 (FGO 機制：每張卡隨機 +0, +20, +50)
            const randomLuck = [0, 20, 50][Math.floor(Math.random() * 3)];
            weight += randomLuck;

            // 職階補正 (與特定卡色補正，暫略，可在此擴充)
            
            if (weight < 0) weight = 0;
            weights.push(weight);
            totalWeight += weight;
        });

        // 2. 分配星星
        // 為了模擬真實感，我們一顆一顆分，或者依比例分
        // 簡單實作：依權重機率分配
        
        // 重置暴擊率
        handCards.forEach(c => c.critChance = 0);

        for (let i = 0; i < totalStars; i++) {
            let r = Math.random() * totalWeight;
            for (let j = 0; j < handCards.length; j++) {
                r -= weights[j];
                if (r <= 0) {
                    // 這張卡獲得一顆星
                    if (handCards[j].critChance < 100) {
                        handCards[j].critChance += 10; // 每顆星 +10%
                    }
                    break;
                }
            }
        }
        
        // 回傳分配剩下的星星 (若全滿100%，多餘的保留?) 
        // FGO 規則：超過 50 顆星就浪費掉。這裡簡單回傳 0，假設全部分完。
        return 0; 
    },

    // =========================================================================
    // 3. 技能與 Buff 系統
    // =========================================================================

    useSkill: (user, target, skill) => {
        const results = {
            npCharged: 0,
            starsGained: 0,
            buffsAdded: []
        };

        if (!skill.effects) return results;

        skill.effects.forEach(effect => {
            // 1. 瞬時效果 (Instant)
            if (effect.type === 'np_charge') {
                target.currentNp += effect.val;
                if (target.currentNp > 300) target.currentNp = 300;
                results.npCharged += effect.val;
            } 
            else if (effect.type === 'star_gen_flat') {
                results.starsGained += effect.val;
            }
            else if (effect.type === 'hp_recover') {
                target.currentHp += effect.val;
                if (target.currentHp > target.maxHp) target.currentHp = target.maxHp;
            }
            else if (effect.type === 'remove_debuff') {
                // 移除所有 isDebuff 為 true 的狀態
                if (target.buffs) {
                    target.buffs = target.buffs.filter(b => !b.isDebuff);
                }
            }
            else if (effect.type === 'skill_cooldown_reduce_trigger') {
               // 這是被動，不應在主動技能觸發，忽略
            }
            // 2. 持續效果 (Buff/Debuff)
            else {
                // 檢查是否被免疫 (如奧伯龍被動免疫精神異常)
                if (Engine.checkImmunity(target, effect)) {
                    console.log(`Effect ${effect.type} blocked by immunity`);
                } else {
                    Engine.applyBuff(user, target, effect);
                    results.buffsAdded.push(effect.type);
                }
            }
        });

        // 觸發「使用技能後」的被動 (如：技能再裝填)
        if (user.passive_skills) {
            user.passive_skills.forEach(ps => {
                ps.effects.forEach(eff => {
                    if (eff.type === 'skill_cooldown_reduce_trigger') {
                        // 邏輯：檢查次數，若有剩餘，則該技能 CD -1
                        // 這裡需要 UI 層配合傳入 skill index 才能扣 CD
                        // 暫時標記：需要在 UI 實作
                    }
                });
            });
        }

        return results;
    },

    // 檢查免疫
    checkImmunity: (target, effect) => {
        if (!target.passive_skills) return false;
        // 檢查目標所有被動是否有 'debuff_immune'
        for (let ps of target.passive_skills) {
            for (let eff of ps.effects) {
                if (eff.type === 'debuff_immune') {
                    // 如果效果有 tags (例如 mental)，且在免疫清單內
                    // 這裡簡化：目前 JSON 還沒詳細定義每個 buff 的 tag
                    // 若 effect.type 在 eff.immune_tags 裡 (例如 'curse')
                    if (eff.immune_tags && eff.immune_tags.includes(effect.type)) return true;
                }
            }
        }
        return false;
    },

    applyBuff: (source, target, effect) => {
        const buff = {
            id: Date.now() + Math.random(),
            name: effect.type, 
            type: effect.type, 
            val: effect.val,
            turn: effect.turn || 0,
            count: effect.count || null,
            isDebuff: effect.is_debuff || false,
            sourceId: source.id,
            // 特殊欄位複製
            card: effect.card || null,       
            trait: effect.trait || null,     
            cond_class: effect.cond_class || null,
            sub_type: effect.sub_type || null // for buff_boost
        };

        if (!target.buffs) target.buffs = [];
        target.buffs.push(buff);
    },

    // 取得 Buff 總值 (含 Buff Boost 邏輯)
    getBuffTotal: (servant, buffType, filterFn = null) => {
        if (!servant.buffs) return 0;
        let total = 0;
        
        // 先計算是否有「Buff增幅 (buff_boost)」狀態 (奧伯龍三技)
        let boostRate = 0;
        servant.buffs.forEach(b => {
            if (b.type === 'buff_boost' && b.sub_type === buffType) {
                boostRate += b.val; // e.g., +1.0 (翻倍)
            }
        });

        servant.buffs.forEach(b => {
            if (b.type === buffType) {
                if (filterFn && !filterFn(b)) return;
                
                let value = b.val;
                // 套用增幅
                if (boostRate > 0) value *= (1 + boostRate);
                
                total += value;
            }
        });
        return total;
    },

    // =========================================================================
    // 4. 傷害公式 (完整版)
    // =========================================================================
    calculateDamage: (attacker, defender, cardType, cardPos = 0, isCrit = false, isBusterChain = false) => {
        const C = DB.CONSTANTS;
        
        // 0. 基礎傷害
        let damage = attacker.currentStats.atk * 0.23;

        // 1. 卡片倍率
        let cardDamageVal = 0;
        if (cardType === 'NP') cardDamageVal = 6.0; // 暫定 (應讀取寶具倍率)
        else if (cardType === 'Extra') cardDamageVal = 2.0; 
        else cardDamageVal = C.card_performance[cardType].damage[Math.min(cardPos, 2)];
        
        damage *= cardDamageVal;

        // 2. 職階補正 & 職階相剋
        const classAtkMod = C.class_constants[attacker.class] ? C.class_constants[attacker.class].atk_mod : 1.0;
        damage *= classAtkMod;

        let classAffinity = Engine.getConstant('class_affinity', attacker.class, defender.class);
        
        // 檢查「對職階攻擊適性」 (Append 3)
        const atkVsClass = Engine.getBuffTotal(attacker, 'atk_up_vs_class', b => b.cond_class === defender.class);
        // 注意：適性是加在職階相剋係數上的嗎？通常是作為一種特攻 Buff，或是直接影響相剋倍率。
        // FGO 機制：攻擊適性屬於「攻擊力 Buff」的一種，還是「特攻」？
        // 更正：Append 3 (攻擊適性) 在公式中其實是屬於「攻擊力 Buff」那一類的加算 (Attack Up)，而不是改變 2.0/0.5 的相剋係數。
        // 所以我們把它移到下面 Buff 區計算。

        damage *= classAffinity;

        // 3. 陣營相剋
        const attrAffinity = Engine.getConstant('attribute_affinity', attacker.attribute, defender.attribute);
        damage *= attrAffinity;

        // 4. 亂數 (0.9 ~ 1.099)
        const randomMod = 0.9 + Math.random() * 0.199;
        damage *= randomMod;

        // --- Buff 計算區 ---
        
        // A. 攻擊力類 (Atk Buff - Def Buff)
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        const appendAtkMod = Engine.getBuffTotal(attacker, 'atk_up_vs_class', b => b.cond_class === defender.class); // Append 3
        const defBuff = 0; // 暫無 defender.buffs 邏輯，預留
        // 敵方防禦力下降 = 敵方身上的 def_down + 我方身上的 ignore_def(無視防禦)? 
        // 這裡先只算我方 Atk + Append
        const totalAtkMod = atkBuff + appendAtkMod - defBuff;

        // B. 色卡性能 (Card Mod)
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
        const cardResist = 0; 

        // C. 威力提升類 (Power Mod: 寶具威/特攻/爆傷)
        let powerMod = 0;
        
        // C-1. 寶具威力
        if (cardType === 'NP') {
            powerMod += Engine.getBuffTotal(attacker, 'np_dmg_up');
        }

        // C-2. 特攻 (Special Damage)
        // 檢查攻擊者身上的特攻狀態
        if (attacker.buffs) {
            attacker.buffs.forEach(b => {
                if (b.type === 'special_dmg_up') {
                    // 檢查 trait
                    if (defender.traits && defender.traits.includes(b.trait)) {
                        powerMod += b.val;
                    }
                }
            });
        }
        // 寶具自帶特攻 (如奧伯龍對秩序) 應該在傳入時處理，或在此處無法讀取寶具詳細
        // 暫時假設 Engine.calculateDamage 的 attacker 參數不包含當次寶具特攻資訊
        // *需要在 useNP 時將特攻數值加到 powerMod 傳進來，或這裡不做處理

        // C-3. 暴擊威力
        let critBuff = 0;
        if (isCrit) {
            critBuff = Engine.getBuffTotal(attacker, 'crit_dmg_up', b => b.card === cardType || b.card === null);
        }
        
        // --- 總乘算 ---
        // 1. 色卡
        damage *= (1 + cardBuff - cardResist);
        
        // 2. 攻防
        damage *= Math.max(0, (1 + totalAtkMod));

        // 3. 暴擊 (含爆傷 Buff)
        if (isCrit) {
            damage *= 2.0 * (1 + critBuff);
        }
        
        // 4. 威力提升 (寶具威 + 特攻)
        damage *= (1 + powerMod);

        // 5. Buster Chain 加成 (最後加算)
        if (isBusterChain) {
            damage += attacker.currentStats.atk * 0.2;
        }

        // 6. 特殊防禦 (對肅正/無敵/迴避)
        // 檢查防禦者是否有對肅正
        // if (defender.buffs.some(b => b.type === 'anti_purge_defense')) return 0;
        // 這裡暫時只回傳傷害值，防禦邏輯交給 UI 顯示 0

        return Math.floor(damage);
    },

    // =========================================================================
    // 5. NP 與 打星 (完整版)
    // =========================================================================
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;
        let hitsArr = attacker.cards.hits[cardType] || [100];

        let totalNp = 0.0;
        let currentEnemyHp = defender.currentHp;
        let baseNpRate = hidden.np_charge_atk; 

        // 卡片 NP 倍率
        let cardNpVal = 0;
        if (cardType === 'NP') cardNpVal = 1.0; 
        else if (cardType === 'Extra') cardNpVal = 1.0;
        else cardNpVal = C.card_performance[cardType].np[Math.min(cardPos, 2)];

        const enemyNpMod = C.class_constants[defender.class] ? C.class_constants[defender.class].np_enemy_mod : 1.0;

        // Buffs
        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
        const npGainBuff = Engine.getBuffTotal(attacker, 'np_gain_up'); 

        hitsArr.forEach((hitRatio) => {
            const hitDamage = Math.floor(damageTotal * (hitRatio / 100));
            let isOverkill = false;
            
            // Overkill 判定
            if (currentEnemyHp <= 0) {
                isOverkill = true;
            } else {
                currentEnemyHp -= hitDamage;
                if (currentEnemyHp <= 0) isOverkill = true;
            }
            const overkillMod = isOverkill ? 1.5 : 1.0;

            let hitNp = baseNpRate * cardNpVal * enemyNpMod * (1 + cardBuff) * (1 + npGainBuff);
            if (isCrit) hitNp *= 2.0;
            hitNp *= overkillMod;

            totalNp += hitNp; 
        });

        return Math.round(totalNp);
    },

    calculateStarGen: (attacker, defender, cardType, cardPos = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;
        let hitsArr = attacker.cards.hits[cardType] || [100];
        
        const baseStarGen = hidden.star_gen; 
        let cardStarVal = 0;
        if (cardType === 'NP') cardStarVal = 0; 
        else if (cardType === 'Extra') cardStarVal = 1.0;
        else cardStarVal = C.card_performance[cardType].star[Math.min(cardPos, 2)];

        const enemyStarMod = C.class_constants[defender.class] ? C.class_constants[defender.class].star_enemy_mod : 0.0;
        const starGenBuff = Engine.getBuffTotal(attacker, 'star_gen_up');

        let dropRate = baseStarGen + cardStarVal + enemyStarMod + starGenBuff;
        if (isCrit) dropRate += 0.2; 
        if (dropRate > 3.0) dropRate = 3.0; // 上限 300%

        return Math.round(dropRate * hitsArr.length);
    },

    // =========================================================================
    // 6. 回合結束處理 (Turn End)
    // =========================================================================
    processTurnEnd: (servant) => {
        if (!servant.buffs) return;

        // 1. 處理「回合結束發動」的效果 (如：奧伯龍二技扣NP、三技睡眠)
        // 這裡需要遍歷 buffs 找 trigger: 'turn_end'
        servant.buffs.forEach(b => {
            if (b.type === 'np_loss_turn_end') {
                servant.currentNp -= b.val;
                if (servant.currentNp < 0) servant.currentNp = 0;
            }
            // 這裡可以擴充其他回合結束效果 (HP回復、燒傷等)
        });

        // 2. 扣除回合數
        // 過濾掉 turn <= 0 且非永久的 buff
        // 規則： turn > 0 才扣， turn = 0 代表本次行動結束就沒了? 
        // 通常 FGO 是：3回合 = 對方回合結束後 -1。
        // 我們這裡簡單做：每次 processTurnEnd 就 -1
        
        servant.buffs.forEach(b => {
            if (b.turn > 0) {
                b.turn -= 1;
            }
            // 次數制 (count) 是在觸發時扣，這裡不處理
        });

        // 3. 移除過期 Buff
        // 保留條件：(turn > 0) 或者 (turn是永久999) 或者 (是次數制 count > 0)
        // 這裡假設 turn=0 就移除 (除非是永久類，永久類我們設定 turn=999)
        servant.buffs = servant.buffs.filter(b => b.turn > 0 || b.count > 0);
    },

    // 7. 回合總結算 (供 UI 呼叫)
    calculateTurn: (attacker, defender, cardChain, useNP = false) => {
        const results = {
            attacks: [],
            chainBonus: { busterChain: false, artsChain: false, quickChain: false, braveChain: true }
        };

        const firstCard = cardChain[0];
        const isSameColor = cardChain.every(c => c === firstCard);
        
        if (isSameColor) {
            if (firstCard === 'Buster') results.chainBonus.busterChain = true;
            if (firstCard === 'Arts') results.chainBonus.artsChain = true;
            if (firstCard === 'Quick') results.chainBonus.quickChain = true;
        }

        // Brave Chain 判斷邏輯需在 UI 層確認 owner 是否同一人，這裡假設是 (單人模擬)
        // 若是組隊，UI 應傳入正確的 attacker 陣列，這裡簡化為單一 attacker

        cardChain.forEach((cardType, index) => {
            let isBusterChainActive = results.chainBonus.busterChain;
            // 這裡假設有暴擊資料傳入，暫時設為 false
            // 實際上應該讀取 card 物件上的 critChance > random
            const isCrit = false; 

            const dmg = Engine.calculateDamage(attacker, defender, cardType, index, isCrit, isBusterChainActive);
            const np = Engine.calculateNPGain(attacker, defender, cardType, index, dmg, isCrit);
            const star = Engine.calculateStarGen(attacker, defender, cardType, index, isCrit);

            results.attacks.push({ type: cardType, damage: dmg, np: np, stars: star, isCrit: isCrit });
        });

        if (results.chainBonus.braveChain) {
            const exDmg = Engine.calculateDamage(attacker, defender, 'Extra', 3, false, results.chainBonus.busterChain);
            const exNp = Engine.calculateNPGain(attacker, defender, 'Extra', 3, exDmg);
            const exStar = Engine.calculateStarGen(attacker, defender, 'Extra', 3, false);
            results.attacks.push({ type: 'Extra', damage: exDmg, np: exNp, stars: exStar, isCrit: false });
        }
        
        if (results.chainBonus.artsChain) results.attacks[0].np += 20; 

        return results;
    }
};
