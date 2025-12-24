const Engine = {
    // 翻譯對照表
    BUFF_NAMES: {
        'atk_up': '攻擊力提升',
        'def_up': '防禦力提升',
        'def_down': '防禦力下降',
        'np_dmg_up': '寶具威力提升',
        'card_up': '指令卡性能提升',
        'crit_dmg_up': '暴擊威力提升',
        'np_gain_up': 'NP獲得量提升',
        'star_gen_up': '掉星率提升',
        'star_gather_up': '集星率提升',
        'invincible': '無敵',
        'evade': '迴避',
        'guts': '毅力',
        'target_focus': '目標集中',
        'anti_purge_defense': '對肅正防禦',
        'special_dmg_up': '特攻狀態',
        'sleep': '睡眠',
        'permanent_sleep': '永久睡眠',
        'debuff_immune': '狀態免疫',
        'buff_boost': '效果增幅',
        'np_loss_turn_end': '回合結束NP減少'
    },

    // 1. 初始化與練度計算
    initServant: (servantData, levelSetting) => {
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

        const servant = JSON.parse(JSON.stringify(servantData));
        
        servant.currentStats = {
            hp: baseHp + fouHp,
            atk: baseAtk + fouAtk
        };
        servant.currentHp = servant.currentStats.hp;
        servant.maxHp = servant.currentStats.hp;
        servant.currentNp = 0;
        servant.buffs = [];

        // 被動技能解鎖
        if (!servant.passive_skills) servant.passive_skills = [];
        
        if (servant.append_skills) {
            const appendToUnlock = [];
            if (levelSetting === 'lv100') {
                appendToUnlock.push(2, 5); 
            } else if (levelSetting === 'lv120') {
                appendToUnlock.push(1, 2, 3, 4, 5); 
            }

            servant.append_skills.forEach(skill => {
                if (appendToUnlock.includes(skill.id)) {
                    servant.passive_skills.push(skill);
                }
            });
        }

        // 開場生效被動 (魔力裝填)
        servant.passive_skills.forEach(skill => {
            skill.effects.forEach(effect => {
                if (effect.type === 'start_np') {
                    servant.currentNp += effect.val;
                }
            });
        });

        if (servant.currentNp > 300) servant.currentNp = 300;

        return servant;
    },

    getConstant: (category, key1, key2 = null) => {
        if (!DB.CONSTANTS[category]) return 1.0;
        if (key2) {
            return DB.CONSTANTS[category][key1] ? (DB.CONSTANTS[category][key1][key2] || 1.0) : 1.0;
        }
        return DB.CONSTANTS[category][key1] || 1.0;
    },

    // 2. 集星分配
    distributeStars: (handCards, totalStars) => {
        let totalWeight = 0;
        const weights = [];

        handCards.forEach(card => {
            const servant = card.owner; 
            let weight = servant.hidden_stats.star_absorb;
            weight += Engine.getBuffTotal(servant, 'star_gather_up');
            const randomLuck = [0, 20, 50][Math.floor(Math.random() * 3)];
            weight += randomLuck;
            
            if (weight < 0) weight = 0;
            weights.push(weight);
            totalWeight += weight;
        });

        handCards.forEach(c => c.critChance = 0);

        for (let i = 0; i < totalStars; i++) {
            let r = Math.random() * totalWeight;
            for (let j = 0; j < handCards.length; j++) {
                r -= weights[j];
                if (r <= 0) {
                    if (handCards[j].critChance < 100) {
                        handCards[j].critChance += 10; 
                    }
                    break;
                }
            }
        }
        return 0; 
    },

    // 3. 技能與 Buff
    useSkill: (user, target, skill) => {
        const results = {
            npCharged: 0,
            starsGained: 0,
            buffsAdded: []
        };

        if (!skill.effects) return results;

        skill.effects.forEach(effect => {
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
                if (target.buffs) {
                    target.buffs = target.buffs.filter(b => !b.isDebuff);
                }
            }
            else if (effect.type === 'skill_cooldown_reduce_trigger') {
               // 忽略被動
            }
            else {
                if (Engine.checkImmunity(target, effect)) {
                    console.log(`Effect ${effect.type} blocked`);
                } else {
                    Engine.applyBuff(user, target, effect);
                    results.buffsAdded.push(effect.type);
                }
            }
        });

        return results;
    },

    checkImmunity: (target, effect) => {
        if (!target.passive_skills) return false;
        for (let ps of target.passive_skills) {
            for (let eff of ps.effects) {
                if (eff.type === 'debuff_immune') {
                    if (eff.immune_tags && eff.immune_tags.includes(effect.type)) return true;
                }
            }
        }
        return false;
    },

    applyBuff: (source, target, effect) => {
        const buff = {
            id: Date.now() + Math.random(),
            // 【修正】這裡使用翻譯對照表，如果找不到就顯示原文
            name: Engine.BUFF_NAMES[effect.type] || effect.type, 
            type: effect.type, 
            val: effect.val,
            turn: effect.turn || 0,
            count: effect.count || null,
            isDebuff: effect.is_debuff || false,
            sourceId: source.id,
            card: effect.card || null,       
            trait: effect.trait || null,     
            cond_class: effect.cond_class || null,
            sub_type: effect.sub_type || null 
        };

        if (!target.buffs) target.buffs = [];
        target.buffs.push(buff);
    },

    getBuffTotal: (servant, buffType, filterFn = null) => {
        if (!servant.buffs) return 0;
        let total = 0;
        
        let boostRate = 0;
        servant.buffs.forEach(b => {
            if (b.type === 'buff_boost' && b.sub_type === buffType) {
                boostRate += b.val;
            }
        });

        servant.buffs.forEach(b => {
            if (b.type === buffType) {
                if (filterFn && !filterFn(b)) return;
                let value = b.val;
                if (boostRate > 0) value *= (1 + boostRate);
                total += value;
            }
        });
        return total;
    },

    // 4. 傷害公式
    calculateDamage: (attacker, defender, cardType, cardPos = 0, isCrit = false, isBusterChain = false) => {
        const C = DB.CONSTANTS;
        
        let damage = attacker.currentStats.atk * 0.23;

        let cardDamageVal = 0;
        if (cardType === 'NP') cardDamageVal = 6.0; 
        else if (cardType === 'Extra') cardDamageVal = 2.0; 
        else cardDamageVal = C.card_performance[cardType].damage[Math.min(cardPos, 2)];
        
        damage *= cardDamageVal;

        const classAtkMod = C.class_constants[attacker.class] ? C.class_constants[attacker.class].atk_mod : 1.0;
        damage *= classAtkMod;

        let classAffinity = Engine.getConstant('class_affinity', attacker.class, defender.class);
        damage *= classAffinity;

        const attrAffinity = Engine.getConstant('attribute_affinity', attacker.attribute, defender.attribute);
        damage *= attrAffinity;

        const randomMod = 0.9 + Math.random() * 0.199;
        damage *= randomMod;

        // Buffs
        const atkBuff = Engine.getBuffTotal(attacker, 'atk_up');
        const appendAtkMod = Engine.getBuffTotal(attacker, 'atk_up_vs_class', b => b.cond_class === defender.class);
        const defBuff = 0; 
        const totalAtkMod = atkBuff + appendAtkMod - defBuff;

        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
        const cardResist = 0; 

        let powerMod = 0;
        if (cardType === 'NP') {
            powerMod += Engine.getBuffTotal(attacker, 'np_dmg_up');
        }

        if (attacker.buffs) {
            attacker.buffs.forEach(b => {
                if (b.type === 'special_dmg_up') {
                    if (defender.traits && defender.traits.includes(b.trait)) {
                        powerMod += b.val;
                    }
                }
            });
        }

        let critBuff = 0;
        if (isCrit) {
            critBuff = Engine.getBuffTotal(attacker, 'crit_dmg_up', b => b.card === cardType || b.card === null);
        }
        
        damage *= (1 + cardBuff - cardResist);
        damage *= Math.max(0, (1 + totalAtkMod));

        if (isCrit) {
            damage *= 2.0 * (1 + critBuff);
        }
        
        damage *= (1 + powerMod);

        if (isBusterChain) {
            damage += attacker.currentStats.atk * 0.2;
        }

        return Math.floor(damage);
    },

    // 5. NP 回收
    calculateNPGain: (attacker, defender, cardType, cardPos = 0, damageTotal = 0, isCrit = false) => {
        const C = DB.CONSTANTS;
        const hidden = attacker.hidden_stats;
        let hitsArr = attacker.cards.hits[cardType] || [100];

        let totalNp = 0.0;
        let currentEnemyHp = defender.currentHp;
        let baseNpRate = hidden.np_charge_atk; 

        let cardNpVal = 0;
        if (cardType === 'NP') cardNpVal = 1.0; 
        else if (cardType === 'Extra') cardNpVal = 1.0;
        else cardNpVal = C.card_performance[cardType].np[Math.min(cardPos, 2)];

        const enemyNpMod = C.class_constants[defender.class] ? C.class_constants[defender.class].np_enemy_mod : 1.0;

        const cardBuff = Engine.getBuffTotal(attacker, 'card_up', b => b.card === cardType || b.card === null);
        const npGainBuff = Engine.getBuffTotal(attacker, 'np_gain_up'); 

        hitsArr.forEach((hitRatio) => {
            const hitDamage = Math.floor(damageTotal * (hitRatio / 100));
            let isOverkill = false;
            
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

    // 打星
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
        if (dropRate > 3.0) dropRate = 3.0; 

        return Math.round(dropRate * hitsArr.length);
    },

    // 6. 回合結束
    processTurnEnd: (servant) => {
        if (!servant.buffs) return;

        servant.buffs.forEach(b => {
            if (b.type === 'np_loss_turn_end') {
                servant.currentNp -= b.val;
                if (servant.currentNp < 0) servant.currentNp = 0;
            }
        });

        servant.buffs.forEach(b => {
            if (b.turn > 0) {
                b.turn -= 1;
            }
        });

        servant.buffs = servant.buffs.filter(b => b.turn > 0 || b.count > 0);
    },

    // 7. 【關鍵修正】回合總結算 (支援物件型 cardChain)
    calculateTurn: (attacker, defender, cardChain, useNP = false) => {
        const results = {
            attacks: [],
            chainBonus: { busterChain: false, artsChain: false, quickChain: false, braveChain: false }
        };

        // 1. 解析 Chain (cardChain 是物件陣列)
        const firstCardType = cardChain[0].type;
        const isSameColor = cardChain.every(c => c.type === firstCardType);
        
        if (isSameColor) {
            if (firstCardType === 'Buster') results.chainBonus.busterChain = true;
            if (firstCardType === 'Arts') results.chainBonus.artsChain = true;
            if (firstCardType === 'Quick') results.chainBonus.quickChain = true;
        }

        // 2. Brave Chain
        const firstOwnerId = cardChain[0].attacker.id;
        const isBraveChain = cardChain.every(c => c.attacker.id === firstOwnerId);
        results.chainBonus.braveChain = isBraveChain;

        // 3. 逐卡計算
        cardChain.forEach((cardObj, index) => {
            // 【修復崩潰】直接從卡片物件獲取 attacker，不再使用 null
            const currentAttacker = cardObj.attacker; 
            const cardType = cardObj.type;
            let isBusterChainActive = results.chainBonus.busterChain;

            // 實裝暴擊 (隨機數 < critChance)
            const rand = Math.random() * 100;
            const isCrit = (cardObj.critChance || 0) > rand;

            const dmg = Engine.calculateDamage(currentAttacker, defender, cardType, index, isCrit, isBusterChainActive);
            const np = Engine.calculateNPGain(currentAttacker, defender, cardType, index, dmg, isCrit);
            const star = Engine.calculateStarGen(currentAttacker, defender, cardType, index, isCrit);

            results.attacks.push({ type: cardType, damage: dmg, np: np, stars: star, isCrit: isCrit });
        });

        // 4. Extra Attack
        if (results.chainBonus.braveChain) {
            const extraAttacker = cardChain[0].attacker; 
            const exDmg = Engine.calculateDamage(extraAttacker, defender, 'Extra', 3, false, results.chainBonus.busterChain);
            const exNp = Engine.calculateNPGain(extraAttacker, defender, 'Extra', 3, exDmg);
            const exStar = Engine.calculateStarGen(extraAttacker, defender, 'Extra', 3, false);
            results.attacks.push({ type: 'Extra', damage: exDmg, np: exNp, stars: exStar, isCrit: false });
        }
        
        return results;
    }
};
