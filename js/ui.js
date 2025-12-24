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

    selectTarget: (scope) => {
        return new Promise((resolve, reject) => {
            const body = document.body;
            const cancelBtn = document.getElementById('target-cancel-btn');
            
            // 1. 進入選擇模式
            body.classList.add('selecting-target');
            
            // 2. 定義哪些東西可以點
            let clickables = [];
            
            if (scope === 'ally' || scope === 'one') {
                // 高亮我方從者
                document.querySelector('.area-party').classList.add('active-target-zone');
                // 綁定點擊事件
                UI.gameState.party.forEach((p, idx) => {
                    const el = document.getElementById(`card-p${idx+1}`);
                    if (el) {
                        el._targetHandler = (e) => {
                            e.stopPropagation();
                            cleanup();
                            resolve(p); // 回傳被選中的從者物件
                        };
                        el.addEventListener('click', el._targetHandler);
                        clickables.push(el);
                    }
                });
            } else if (scope === 'enemy') {
                // 高亮敵人 (目前只有一個)
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

            // 3. 清理函式 (移除事件與樣式)
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

            // 4. 取消按鈕邏輯
            cancelBtn.onclick = (e) => {
                e.stopPropagation();
                cleanup();
                resolve(null); // 回傳 null 代表取消
            };
        });
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
        skillContainer.innerHTML = ''; // 清空舊按鈕

        if (!servant.skills) return;

        servant.skills.forEach((skill, skillIdx) => {
            const btn = document.createElement('div');
            btn.className = 'skill-btn';
            
            // --- 【新增】設定技能圖示 ---
            if (skill.icon) {
                const iconPath = UI.getSkillIcon(skill.icon);
                btn.style.backgroundImage = `url('${iconPath}')`;
                btn.style.backgroundSize = 'cover'; // 讓圖片填滿按鈕
                btn.style.backgroundPosition = 'center';
            }
            // ---------------------------

            // 判斷 CD 狀態
            if (skill.currentCooldown > 0) {
                // CD 中：顯示半透明黑遮罩 + 數字
                // 我們用 box-shadow 或 background-color rgba 來做遮罩效果
                btn.style.backgroundColor = 'rgba(0,0,0,0.7)'; 
                btn.style.cursor = 'not-allowed';
                // 為了讓背景圖不被完全蓋住，我們使用 blend-mode 或是在上面蓋一層 div，
                // 但簡單做法是直接疊加顏色
                btn.innerHTML = `<div class="skill-cooldown">${skill.currentCooldown}</div>`;
                
                // 如果有圖，加一點濾鏡讓它變暗
                if (skill.icon) {
                    btn.style.filter = 'grayscale(100%) brightness(50%)'; 
                }
            } else {
                // 可用狀態
                if (!skill.icon) {
                    // 如果沒圖，才給預設綠色背景，有圖就不用給背景色
                    btn.style.backgroundColor = '#4db6ac'; 
                }
                btn.style.cursor = 'pointer';
                btn.style.filter = 'none'; // 移除濾鏡
                
                // 點擊事件
                btn.onclick = (e) => {
                    e.stopPropagation(); 
                    UI.castSkill(servantIndex, skillIdx);
                };
                
                // Tooltip
                btn.title = `${skill.name}\n${skill.description}`;
            }

            skillContainer.appendChild(btn);
        });
    },

    // 修改 castSkill
    castSkill: async (servantIdx, skillIdx) => {
        const user = UI.gameState.party[servantIdx];
        const skill = user.skills[skillIdx];

        if (skill.currentCooldown > 0) return;

        let targets = [];

        // 1. 檢查是否需要選擇目標
        // 判斷依據：效果裡有 target: 'one' (我方單體) 或 target: 'enemy' (敵方單體)
        // 注意：有些技能可能有複合效果，只要有一個需要選，就要選
        const needsAllySelection = skill.effects.some(e => e.target === 'one');
        const needsEnemySelection = skill.effects.some(e => e.target === 'enemy'); // 雖然目前大多技能是對敵方全體或自身

        if (needsAllySelection) {
            UI.log(`請選擇 [${skill.name}] 的對象...`);
            const selected = await UI.selectTarget('ally');
            if (!selected) {
                UI.log(">> 取消施放");
                return;
            }
            targets = [selected];
        } 
        else if (needsEnemySelection) {
             // 預留給敵方單體技能 (如降防)
             const selected = await UI.selectTarget('enemy');
             if (!selected) return;
             targets = [selected];
        }
        else {
            // 全體或自身，不需要選，但為了 Engine 方便，我們還是要傳入正確的 targets 陣列
            // 如果是 party，targets 就是所有隊員
            // 如果是 self，targets 就是 [user] (但 Engine.useSkill 內部邏輯目前是單次呼叫)
            
            // 這裡我們做個簡化：
            // 如果是 party 效果，我們要在 UI 層拆解成對每個人呼叫一次 useSkill (或是 Engine 改寫支援陣列)
            // 目前 Engine.useSkill 是一次處理一個 target。
            // 所以我們把 targets 設為 [p1, p2, p3]
            targets = UI.gameState.party;
        }

        UI.log(`>> [Skill] ${user.name} 發動了 "${skill.name}"`);

        // 2. 執行效果 (針對選定目標群)
        // 這裡有個細節：如果技能同時有「我方全體加攻」和「我方單體充能」，targets 該怎麼辦？
        // 正確做法：Engine.useSkill 應該要接收「主要選擇目標」，然後內部再判斷每個 effect 的 target 是 'party' 還是 'one'
        
        // --- 修正 Engine 呼叫邏輯 ---
        // 我們改為：把「玩家選中的目標」傳給 Engine，讓 Engine 自己去過濾效果
        // 如果玩家沒選 (因為是全體技)，selectedTarget 就傳 null 或 user
        
        const mainTarget = targets.length === 1 ? targets[0] : user;

        // 我們需要對隊伍裡的每個人都跑一次 useSkill 嗎？
        // 不，應該只跑一次，讓 Engine 決定誰會吃到效果。
        // 但目前的 Engine.useSkill 是設計成 "Apply effects to THIS target"。
        
        // 【暫時解法】：
        // 為了支援混合型技能 (例如術傻二技：單體充能 + 全體黃金律)
        // 我們需要遍歷所有效果，分別處理。
        
        skill.effects.forEach(effect => {
            let effectTargets = [];
            
            if (effect.target === 'one') {
                // 使用玩家選中的目標
                effectTargets = [mainTarget];
            } else if (effect.target === 'self') {
                effectTargets = [user];
            } else if (effect.target === 'party') {
                effectTargets = UI.gameState.party;
            } else if (effect.target === 'enemy' || effect.target === 'enemy_all') {
                effectTargets = [UI.gameState.enemy];
            }

            effectTargets.forEach(t => {
                // 為了避免重複觸發某些全域效果 (如產星)，我們可以傳入一個 flag 或是由 Engine 判斷
                // 但目前 star_gen_flat 是直接加到 global stars，重複加沒關係 (只要 JSON 數值沒寫錯，通常產星只會寫在一條 effect 裡)
                
                // 這裡我們只傳入單一 effect 給 Engine 處理
                // 需要微調 Engine.useSkill 讓它接受單一 effect 或是我們在 UI 拆解
                
                // 為了不動 Engine 太大，我們手動呼叫 Engine.applyBuff / logic
                // 或者，我們可以創造一個 "Dummy Skill" 只包含當前 effect 傳進去
                const dummySkill = { ...skill, effects: [effect] };
                Engine.useSkill(user, t, dummySkill);
            });
        });

        // 3. 進入 CD
        skill.currentCooldown = skill.cd;
        
        // 檢查是否有「技能再裝填」被動 (CD -1)
        // (這部分 Engine.useSkill 裡有寫註解，或是直接在這裡處理)
        // 簡單做：在這裡檢查 user.passive_skills 是否有 skill_cooldown_reduce_trigger
        // 這裡先跳過，等以後再精修

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
