const UI = {
    gameState: {
        party: [], 
        enemies: [],      // 場上活躍的敵人 (最多3)
        reserveEnemies: [], // 【新增】後備敵人
        quest: null,
        currentWave: 0,
        targetIndex: 0,
        deck: [],        
        currentHand: [], 
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
        
        UI.gameState.quest = quest;
        UI.gameState.currentWave = 0;
        UI.gameState.stars = 0;
        UI.gameState.turnCount = 0;
        
        UI.loadWave(0);
        
        UI.createFullDeck();

        UI.log(`--- 戰鬥開始: ${quest.name} ---`);
        UI.updateDisplay();
        
        document.getElementById('command-overlay').classList.remove('active');
        UI.dealCards(); 
    },

    // --- 載入波次 (支援補位) ---
    loadWave: (waveIndex) => {
        const quest = UI.gameState.quest;
        if (!quest || !quest.waves[waveIndex]) return;

        const wave = quest.waves[waveIndex];
        const label = wave.battleLabel || `BATTLE ${waveIndex + 1}/${quest.waves.length}`;
        UI.log(`\n=== ${label} ===`);

        // 讀取所有敵人
        const allEnemies = wave.enemies.map((enemyDataRaw, index) => {
            let eBase = DB.ENEMIES.find(e => e.id === enemyDataRaw.id) || DB.ENEMIES[0];
            return {
                ...eBase,
                uniqueId: `wave${waveIndex}_enemy${index}`,
                name: enemyDataRaw.name || eBase.name, 
                hp: enemyDataRaw.hp || eBase.hp,
                currentHp: enemyDataRaw.hp || eBase.hp,
                maxHp: enemyDataRaw.hp || eBase.hp,
                currentGauge: 0,
                maxGauge: enemyDataRaw.gauge || eBase.gauge || 3,
                buffs: []
            };
        });

        // 【修改】切分戰場與後備 (前3隻上場，剩下進後備)
        UI.gameState.enemies = allEnemies.slice(0, 3);
        UI.gameState.reserveEnemies = allEnemies.slice(3);

        UI.gameState.targetIndex = 0;
        UI.updateDisplay();
    },

    // --- 補位邏輯 ---
    refillEnemies: () => {
        // 遍歷當前場上的每一個位置 (slot)
        for (let i = 0; i < UI.gameState.enemies.length; i++) {
            const enemy = UI.gameState.enemies[i];
            
            // 如果該位置的敵人死了 (HP <= 0)
            if (enemy.currentHp <= 0) {
                // 檢查有無後備敵人
                if (UI.gameState.reserveEnemies.length > 0) {
                    // 有後備：取出並「原地替換」到位置 i
                    const nextEnemy = UI.gameState.reserveEnemies.shift();
                    UI.gameState.enemies[i] = nextEnemy; // <--- 關鍵修改
                    
                    UI.log(`>> 增援出現: ${nextEnemy.name} (位置 ${i + 1})`);
                    
                    // 如果剛好鎖定的是這個位置，保持鎖定 (因為新怪出來了)
                    // 如果鎖定的是別人，也不受影響
                } else {
                    // 沒後備了：保留屍體佔位，或者什麼都不做
                    // 這樣 [Dead, B, C] 就不會變成 [B, C] 導致位移
                }
            }
        }
        
        // 修正目標鎖定：如果當前鎖定的目標是死人(且沒補位)，自動切換到活人
        const currentTarget = UI.gameState.enemies[UI.gameState.targetIndex];
        if (!currentTarget || currentTarget.currentHp <= 0) {
            const nextAliveIdx = UI.gameState.enemies.findIndex(e => e.currentHp > 0);
            if (nextAliveIdx !== -1) {
                UI.gameState.targetIndex = nextAliveIdx;
            }
        }
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
        // 確保至少有一隻怪活著 (或者有後備)
        if (UI.gameState.enemies.length === 0 && UI.gameState.reserveEnemies.length === 0) return;

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
        UI.renderAllCards();
        UI.updateSelectedSlots();
    },

    renderAllCards: () => {
        UI.renderNPCards();
        UI.renderHand();
    },

    renderNPCards: () => {
        const container = document.getElementById('np-container');
        if (!container) return;
        container.innerHTML = '';

        UI.gameState.party.forEach((servant, sIdx) => {
            if (servant.currentNp < 100) return;

            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container np-card';
            
            const isSelected = UI.gameState.selectedCards.some(s => s.type === 'np' && s.val === sIdx);
            if (isSelected) cardDiv.classList.add('used');
            
            cardDiv.onclick = () => UI.selectCard('np', sIdx);

            const img = document.createElement('img');
            img.src = UI.cardImages['NP'];
            img.className = 'command-card-img';

            const badge = document.createElement('img');
            badge.className = 'owner-badge';
            badge.src = UI.getServantIcon(servant.id);

            cardDiv.appendChild(img);
            cardDiv.appendChild(badge);
            container.appendChild(cardDiv);
        });
    },

    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            
            const isSelected = UI.gameState.selectedCards.some(s => s.type === 'hand' && s.val === index);
            if (isSelected) cardDiv.classList.add('used');
            
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

    selectCard: (type, val) => {
        if (UI.gameState.selectedCards.length >= 3) return;
        
        if (type === 'hand') {
            if (UI.gameState.selectedCards.some(s => s.type === 'hand' && s.val === val)) return;
        } else if (type === 'np') {
            if (UI.gameState.selectedCards.some(s => s.type === 'np' && s.val === val)) return;
        }

        UI.gameState.selectedCards.push({ type: type, val: val }); 
        
        UI.renderAllCards();
        UI.updateSelectedSlots();
    },

    deselectCard: (slotIndex) => {
        if (slotIndex >= UI.gameState.selectedCards.length) return;
        UI.gameState.selectedCards.splice(slotIndex, 1);
        UI.renderAllCards();
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
            el.onclick = () => UI.deselectCard(i);

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
                    
                    const npText = document.createElement('div');
                    npText.innerText = "NOBLE PHANTASM";
                    npText.style.position = 'absolute';
                    npText.style.top = '50%';
                    npText.style.left = '50%';
                    npText.style.transform = 'translate(-50%, -50%)';
                    npText.style.color = '#fff';
                    npText.style.fontWeight = 'bold';
                    npText.style.textShadow = '0 0 5px #f00';
                    npText.style.textAlign = 'center';
                    npText.style.fontSize = '10px';
                    npText.style.width = '100%';
                    el.appendChild(npText);
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

    renderSkills: (servantIndex) => {
        const servant = UI.gameState.party[servantIndex];
        const cardEl = document.getElementById(`card-p${servantIndex+1}`);
        const skillContainer = cardEl.querySelector('.skill-row');
        if (!skillContainer) return;
        skillContainer.innerHTML = ''; 

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
            else if (effect.target === 'enemy' || effect.target === 'enemy_all') {
                if (effect.target === 'enemy_all') {
                    effectTargets = UI.gameState.enemies.filter(e => e.currentHp > 0);
                } else {
                    if (targets.length > 0 && targets[0].uniqueId) {
                        effectTargets = targets;
                    } else {
                        effectTargets = [UI.gameState.enemies[UI.gameState.targetIndex]];
                    }
                }
            }

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
                const enemyUnits = document.querySelectorAll('.enemy-unit');
                enemyUnits.forEach(el => {
                    if (el.classList.contains('dead')) return;
                    el.parentElement.classList.add('active-target-zone'); 
                    
                    el._targetHandler = (e) => {
                        e.stopPropagation();
                        cleanup();
                        const enemyId = el.getAttribute('data-id');
                        const enemy = UI.gameState.enemies.find(e => e.uniqueId === enemyId);
                        resolve(enemy);
                    };
                    el.addEventListener('click', el._targetHandler);
                    clickables.push(el);
                });
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

    openCommandPhase: () => {
        if (!UI.gameState.enemies.some(e => e.currentHp > 0)) return;
        document.getElementById('command-overlay').classList.add('active');
        UI.renderAllCards();
    },

    closeCommandPhase: () => {
        document.getElementById('command-overlay').classList.remove('active');
    },

    executeTurn: () => {
        const hand = UI.gameState.currentHand;
        const selectedItems = UI.gameState.selectedCards; 
        
        if (selectedItems.length !== 3) return;

        const cardChain = selectedItems.map(item => {
            if (item.type === 'hand') {
                const card = hand[item.val];
                return {
                    type: card.type,
                    attacker: UI.gameState.party[card.ownerIndex],
                    critChance: card.critChance || 0,
                    isNP: false
                };
            } else if (item.type === 'np') {
                const servant = UI.gameState.party[item.val];
                const npData = servant.noble_phantasm;
                return {
                    type: npData.card,
                    attacker: servant,
                    critChance: 0,
                    isNP: true,
                    npData: npData
                };
            }
        });

        UI.closeCommandPhase();

        let target = UI.gameState.enemies[UI.gameState.targetIndex];
        if (!target || target.currentHp <= 0) {
            target = UI.gameState.enemies.find(e => e.currentHp > 0);
        }
        
        const chainResults = Engine.calculateTurn(null, target, cardChain, false); 
        const bonuses = chainResults.chainBonus;

        UI.log("=== Turn Start ===");
        if (bonuses.busterChain) UI.log("【Buster Chain】Atk Up!");
        if (bonuses.artsChain) { 
            UI.log("【Arts Chain】Party NP +20%"); 
            UI.gameState.party.forEach(p => {
                p.currentNp += 20;
                if(p.currentNp > 300) p.currentNp = 300;
            });
        }
        if (bonuses.quickChain) { UI.log("【Quick Chain】Stars +10"); UI.gameState.stars += 10; }

        const allAttacks = [];
        cardChain.forEach((cardObj, i) => {
            allAttacks.push({ ...cardObj, index: i, isExtra: false });
        });
        if (bonuses.braveChain) {
            const extraAttacker = cardChain[0].attacker;
            allAttacks.push({
                type: 'Extra',
                attacker: extraAttacker,
                critChance: 0,
                isNP: false,
                isExtra: true
            });
        }

        allAttacks.forEach(atk => {
            let currentTarget = UI.gameState.enemies[UI.gameState.targetIndex];
            if (!currentTarget || currentTarget.currentHp <= 0) {
                const nextTargetIdx = UI.gameState.enemies.findIndex(e => e.currentHp > 0);
                if (nextTargetIdx === -1) return; 
                UI.gameState.targetIndex = nextTargetIdx;
                currentTarget = UI.gameState.enemies[nextTargetIdx];
            }

            if (atk.isNP) {
                UI.log(`>> ${atk.attacker.name} 釋放了寶具: ${atk.npData.name}`);
                atk.attacker.currentNp -= 100; 
                if (atk.attacker.currentNp < 0) atk.attacker.currentNp = 0;

                const npType = atk.npData.type || 'single';

                if (npType === 'support') {
                    UI.log(`<span style="color:#4db6ac;">(輔助效果發動)</span>`);
                    if (atk.npData.effects) {
                        atk.npData.effects.forEach(effect => {
                            let effectTargets = [];
                            if (effect.target === 'party') effectTargets = UI.gameState.party;
                            else if (effect.target === 'self') effectTargets = [atk.attacker];
                            else if (effect.target === 'one') effectTargets = [atk.attacker]; 
                            else if (effect.target === 'enemy_all') effectTargets = UI.gameState.enemies.filter(e => e.currentHp > 0);

                            effectTargets.forEach(t => {
                                const dummySkill = { effects: [effect] };
                                Engine.useSkill(atk.attacker, t, dummySkill);
                            });
                        });
                    }
                    return; 
                } 
                
                let hitTargets = [];
                if (npType === 'aoe') {
                    hitTargets = UI.gameState.enemies.filter(e => e.currentHp > 0);
                } else {
                    hitTargets = [currentTarget];
                }

                hitTargets.forEach(t => {
                    const dmg = Engine.calculateDamage(atk.attacker, t, atk.type, 0, false, bonuses.busterChain);
                    const np = Engine.calculateNPGain(atk.attacker, t, atk.type, 0, dmg, false);
                    const star = Engine.calculateStarGen(atk.attacker, t, atk.type, 0, false);
                    
                    t.currentHp -= dmg;
                    atk.attacker.currentNp += np;
                    UI.gameState.stars += star;
                    
                    UI.log(`對 ${t.name}: 傷 ${dmg} | NP+${np}%`);

                    if (atk.npData.effects) {
                        atk.npData.effects.forEach(effect => {
                            if (effect.type !== 'damage') {
                                const dummySkill = { effects: [effect] };
                                Engine.useSkill(atk.attacker, t, dummySkill);
                            }
                        });
                    }
                });

            } else {
                const isCrit = (atk.critChance || 0) > Math.random() * 100;
                const cardIdx = atk.isExtra ? 3 : atk.index; 
                
                const dmg = Engine.calculateDamage(atk.attacker, currentTarget, atk.type, cardIdx, isCrit, bonuses.busterChain);
                const np = Engine.calculateNPGain(atk.attacker, currentTarget, atk.type, cardIdx, dmg, isCrit);
                const star = Engine.calculateStarGen(atk.attacker, currentTarget, atk.type, cardIdx, isCrit);

                currentTarget.currentHp -= dmg;
                atk.attacker.currentNp += np;
                UI.gameState.stars += star;

                const prefix = atk.isExtra ? 'Extra' : `Card ${atk.index+1}`;
                const critText = isCrit ? ' (CRIT!)' : '';
                UI.log(`${prefix} > ${currentTarget.name}: 傷 ${dmg}${critText} | NP+${np}% | 星+${star}`);
            }
        });

        // 執行補位檢查
        UI.refillEnemies();
        UI.updateDisplay();

        // 檢查波次結束
        // 判斷條件：場上沒活人 AND 後備也沒人
        const anyAlive = UI.gameState.enemies.some(e => e.currentHp > 0);
        const noReserves = UI.gameState.reserveEnemies.length === 0;

        if (!anyAlive && noReserves) {
            
            // 讓所有敵人血條歸零
            UI.gameState.enemies.forEach(e => e.currentHp = 0);
            UI.updateDisplay();

            const totalWaves = UI.gameState.quest.waves.length;
            const nextWaveIdx = UI.gameState.currentWave + 1;

            if (nextWaveIdx < totalWaves) {
                // UI.log(">> Wave Cleared! 前往下一波...");
                
                setTimeout(() => {
                    UI.gameState.currentWave = nextWaveIdx;
                    UI.loadWave(nextWaveIdx); 
                    
                    UI.gameState.party.forEach(p => Engine.processTurnEnd(p));
                    UI.gameState.party.forEach(p => {
                        if(p.skills) p.skills.forEach(s => { if(s.currentCooldown > 0) s.currentCooldown--; });
                    });

                    UI.dealCards(); 
                }, 1500);

            } else {
                UI.log("<h2 style='color:gold'> BATTLE FINISH </h2>");
                // 可以加一行顯示 Victory
                // if(document.getElementById('e-name')) document.getElementById('e-name').innerText = "VICTORY";
            }
            return; 
        }

        UI.gameState.party.forEach(p => { if(p.currentNp > 300) p.currentNp = 300; });

        UI.gameState.party.forEach(p => Engine.processTurnEnd(p));
        UI.gameState.party.forEach(p => {
            if(p.skills) p.skills.forEach(s => { if(s.currentCooldown > 0) s.currentCooldown--; });
        });

        UI.updateDisplay();
        
        setTimeout(() => {
            UI.enemyTurn();
        }, 1000);
    },

    enemyTurn: () => {
        UI.log("=== Enemy Phase ===");
        
        UI.gameState.enemies.forEach(e => {
            if (e.currentHp <= 0) return;

            if (e.currentGauge < e.maxGauge) {
                e.currentGauge++;
            }

            let isNP = false;
            if (e.currentGauge >= e.maxGauge) {
                isNP = true;
                e.currentGauge = 0;
            }

            if (isNP) {
                UI.log(`[${e.name}] <span style="color:red;">發動強力攻擊/寶具!</span>`);
                const dmg = 3000;
                UI.gameState.party.forEach(p => {
                    const hasInvincible = p.buffs && p.buffs.some(b => b.type === 'invincible' || b.type === 'anti_purge_defense');
                    if (hasInvincible) {
                        UI.log(`  ${p.name} 無傷 (無敵)`);
                    } else {
                        p.currentHp -= dmg;
                        UI.log(`  ${p.name} 受到 ${dmg}`);
                    }
                    p.currentNp += 10; 
                });
            } else {
                const targetIdx = Math.floor(Math.random() * UI.gameState.party.length);
                const target = UI.gameState.party[targetIdx];
                const dmg = 1500;
                
                UI.log(`[${e.name}] 攻擊 ${target.name}`);
                const hasInvincible = target.buffs && target.buffs.some(b => b.type === 'invincible' || b.type === 'anti_purge_defense');
                if (hasInvincible) {
                    UI.log(`  無傷 (無敵)`);
                } else {
                    target.currentHp -= dmg;
                    UI.log(`  傷害 ${dmg}`);
                }
                target.currentNp += 10;
            }
        });

        UI.updateDisplay();

        setTimeout(() => {
            UI.dealCards();
        }, 1000);
    },

    updateDisplay: () => {
        // 【修改】只更新敵人卡片，不更新大血條 (e-name 不存在了)
        const enemyContainer = document.getElementById('enemy-container');
        enemyContainer.innerHTML = ''; 

        UI.gameState.enemies.forEach((e, idx) => {
            const eDiv = document.createElement('div');
            eDiv.className = 'enemy-unit';
            eDiv.setAttribute('data-id', e.uniqueId); 
            
            if (e.currentHp <= 0) eDiv.classList.add('dead');
            if (idx === UI.gameState.targetIndex && e.currentHp > 0) eDiv.classList.add('targeted');

            eDiv.onclick = () => {
                if (e.currentHp > 0) {
                    UI.gameState.targetIndex = idx;
                    UI.updateDisplay(); 
                }
            };

            const hpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
            
            let gaugeHtml = '';
            for(let g=0; g<e.maxGauge; g++) {
                const filled = g < e.currentGauge ? 'filled' : '';
                gaugeHtml += `<div class="gauge-pip ${filled}"></div>`;
            }

            eDiv.innerHTML = `
                <div class="e-info-row">
                    <span>${e.name}</span>
                    <span>${Math.floor(e.currentHp)}</span>
                </div>
                <div class="e-hp-box">
                    <div class="e-hp-bar" style="width: ${hpPct}%"></div>
                </div>
                <div class="e-gauge-box">
                    ${gaugeHtml}
                </div>
            `;
            enemyContainer.appendChild(eDiv);
        });

        // --- 我方渲染 ---
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
