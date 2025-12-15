const UI = {
    gameState: {
        player: null,
        enemy: null,
        currentHand: [],
        selectedCards: [],
        isNPSelected: false
    },

    // 圖片路徑配置
    cardImages: {
        'Buster': 'data/Buster.png',
        'Arts': 'data/Arts.png',
        'Quick': 'data/Quick.png',
        'NP': 'data/NP.png'
    },

    // 取得頭像路徑 helper (將 1 -> "001")
    getServantIcon: (id) => {
        // 假設 ID 1000 這種也是直接用 1000.png，只有 <1000 的才補零
        // 或者全部補到至少 3 位
        const idStr = String(id).padStart(3, '0');
        return `data/servant_icon/${idStr}.png`; 
    },

    init: () => {
        const pSelect = document.getElementById('player-select');
        DB.SERVANTS.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = `[No.${s.id}] ${s.name}`;
            pSelect.appendChild(opt);
        });

        const eSelect = document.getElementById('enemy-select');
        DB.ENEMIES.forEach((e, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = `${e.name} (${e.class})`;
            eSelect.appendChild(opt);
        });
    },

    initBattle: () => {
        const pIndex = document.getElementById('player-select').value;
        const eIndex = document.getElementById('enemy-select').value;
        const levelSetting = document.getElementById('level-select').value;

        const pData = DB.SERVANTS[pIndex];
        const eData = DB.ENEMIES[eIndex];
        const finalStats = Engine.calculateStats(pData, levelSetting);

        UI.gameState.player = {
            ...pData,
            currentStats: finalStats,
            currentHp: finalStats.hp,
            maxHp: finalStats.hp,
            currentNp: 0
        };

        UI.gameState.enemy = {
            ...eData,
            currentHp: eData.hp,
            maxHp: eData.hp
        };

        UI.log("--- 戰鬥開始 ---");
        UI.updateDisplay();
        UI.dealCards();
    },

    dealCards: () => {
        const p = UI.gameState.player;
        if (!p) return;

        UI.gameState.currentHand = [];
        // 暫時模擬單人：5張牌都是這個人的
        for (let i = 0; i < 5; i++) {
            const cardType = p.cards.deck[Math.floor(Math.random() * p.cards.deck.length)];
            UI.gameState.currentHand.push({
                type: cardType,
                ownerId: p.id // 記住這張牌是誰的
            });
        }

        UI.gameState.selectedCards = [];
        UI.gameState.isNPSelected = false;
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 【重點】渲染手牌 (含徽章)
    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            // 容器
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            if (UI.gameState.selectedCards.includes(index)) {
                cardDiv.classList.add('used');
            }
            cardDiv.onclick = () => UI.selectCard(index);

            // 卡片圖
            const img = document.createElement('img');
            img.src = UI.cardImages[card.type] || UI.cardImages['Buster'];
            img.className = 'command-card-img';

            // 徽章 (頭像)
            const badge = document.createElement('img');
            badge.className = 'owner-badge';
            badge.src = UI.getServantIcon(card.ownerId);
            // 處理圖片載入失敗的情況 (顯示預設圖)
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
            // 清空樣式
            el.innerHTML = '';
            el.style.backgroundImage = 'none';
            el.style.backgroundColor = 'transparent';
            el.style.border = '2px dashed #666';

            if (i < selected.length) {
                const cardIndex = selected[i];
                const card = hand[cardIndex];

                // 顯示卡片圖
                el.style.backgroundImage = `url('${UI.cardImages[card.type]}')`;
                el.style.border = '2px solid #fff'; // 選中變成實線

                // 在 Slot 裡也顯示徽章 (讓玩家知道選了誰)
                const badge = document.createElement('img');
                badge.className = 'owner-badge';
                badge.src = UI.getServantIcon(card.ownerId);
                badge.onerror = () => { badge.src = 'https://placehold.co/40x40?text=?'; };
                badge.style.width = '30px'; // Slot 裡的稍微小一點
                badge.style.height = '30px';
                el.appendChild(badge);
            } else {
                el.innerText = `${i + 1}nd`;
            }
        });

        document.getElementById('btn-execute').disabled = (selected.length !== 3);
    },

    executeTurn: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        const hand = UI.gameState.currentHand;
        const selectedIndices = UI.gameState.selectedCards;

        if (selectedIndices.length !== 3) return;

        // 轉換為 Engine 接受的格式 (純字串陣列)
        const cardChain = selectedIndices.map(idx => hand[idx].type);

        const results = Engine.calculateTurn(p, e, cardChain, UI.gameState.isNPSelected);

        UI.log("=== 回合開始 ===");
        if (results.chainBonus.busterChain) UI.log("【Buster Chain!】ATK UP!");
        if (results.chainBonus.artsChain) UI.log("【Arts Chain!】NP +20%!");
        if (results.chainBonus.quickChain) UI.log("【Quick Chain!】Stars +10!");
        
        results.attacks.forEach((atk, i) => {
            const prefix = (i < 3) ? `Card ${i+1}` : `Extra`;
            UI.log(`${prefix} [${atk.type}]: 傷 <span class="dmg-text">${atk.damage}</span> | NP <span class="np-text">+${atk.np}%</span> | 星 <span class="star-text">+${atk.stars}</span>`);
            e.currentHp -= atk.damage;
            p.currentNp += atk.np;
        });

        if (results.chainBonus.artsChain) p.currentNp += 20;

        if (p.currentNp > 300) p.currentNp = 300;
        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> 敵方擊破！");
        }

        UI.updateDisplay();
        
        setTimeout(() => {
            if (e.currentHp > 0) {
                UI.log("--- Next Turn ---");
                UI.dealCards();
            }
        }, 1000);
    },

    toggleNP: () => {
        UI.log("寶具功能開發中...");
    },

    updateDisplay: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        if(!p || !e) return;

        // Enemy
        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-class').innerText = e.class.toUpperCase();
        document.getElementById('e-attr').innerText = e.attribute.toUpperCase();
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;
        document.getElementById('e-avatar').src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python_logo_notext.svg/121px-Python_logo_notext.svg.png'; // 暫時用個假圖

        // Player 1
        document.getElementById('p1-name').innerText = p.name;
        document.getElementById('p1-avatar').src = UI.getServantIcon(p.id);
        
        document.getElementById('p1-hp-current').innerText = Math.floor(p.currentHp);
        const pHpPct = Math.max(0, (p.currentHp / p.maxHp) * 100);
        document.getElementById('p1-hp-bar').style.width = `${pHpPct}%`;

        document.getElementById('p1-np-val').innerText = p.currentNp.toFixed(1);
        const pNpPct = Math.min(100, p.currentNp); 
        document.getElementById('p1-np-bar').style.width = `${pNpPct}%`;
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
