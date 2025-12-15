const UI = {
    gameState: {
        party: [], // [p1, p2, p3]
        enemy: null,
        currentHand: [],
        selectedCards: [],
        stars: 0
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

    init: () => {
        // 1. 填充選單
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

        // Quest
        const qSelect = document.getElementById('quest-select');
        DB.QUESTS.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = q.name;
            qSelect.appendChild(opt);
        });

        // 2. 讀取存檔並還原
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
        // 1. 建立隊伍陣列
        const partyIndices = [
            { idx: document.getElementById('p1-select').value, lv: document.getElementById('p1-lv').value },
            { idx: document.getElementById('p2-select').value, lv: document.getElementById('p2-lv').value },
            { idx: document.getElementById('p3-select').value, lv: document.getElementById('p3-lv').value }
        ];

        UI.gameState.party = partyIndices.map(p => {
            const data = DB.SERVANTS[p.idx];
            const stats = Engine.calculateStats(data, p.lv);
            return {
                ...data,
                currentStats: stats,
                currentHp: stats.hp,
                maxHp: stats.hp,
                currentNp: 0
            };
        });

        // 2. 建立敵人
        const qIndex = document.getElementById('quest-select').value;
        const quest = DB.QUESTS[qIndex];
        const enemyDataRaw = quest.waves[0].enemies[0];
        let eBase = DB.ENEMIES.find(e => e.id === enemyDataRaw.id) || DB.ENEMIES[0];
        const eData = {
            ...eBase,
            hp: enemyDataRaw.hp || eBase.hp,
            currentHp: enemyDataRaw.hp || eBase.hp,
            maxHp: enemyDataRaw.hp || eBase.hp
        };
        UI.gameState.enemy = eData;
        UI.gameState.stars = 0;

        UI.log(`--- 戰鬥開始: ${quest.name} ---`);
        UI.updateDisplay();
        
        // 關閉指令面板
        document.getElementById('command-overlay').classList.remove('active');
        // 準備第一回合發牌
        UI.dealCards(); 
    },

    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // 混合牌庫並發牌
    dealCards: () => {
        if (UI.gameState.party.length === 0) return;

        // 1. 收集所有人的配卡 (共15張)
        let fullDeck = [];
        UI.gameState.party.forEach((servant, sIndex) => {
            // 這裡記錄 servantIndex (0, 1, 2) 以便之後查找是誰
            servant.cards.deck.forEach(cardType => {
                fullDeck.push({ type: cardType, ownerIndex: sIndex, ownerId: servant.id });
            });
        });

        // 2. 洗牌
        UI.shuffleArray(fullDeck);

        // 3. 發 5 張 (目前是每回合都重新洗牌發5張，這是隨機模式)
        // (若要模擬真實 FGO 3回合循環，需要更複雜的 Deck State)
        UI.gameState.currentHand = fullDeck.slice(0, 5);
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
            el.innerHTML = ''; // 清空內容
            el.className = 'card-slot'; // 重置 class

            if (i < selected.length) {
                const cardIndex = selected[i];
                const card = hand[cardIndex];

                // 1. 添加 .filled 樣式 (變實線邊框)
                el.classList.add('filled');

                // 2. 插入卡片圖 (不再用 background-image)
                const cardImg = document.createElement('img');
                cardImg.src = UI.cardImages[card.type];
                cardImg.className = 'slot-card-img';
                el.appendChild(cardImg);

                // 3. 插入徽章
                const badge = document.createElement('img');
                badge.src = UI.getServantIcon(card.ownerId);
                badge.className = 'slot-badge';
                badge.onerror = () => { badge.src = 'https://placehold.co/40x40?text=?'; };
                el.appendChild(badge);

            } else {
                // 空槽位顯示文字
                el.innerText = `${i + 1}nd`;
            }
        });

        // 按鈕狀態控制
        document.getElementById('btn-execute').disabled = (selected.length !== 3);
    },

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

        // 轉換出牌資訊
        const cardChain = selectedIndices.map(idx => {
            const card = hand[idx];
            return {
                type: card.type,
                // 從 party 陣列中抓出攻擊者
                attacker: UI.gameState.party[card.ownerIndex] 
            };
        });

        // 關閉指令介面
        UI.closeCommandPhase();

        // **計算邏輯 (修正版)**
        // 需要對每張卡單獨呼叫 Engine，因為 attacker 不同
        
        // 1. 判斷 Chain (簡單版)
        const firstType = cardChain[0].type;
        const isBusterChain = cardChain.every(c => c.type === 'Buster');
        const isArtsChain = cardChain.every(c => c.type === 'Arts');
        const isQuickChain = cardChain.every(c => c.type === 'Quick');
        // 判斷 Brave Chain (同一人)
        const firstOwner = cardChain[0].attacker.id;
        const isBraveChain = cardChain.every(c => c.attacker.id === firstOwner);

        UI.log("=== Turn Start ===");
        if (isBusterChain) UI.log("【Buster Chain】Atk Up!");
        if (isArtsChain) { UI.log("【Arts Chain】Party NP +20%"); UI.gameState.party.forEach(p => p.currentNp += 20); }
        if (isQuickChain) { UI.log("【Quick Chain】Stars +10"); UI.gameState.stars += 10; }

        // 2. 執行攻擊
        cardChain.forEach((card, i) => {
            const p = card.attacker;
            // 呼叫 Engine (注意：我們需要微調 Engine 參數來支援 BusterChain 加成)
            const dmg = Engine.calculateDamage(p, e, card.type, i, false, isBusterChain);
            const np = Engine.calculateNPGain(p, e, card.type, i, dmg);
            const star = Engine.calculateStarGen(p, e, card.type, i, false);

            e.currentHp -= dmg;
            p.currentNp += np;
            UI.gameState.stars += star;

            UI.log(`Card ${i+1} (${p.name}): Dmg <span class="dmg-text">${dmg}</span>, NP +${np}%, Star +${star}`);
        });

        // 3. Extra Attack
        if (isBraveChain) {
            const p = cardChain[0].attacker;
            const exDmg = Engine.calculateDamage(p, e, 'Extra', 3, false, isBusterChain);
            const exNp = Engine.calculateNPGain(p, e, 'Extra', 3, exDmg);
            const exStar = Engine.calculateStarGen(p, e, 'Extra', 3, false);
            
            e.currentHp -= exDmg;
            p.currentNp += exNp;
            UI.gameState.stars += exStar;
            UI.log(`Extra Attack: Dmg ${exDmg}, NP +${exNp}%, Star +${exStar}`);
        }

        // 結算
        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> Enemy Defeated!");
        }
        UI.gameState.party.forEach(p => { if(p.currentNp > 300) p.currentNp = 300; });

        UI.updateDisplay();
        
        // 下一回合
        if (e.currentHp > 0) {
            setTimeout(() => {
                UI.dealCards();
            }, 1000);
        }
    },

    updateDisplay: () => {
        const e = UI.gameState.enemy;
        if (!e) return;

        // Enemy
        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;

        // Party
        UI.gameState.party.forEach((p, i) => {
            const slot = i + 1; // p1, p2, p3
            document.getElementById(`img-p${slot}`).src = UI.getServantIcon(p.id);
            document.getElementById(`val-hp-p${slot}`).innerText = Math.floor(p.currentHp);
            document.getElementById(`hp-p${slot}`).style.width = `${Math.max(0, (p.currentHp / p.maxHp) * 100)}%`;
            document.getElementById(`val-np-p${slot}`).innerText = p.currentNp.toFixed(1);
            document.getElementById(`np-p${slot}`).style.width = `${Math.min(100, p.currentNp)}%`;
        });

        // Stars
        document.getElementById('star-count').innerText = Math.floor(UI.gameState.stars);
    },

    log: (msg) => {
        const box = document.getElementById('battle-log');
        const div = document.createElement('div');
        div.className = 'log-entry';
        div.innerHTML = msg;
        box.appendChild(div);
        box.scrollTop = box.scrollHeight;
    }
};
