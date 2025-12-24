const UI = {
    gameState: {
        party: [], 
        enemy: null,
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

    // 技能圖示 helper (暫時用文字或預設圖)
    getSkillIcon: (iconName) => {
        // 如果你有 skill icons，可以 return `data/skill_icons/${iconName}`;
        // 這裡先回傳通用圖或 null，靠 CSS 處理
        return null; 
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

        // 讀取存檔
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

        // 【修正】改用 Engine.initServant 初始化 (包含被動技計算)
        UI.gameState.party = partyIndices.map(p => {
            const data = DB.SERVANTS[p.idx];
            const servant = Engine.initServant(data, p.lv);
            
            // 初始化技能 CD (currentCooldown = 0 代表可用)
            if (servant.skills) {
                servant.skills.forEach(s => s.currentCooldown = 0);
            }
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
            buffs: [] // 敵人也要有 buff 欄位
        };
        
        UI.gameState.enemy = eData;
        UI.gameState.stars = 0;
        UI.gameState.turnCount = 0;
        
        UI.createFullDeck();

        UI.log(`--- 戰鬥開始: ${quest.name} ---`);
        UI.updateDisplay(); // 這會呼叫 renderSkills
        
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
                // 這裡我們把從者物件本身掛上去，方便 Engine 讀取數據
                fullDeck.push({ 
                    type: cardType, 
                    ownerIndex: sIndex, 
                    ownerId: servant.id,
                    owner: servant // 直接引用物件
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
        UI.log(`[Turn ${UI.gameState.turnCount}] 發牌...`);

        UI.gameState.currentHand = UI.gameState.deck.splice(0, 5);
        
        // 【新增】分配暴擊星
        if (UI.gameState.stars > 0) {
            UI.log(`分配 ${UI.gameState.stars} 顆暴擊星...`);
            const remain = Engine.distributeStars(UI.gameState.currentHand, UI.gameState.stars);
            // 用剩的星星歸零 (或是保留，看規則，通常回合開始歸零)
            // FGO 是回合結束時產星 -> 下回合開始時分配 -> 分配完清空
            UI.gameState.stars = remain; 
        }

        UI.gameState.selectedCards = [];
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            if (UI.gameState.selectedCards.includes(index)) cardDiv.classList.add('used');
            cardDiv.onclick = () => UI.selectCard(index);

            const img = document.createElement('img');
            img.src = UI.cardImages[card.type] || UI.cardImages['Buster'];
            img.className = 'command-card-img';

            // 顯示暴擊率
            if (card.critChance > 0) {
                const critBadge = document.createElement('div');
                critBadge.style.position = 'absolute';
                critBadge.style.top = '2px';
                critBadge.style.right = '2px';
                critBadge.style.color = '#ffd700';
                critBadge.style.fontWeight = 'bold';
                critBadge.style.textShadow = '1px 1px 2px #000';
                critBadge.style.zIndex = '15';
                critBadge.innerText = `${card.critChance}%`;
                cardDiv.appendChild(critBadge);
            }

            const badge = document.createElement('img');
            badge.className = 'owner-badge';
            badge.src = UI.getServantIcon(card.ownerId);
            badge.onerror = () => { badge.src = 'https://placehold.co/40x40?text=?'; };

            cardDiv.appendChild(img);
            cardDiv.appendChild(badge);
            container.appendChild(cardDiv);
        });
    },

    selectCard: (index) => {
        if (UI.gameState.selectedCards.length >= 3) return;
        UI.gameState.selectedCards.push(index);
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    deselectCard: (slotIndex) => {
        if (slotIndex >= UI.gameState.selectedCards.length) return;
        UI.gameState.selectedCards.splice(slotIndex, 1);
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    updateSelectedSlots: () => {
        const slots = [0, 1, 2];
        const selected = UI.gameState.selectedCards;
        const hand = UI.gameState.currentHand;

        slots.forEach(i => {
            const el = document.getElementById(`slot-${i}`);
            el.innerHTML = ''; 
            el.className = 'card-slot'; 

            if (i < selected.length) {
                const cardIndex = selected[i];
                const card = hand[cardIndex];

                el.classList.add('filled');

                const cardImg = document.createElement('img');
                cardImg.src = UI.cardImages[card.type];
                cardImg.className = 'slot-card-img';
                el.appendChild(cardImg);

                const badge = document.createElement('img');
                badge.src = UI.getServantIcon(card.ownerId);
                badge.className = 'slot-badge';
                badge.onerror = () => { badge.src = 'https://placehold.co/40x40?text=?'; };
                el.appendChild(badge);

            } else {
                el.innerText = `${i + 1}nd`;
            }
        });
        document.getElementById('btn-execute').disabled = (selected.length !== 3);
    },

    // --- 技能系統 (新) ---

    // 渲染技能按鈕
    renderSkills: (servantIndex) => {
        const servant = UI.gameState.party[servantIndex];
        const cardEl = document.getElementById(`card-p${servantIndex+1}`);
        const skillContainer = cardEl.querySelector('.skill-row');
        
        if (!skillContainer) return;
        skillContainer.innerHTML = ''; // 清空

        if (!servant.skills) return;

        servant.skills.forEach((skill, skillIdx) => {
            const btn = document.createElement('div');
            btn.className = 'skill-btn';
            
            // 判斷 CD
            if (skill.currentCooldown > 0) {
                btn.style.backgroundColor = '#222';
                btn.style.cursor = 'not-allowed';
                btn.innerHTML = `<div class="skill-cooldown">${skill.currentCooldown}</div>`;
            } else {
                btn.style.backgroundColor = '#4db6ac'; // 可用顏色 (綠)
                btn.style.cursor = 'pointer';
                // 點擊事件
                btn.onclick = (e) => {
                    e.stopPropagation(); // 避免觸發開狀態視窗
                    UI.castSkill(servantIndex, skillIdx);
                };
                
                // Tooltip (簡單 title)
                btn.title = `${skill.name}\n${skill.description}`;
            }

            // 如果有 icon
            // if (skill.icon) btn.style.backgroundImage = ...

            skillContainer.appendChild(btn);
        });
    },

    // 施放技能
    castSkill: (servantIdx, skillIdx) => {
        const user = UI.gameState.party[servantIdx];
        const skill = user.skills[skillIdx];

        if (skill.currentCooldown > 0) return;

        // 1. 目標選擇 (簡易版：如果是單體效果，跳出 Prompt)
        let target = user; // 預設自己
        let targets = [user]; // 預設單體陣列

        // 檢查技能效果是否包含 'one' (單體)
        const isSingleTarget = skill.effects.some(e => e.target === 'one');
        
        if (isSingleTarget) {
            const input = prompt(`請選擇對象 (1-3):\n1. ${UI.gameState.party[0].name}\n2. ${UI.gameState.party[1].name}\n3. ${UI.gameState.party[2].name}`, "1");
            const targetIdx = parseInt(input) - 1;
            if (targetIdx >= 0 && targetIdx < 3) {
                target = UI.gameState.party[targetIdx];
                targets = [target];
            } else {
                return; // 取消
            }
        } else {
            // 如果是全體 (party)，則遍歷
            // 注意：Engine.useSkill 目前設計是一次處理一個 target
            // 所以我們要把 target 設為所有隊員
            targets = UI.gameState.party;
        }

        UI.log(`>> [Skill] ${user.name} 發動了 "${skill.name}"`);

        // 2. 執行效果
        targets.forEach(t => {
            const res = Engine.useSkill(user, t, skill);
            // 這裡可以顯示詳細 log (如: 增加 NP 20%)
        });

        // 3. 進入 CD
        skill.currentCooldown = skill.cd;

        // 4. 更新畫面
        UI.updateDisplay();
    },

    // -------------------

    openCommandPhase: () => {
        if (!UI.gameState.enemy) return;
        document.getElementById('command-overlay').classList.add('active');
    },

    closeCommandPhase: () => {
        document.getElementById('command-overlay').classList.remove('active');
    },

    executeTurn: () => {
        const hand = UI.gameState.currentHand;
        const selectedIndices = UI.gameState.selectedCards;
        const e = UI.gameState.enemy;

        if (selectedIndices.length !== 3) return;

        const cardChain = selectedIndices.map(idx => {
            const card = hand[idx];
            return {
                type: card.type,
                attacker: UI.gameState.party[card.ownerIndex],
                critChance: card.critChance || 0 // 傳入暴擊率
            };
        });

        UI.closeCommandPhase();

        // 呼叫 Engine 計算
        const results = Engine.calculateTurn(null, e, cardChain, false); // attacker 參數在 chain 裡

        // 顯示結果
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
            const prefix = (i < 3) ? `Card ${i+1}` : `Extra`;
            // 判斷是否暴擊
            const critText = atk.isCrit ? ' <span style="color:gold;font-weight:bold;">(CRIT!)</span>' : '';
            
            UI.log(`${prefix}: 傷 <span class="dmg-text">${atk.damage}</span>${critText} | NP +${atk.np}% | 星 +${atk.stars}`);
            
            e.currentHp -= atk.damage;
            // 幫攻擊者加 NP
            const attacker = cardChain[i < 3 ? i : 0].attacker;
            attacker.currentNp += atk.np;
            UI.gameState.stars += atk.stars;
        });

        // 結算
        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> Enemy Defeated!");
        }
        UI.gameState.party.forEach(p => { if(p.currentNp > 300) p.currentNp = 300; });

        // --- 回合結束處理 (Buff 扣除) ---
        UI.gameState.party.forEach(p => Engine.processTurnEnd(p));
        // 技能 CD -1
        UI.gameState.party.forEach(p => {
            if(p.skills) {
                p.skills.forEach(s => {
                    if(s.currentCooldown > 0) s.currentCooldown--;
                });
            }
        });

        UI.updateDisplay();
        
        if (e.currentHp > 0) {
            setTimeout(() => {
                UI.dealCards();
            }, 1000);
        }
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

            // 更新技能按鈕狀態
            UI.renderSkills(i);

            // 點擊卡片開啟詳情
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
                if (buff.val > 0 && buff.val < 5) text += ` [${Math.floor(buff.val * 100)}%]`; // 百分比
                else if (buff.val >= 5) text += ` [${buff.val}]`; // 固定數值(如加血)
                
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
