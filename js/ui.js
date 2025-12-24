const UI = {
    gameState: {
        party: [], 
        enemy: null,
        deck: [],        
        currentHand: [], 
        // 儲存格式: { type: 'hand'|'np', val: index }
        // type='hand': val是手牌陣列索引 (0-4)
        // type='np': val是從者在隊伍中的索引 (0-2)
        selectedCards: [], 
        stars: 0,
        turnCount: 0     
    },

    cardImages: {
        'Buster': 'data/Buster.png',
        'Arts': 'data/Arts.png',
        'Quick': 'data/Quick.png',
        'NP': 'data/NP.png'
    },

    getServantIcon: (id) => {
        const idStr = String(id).padStart(3, '0');
        return `data/servant_icon/${idStr}.png`; 
    },

    getSkillIcon: (iconName) => {
        if (!iconName) return null;
        return `data/skill_icon/${iconName}`; 
    },

    init: () => {
        const fillSelect = (id) => {
            const sel = document.getElementById(id);
            DB.SERVANTS.forEach((s, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.text = `[${s.id}] ${s.name}`;
                sel.appendChild(opt);
            });
        };
        fillSelect('p1-select');
        fillSelect('p2-select');
        fillSelect('p3-select');

        const qSelect = document.getElementById('quest-select');
        DB.QUESTS.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = q.name;
            qSelect.appendChild(opt);
        });

        const saved = UserSave.loadParty() || UserSave.getDefaultParty();
        if (saved) {
            document.getElementById('p1-select').value = saved[0].servantIndex;
            document.getElementById('p1-lv').value = saved[0].level;
            document.getElementById('p2-select').value = saved[1].servantIndex;
            document.getElementById('p2-lv').value = saved[1].level;
            document.getElementById('p3-select').value = saved[2].servantIndex;
            document.getElementById('p3-lv').value = saved[2].level;
        }
    },

    saveTeam: () => {
        const partyData = [
            { servantIndex: document.getElementById('p1-select').value, level: document.getElementById('p1-lv').value },
            { servantIndex: document.getElementById('p2-select').value, level: document.getElementById('p2-lv').value },
            { servantIndex: document.getElementById('p3-select').value, level: document.getElementById('p3-lv').value }
        ];
        UserSave.saveParty(partyData);
        UI.log("隊伍已儲存。");
    },

    initBattle: () => {
        const partyIndices = [
            { idx: document.getElementById('p1-select').value, lv: document.getElementById('p1-lv').value },
            { idx: document.getElementById('p2-select').value, lv: document.getElementById('p2-lv').value },
            { idx: document.getElementById('p3-select').value, lv: document.getElementById('p3-lv').value }
        ];

        UI.gameState.party = partyIndices.map(p => {
            const data = DB.SERVANTS[p.idx];
            const servant = Engine.initServant(data, p.lv);
            if (servant.skills) servant.skills.forEach(s => s.currentCooldown = 0);
            return servant;
        });

        const qIndex = document.getElementById('quest-select').value;
        const quest = DB.QUESTS[qIndex];
        const enemyDataRaw = quest.waves[0].enemies[0];
        let eBase = DB.ENEMIES.find(e => e.id === enemyDataRaw.id) || DB.ENEMIES[0];
        const eData = {
            ...eBase,
            hp: enemyDataRaw.hp || eBase.hp,
            currentHp: enemyDataRaw.hp || eBase.hp,
            maxHp: enemyDataRaw.hp || eBase.hp,
            currentGauge: 0,
            maxGauge: enemyDataRaw.gauge || 3,
            buffs: [] 
        };
        
        UI.gameState.enemy = eData;
        UI.gameState.stars = 0;
        UI.gameState.turnCount = 0;
        
        UI.createFullDeck();

        UI.log(`--- 戰鬥開始: ${quest.name} ---`);
        UI.updateDisplay();
        
        document.getElementById('command-overlay').classList.remove('active');
        UI.dealCards(); 
    },

    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    createFullDeck: () => {
        let fullDeck = [];
        UI.gameState.party.forEach((servant, sIndex) => {
            servant.cards.deck.forEach(cardType => {
                fullDeck.push({ 
                    type: cardType, 
                    ownerIndex: sIndex, 
                    ownerId: servant.id,
                    owner: servant 
                });
            });
        });
        UI.gameState.deck = UI.shuffleArray(fullDeck);
        UI.log(">> 牌庫已重置 (15張)");
    },

    dealCards: () => {
        if (UI.gameState.party.length === 0) return;

        if (UI.gameState.deck.length < 5) {
            UI.log(">> 牌庫洗牌 (Reshuffle)");
            UI.createFullDeck();
        }

        UI.gameState.turnCount++;
        UI.log(`=== [Turn ${UI.gameState.turnCount}] Player Phase ===`);

        UI.gameState.currentHand = UI.gameState.deck.splice(0, 5);
        
        if (UI.gameState.stars > 0) {
            UI.log(`分配 ${UI.gameState.stars} 顆暴擊星...`);
            const remain = Engine.distributeStars(UI.gameState.currentHand, UI.gameState.stars);
            UI.gameState.stars = remain; 
        }

        UI.gameState.selectedCards = [];
        UI.renderAllCards(); // 渲染手牌和寶具卡
        UI.updateSelectedSlots();
    },

    // --- 核心選卡渲染邏輯 ---

    // 渲染「寶具卡」與「指令卡」
    renderAllCards: () => {
        UI.renderNPCards();
        UI.renderHand();
    },

    // 1. 渲染寶具卡 (NP >= 100 才出現)
    renderNPCards: () => {
        const container = document.getElementById('np-container');
        if (!container) return; // 防呆
        container.innerHTML = '';

        UI.gameState.party.forEach((servant, sIdx) => {
            // 檢查 NP 是否足夠
            if (servant.currentNp < 100) return;

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container np-card';
            
            // 檢查是否已選
            const isSelected = UI.gameState.selectedCards.some(s => s.type === 'np' && s.val === sIdx);
            if (isSelected) {
                cardDiv.classList.add('used');
            }
            
            cardDiv.onclick = () => UI.selectCard('np', sIdx);

            const img = document.createElement('img');
            img.src = UI.cardImages['NP']; // 使用 data/NP.png
            img.className = 'command-card-img';

            const badge = document.createElement('img');
            badge.className = 'owner-badge';
            badge.src = UI.getServantIcon(servant.id);

            // 寶具名稱 (選用)
            // const nameOverlay = document.createElement('div');
            // nameOverlay.className = 'np-name-overlay';
            // nameOverlay.innerText = servant.noble_phantasm.name;
            // cardDiv.appendChild(nameOverlay);

            cardDiv.appendChild(img);
            cardDiv.appendChild(badge);
            container.appendChild(cardDiv);
        });
    },

    // 2. 渲染手牌 (指令卡)
    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            
            // 檢查是否已選
            const isSelected = UI.gameState.selectedCards.some(s => s.type === 'hand' && s.val === index);
            if (isSelected) {
                cardDiv.classList.add('used');
            }
            
            cardDiv.onclick = () => UI.selectCard('hand', index);

            const img = document.createElement('img');
            img.src = UI.cardImages[card.type] || UI.cardImages['Buster'];
            img.className = 'command-card-img';

            if (card.critChance > 0) {
                const critBadge = document.createElement('div');
                critBadge.style.position = 'absolute';
                critBadge.style.top = '2px';
                critBadge.style.right = '2px';
                critBadge.style.color = '#ffd700';
                critBadge.style.fontWeight = 'bold';
                critBadge.style.textShadow = '1px 1px 2px #000';
                critBadge.innerText = `${card.critChance}%`;
                cardDiv.appendChild(critBadge);
            }

            const badge = document.createElement('img');
            badge.className = 'owner-badge';
            badge.src = UI.getServantIcon(card.ownerId);

            cardDiv.appendChild(img);
            cardDiv.appendChild(badge);
            container.appendChild(cardDiv);
        });
    },

    // 統一選卡入口
    selectCard: (type, val) => {
        // 如果已經選了 3 張，不能再選
        if (UI.gameState.selectedCards.length >= 3) return;
        
        // 防呆：如果這張卡已經被選過，不能再選 (CSS 已經擋了 pointer-events，但 JS 再擋一次保險)
        if (type === 'hand') {
            if (UI.gameState.selectedCards.some(s => s.type === 'hand' && s.val === val)) return;
        } else if (type === 'np') {
            if (UI.gameState.selectedCards.some(s => s.type === 'np' && s.val === val)) return;
        }

        UI.gameState.selectedCards.push({ type: type, val: val }); 
        
        UI.renderAllCards(); // 重繪所有卡片 (讓剛剛選的變暗)
        UI.updateSelectedSlots();
    },

    deselectCard: (slotIndex) => {
        if (slotIndex >= UI.gameState.selectedCards.length) return;
        UI.gameState.selectedCards.splice(slotIndex, 1);
        UI.renderAllCards(); // 重繪 (恢復變亮)
        UI.updateSelectedSlots();
    },

    updateSelectedSlots: () => {
        const slots = [0, 1, 2];
        const selected = UI.gameState.selectedCards;
        const hand = UI.gameState.currentHand;
        const party = UI.gameState.party;

        slots.forEach(i => {
            const el = document.getElementById(`slot-${i}`);
            el.innerHTML = ''; 
            el.className = 'card-slot'; 
            el.onclick = () => UI.deselectCard(i); // 點擊插槽可以取消

            if (i < selected.length) {
                const item = selected[i];
                el.classList.add('filled');
                
                let imgSrc = '';
                let badgeSrc = '';

                if (item.type === 'hand') {
                    const card = hand[item.val];
                    imgSrc = UI.cardImages[card.type];
                    badgeSrc = UI.getServantIcon(card.ownerId);
                } else if (item.type === 'np') {
                    const servant = party[item.val]; 
                    imgSrc = UI.cardImages['NP'];
                    badgeSrc = UI.getServantIcon(servant.id);
                }

                const cardImg = document.createElement('img');
                cardImg.src = imgSrc;
                cardImg.className = 'slot-card-img';
                el.appendChild(cardImg);

                const badge = document.createElement('img');
                badge.src = badgeSrc;
                badge.className = 'slot-badge';
                el.appendChild(badge);

            } else {
                el.innerText = `${i + 1}nd`;
            }
        });
        document.getElementById('btn-execute').disabled = (selected.length !== 3);
    },

    // --- 技能相關 ---

    renderSkills: (servantIndex) => {
        const servant = UI.gameState.party[servantIndex];
        const cardEl = document.getElementById(`card-p${servantIndex+1}`);
        const skillContainer = cardEl.querySelector('.skill-row');
        if (!skillContainer) return;
        skillContainer.innerHTML = ''; 

        // 技能按鈕
        if (!servant.skills) return;

        servant.skills.forEach((skill, skillIdx) => {
            const btn = document.createElement('div');
            btn.className = 'skill-btn';
            
            if (skill.icon) {
                const iconPath = UI.getSkillIcon(skill.icon);
                btn.style.backgroundImage = `url('${iconPath}')`;
                btn.style.backgroundSize = 'cover';
                btn.style.backgroundPosition = 'center';
            }

            if (skill.currentCooldown > 0) {
                btn.style.backgroundColor = 'rgba(0,0,0,0.7)'; 
                btn.style.cursor = 'not-allowed';
                btn.innerHTML = `<div class="skill-cooldown">${skill.currentCooldown}</div>`;
                if (skill.icon) btn.style.filter = 'grayscale(100%) brightness(50%)'; 
            } else {
                if (!skill.icon) btn.style.backgroundColor = '#4db6ac'; 
                btn.style.cursor = 'pointer';
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    UI.castSkill(servantIndex, skillIdx);
                };
                btn.title = `${skill.name}\n${skill.description}`;
            }

            skillContainer.appendChild(btn);
        });
    },

    castSkill: async (servantIdx, skillIdx) => {
        const user = UI.gameState.party[servantIdx];
        const skill = user.skills[skillIdx];
        if (skill.currentCooldown > 0) return;

        let targets = [];
        const needsAllySelection = skill.effects.some(e => e.target === 'one');
        const needsEnemySelection = skill.effects.some(e => e.target === 'enemy'); 

        if (needsAllySelection) {
            UI.log(`請選擇 [${skill.name}] 的對象...`);
            const selected = await UI.selectTarget('ally');
            if (!selected) return;
            targets = [selected];
        } 
        else if (needsEnemySelection) {
             const selected = await UI.selectTarget('enemy');
             if (!selected) return;
             targets = [selected];
        }
        else {
            targets = UI.gameState.party;
        }

        UI.log(`>> [Skill] ${user.name} 發動了 "${skill.name}"`);

        const mainTarget = targets.length === 1 ? targets[0] : user;
        
        skill.effects.forEach(effect => {
            let effectTargets = [];
            if (effect.target === 'one') effectTargets = [mainTarget];
            else if (effect.target === 'self') effectTargets = [user];
            else if (effect.target === 'party') effectTargets = UI.gameState.party;
            else if (effect.target === 'enemy' || effect.target === 'enemy_all') effectTargets = [UI.gameState.enemy];

            effectTargets.forEach(t => {
                const dummySkill = { ...skill, effects: [effect] };
                Engine.useSkill(user, t, dummySkill);
            });
        });

        skill.currentCooldown = skill.cd;
        UI.updateDisplay();
    },

    selectTarget: (scope) => {
        return new Promise((resolve, reject) => {
            const body = document.body;
            const cancelBtn = document.getElementById('target-cancel-btn');
            
            body.classList.add('selecting-target');
            let clickables = [];
            
            if (scope === 'ally' || scope === 'one') {
                document.querySelector('.area-party').classList.add('active-target-zone');
                UI.gameState.party.forEach((p, idx) => {
                    const el = document.getElementById(`card-p${idx+1}`);
                    if (el) {
                        el._targetHandler = (e) => {
                            e.stopPropagation();
                            cleanup();
                            resolve(p); 
                        };
                        el.addEventListener('click', el._targetHandler);
                        clickables.push(el);
                    }
                });
            } else if (scope === 'enemy') {
                document.querySelector('.area-enemy').classList.add('active-target-zone');
                const el = document.getElementById('enemy-card');
                el._targetHandler = (e) => {
                    e.stopPropagation();
                    cleanup();
                    resolve(UI.gameState.enemy);
                };
                el.addEventListener('click', el._targetHandler);
                clickables.push(el);
            }

            const cleanup = () => {
                body.classList.remove('selecting-target');
                document.querySelectorAll('.active-target-zone').forEach(el => el.classList.remove('active-target-zone'));
                
                clickables.forEach(el => {
                    if (el._targetHandler) {
                        el.removeEventListener('click', el._targetHandler);
                        delete el._targetHandler;
                    }
                });
                cancelBtn.onclick = null;
            };

            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(null); 
            };
        });
    },

    // -------------------

    openCommandPhase: () => {
        if (!UI.gameState.enemy) return;
        document.getElementById('command-overlay').classList.add('active');
        // 每次打開選卡介面時，重新渲染寶具卡和手牌
        UI.renderAllCards();
    },

    closeCommandPhase: () => {
        document.getElementById('command-overlay').classList.remove('active');
    },

    // 【關鍵修復】執行回合：確保寶具卡資料正確
    executeTurn: () => {
        const hand = UI.gameState.currentHand;
        const selectedItems = UI.gameState.selectedCards; 
        const e = UI.gameState.enemy;

        if (selectedItems.length !== 3) return;

        // 轉換 Chain 格式
        const cardChain = selectedItems.map(item => {
            if (item.type === 'hand') {
                const card = hand[item.val]; // item.val 是 index
                return {
                    type: card.type,
                    attacker: UI.gameState.party[card.ownerIndex],
                    critChance: card.critChance || 0,
                    isNP: false
                };
            } else if (item.type === 'np') {
                const servant = UI.gameState.party[item.val]; // item.val 是 servantIndex
                const npData = servant.noble_phantasm;
                return {
                    type: npData.card, // Buster/Arts/Quick
                    attacker: servant,
                    critChance: 0,
                    isNP: true,
                    npData: npData
                };
            }
        });

        UI.closeCommandPhase();

        // 執行我方攻擊
        const results = Engine.calculateTurn(null, e, cardChain, false); 

        UI.log("=== Turn Start ===");
        if (results.chainBonus.busterChain) UI.log("【Buster Chain】Atk Up!");
        if (results.chainBonus.artsChain) { 
            UI.log("【Arts Chain】Party NP +20%"); 
            UI.gameState.party.forEach(p => {
                p.currentNp += 20;
                if(p.currentNp > 300) p.currentNp = 300;
            });
        }
        if (results.chainBonus.quickChain) { UI.log("【Quick Chain】Stars +10"); UI.gameState.stars += 10; }

        results.attacks.forEach((atk, i) => {
            const cardObj = cardChain[i < 3 ? i : 0]; 
            const prefix = (i < 3) ? (cardObj.isNP ? `[NP] ${cardObj.attacker.name}` : `Card ${i+1}`) : `Extra`;
            
            // 執行寶具效果 (扣NP)
            if (i < 3 && cardObj.isNP) {
                UI.log(`>> ${cardObj.attacker.name} 釋放了寶具: ${cardObj.npData.name}`);
                cardObj.attacker.currentNp -= 100; // 暫時固定扣100 (不支援OC 200/300的選擇)
                if (cardObj.attacker.currentNp < 0) cardObj.attacker.currentNp = 0;
            }

            const critText = atk.isCrit ? ' <span style="color:gold;font-weight:bold;">(CRIT!)</span>' : '';
            UI.log(`${prefix}: 傷 <span class="dmg-text">${atk.damage}</span>${critText} | NP +${atk.np}% | 星 +${atk.stars}`);
            
            e.currentHp -= atk.damage;
            cardObj.attacker.currentNp += atk.np;
            UI.gameState.stars += atk.stars;
        });

        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> Enemy Defeated!");
        }
        UI.gameState.party.forEach(p => { if(p.currentNp > 300) p.currentNp = 300; });

        // 回合結束 Buff 處理
        UI.gameState.party.forEach(p => Engine.processTurnEnd(p));
        UI.gameState.party.forEach(p => {
            if(p.skills) {
                p.skills.forEach(s => {
                    if(s.currentCooldown > 0) s.currentCooldown--;
                });
            }
        });

        UI.updateDisplay();
        
        // 敵人回合
        if (e.currentHp > 0) {
            setTimeout(() => {
                UI.enemyTurn();
            }, 1000);
        }
    },

    enemyTurn: () => {
        UI.log("=== Enemy Phase ===");
        const e = UI.gameState.enemy;
        
        if (e.currentGauge < e.maxGauge) {
            e.currentGauge++;
            UI.log(`敵人氣槽增加 (${e.currentGauge}/${e.maxGauge})`);
        }

        let isNP = false;
        if (e.currentGauge >= e.maxGauge) {
            isNP = true;
            e.currentGauge = 0;
        }

        if (isNP) {
            UI.log(`<span style="color:red;font-weight:bold;">>> 敵人發動寶具 (AOE)!</span>`);
            const dmg = 3000; 
            UI.gameState.party.forEach(p => {
                const hasInvincible = p.buffs && p.buffs.some(b => b.type === 'invincible' || b.type === 'anti_purge_defense');
                if (hasInvincible) {
                    UI.log(`${p.name} 擋下了攻擊! (0)`);
                } else {
                    p.currentHp -= dmg;
                    UI.log(`${p.name} 受到 ${dmg} 傷害`);
                }
                p.currentNp += 10;
            });
        } else {
            const targetIdx = Math.floor(Math.random() * UI.gameState.party.length);
            const target = UI.gameState.party[targetIdx];
            const dmg = 1500;
            UI.log(`敵人攻擊了 ${target.name}`);
            
            const hasInvincible = target.buffs && target.buffs.some(b => b.type === 'invincible' || b.type === 'anti_purge_defense');
            if (hasInvincible) {
                 UI.log(`傷害 0 (無敵)`);
            } else {
                target.currentHp -= dmg;
                UI.log(`傷害 ${dmg}`);
            }
            target.currentNp += 10;
        }

        UI.gameState.party.forEach(p => {
            if (p.currentHp <= 0) {
                p.currentHp = 0;
                UI.log(`${p.name} 退場!`);
            }
            if (p.currentNp > 300) p.currentNp = 300;
        });

        UI.updateDisplay();

        setTimeout(() => {
            UI.dealCards();
        }, 1000);
    },

    updateDisplay: () => {
        const e = UI.gameState.enemy;
        if (!e) return;

        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;

        UI.gameState.party.forEach((p, i) => {
            const slot = i + 1; 
            document.getElementById(`img-p${slot}`).src = UI.getServantIcon(p.id);
            document.getElementById(`val-hp-p${slot}`).innerText = Math.floor(p.currentHp);
            document.getElementById(`hp-p${slot}`).style.width = `${Math.max(0, (p.currentHp / p.maxHp) * 100)}%`;
            
            document.getElementById(`val-np-p${slot}`).innerText = Math.floor(p.currentNp);
            document.getElementById(`np-p${slot}`).style.width = `${Math.min(100, p.currentNp)}%`;

            UI.renderSkills(i);

            const cardEl = document.getElementById(`card-p${slot}`);
            cardEl.onclick = () => UI.openBuffModal(i);
            cardEl.style.cursor = "pointer";
        });

        document.getElementById('star-count').innerText = Math.floor(UI.gameState.stars);
    },

    log: (msg) => {
        const box = document.getElementById('battle-log');
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = msg;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    },

    openBuffModal: (servantIndex) => {
        if (document.body.classList.contains('selecting-target')) return;
        
        const servant = UI.gameState.party[servantIndex];
        if (!servant) return;

        document.getElementById('modal-avatar').src = UI.getServantIcon(servant.id);
        document.getElementById('modal-name').innerText = servant.name;
        
        const list = document.getElementById('modal-buff-list');
        list.innerHTML = '';

        if (!servant.buffs || servant.buffs.length === 0) {
            list.innerHTML = '<div style="color:#777;text-align:center;">無任何狀態</div>';
        } else {
            servant.buffs.forEach(buff => {
                const div = document.createElement('div');
                div.className = `buff-item ${buff.isDebuff ? 'debuff' : ''}`;
                
                let text = `${buff.name}`;
                if (buff.val > 0 && buff.val < 5) text += ` [${Math.floor(buff.val * 100)}%]`; 
                else if (buff.val >= 5) text += ` [${buff.val}]`;
                
                let durText = [];
                if (buff.turn > 0 && buff.turn < 900) durText.push(`${buff.turn}T`);
                if (buff.count > 0) durText.push(`${buff.count}次`);
                
                if (durText.length > 0) text += ` (${durText.join('/')})`;
                else if (buff.turn >= 900) text += ` (永久)`;

                div.innerText = text;
                list.appendChild(div);
            });
        }

        document.getElementById('buff-modal-overlay').classList.add('active');
    },

    closeBuffModal: (e) => {
        document.getElementById('buff-modal-overlay').classList.remove('active');
    }
};
