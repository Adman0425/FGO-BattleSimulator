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
        const idStr = String(id).padStart(3, '0');
        return `data/servant_icon/${idStr}.png`; 
    },

    init: () => {
        // Player Select
        const pSelect = document.getElementById('player-select');
        DB.SERVANTS.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = `[No.${s.id}] ${s.name}`;
            pSelect.appendChild(opt);
        });

        // Quest Select (讀取 quests.json)
        const qSelect = document.getElementById('quest-select');
        DB.QUESTS.forEach((q, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = q.name; // 顯示關卡名稱
            qSelect.appendChild(opt);
        });
    },

    initBattle: () => {
        const pIndex = document.getElementById('player-select').value;
        const qIndex = document.getElementById('quest-select').value;
        const levelSetting = document.getElementById('level-select').value;

        const pData = DB.SERVANTS[pIndex];
        
        // 讀取關卡數據
        const quest = DB.QUESTS[qIndex];
        // 抓取 Wave 1 的第 1 隻敵人
        const enemyDataRaw = quest.waves[0].enemies[0];
        
        // 嘗試匹配 enemies.json 裡的基底數據，若無則用預設
        let eBase = DB.ENEMIES.find(e => e.id === enemyDataRaw.id) || DB.ENEMIES[0]; 
        
        // 混合數據 (優先使用關卡設定的 HP)
        const eData = {
            ...eBase,
            hp: enemyDataRaw.hp || eBase.hp, 
            currentHp: enemyDataRaw.hp || eBase.hp,
            maxHp: enemyDataRaw.hp || eBase.hp
        };

        const finalStats = Engine.calculateStats(pData, levelSetting);

        UI.gameState.player = {
            ...pData,
            currentStats: finalStats,
            currentHp: finalStats.hp,
            maxHp: finalStats.hp,
            currentNp: 0
        };

        UI.gameState.enemy = eData;

        UI.log(`--- 關卡開始: ${quest.name} ---`);
        UI.updateDisplay();
        UI.dealCards();
    },

    // 洗牌演算法
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    // 發牌 (含洗牌邏輯)
    dealCards: () => {
        const p = UI.gameState.player;
        if (!p) return;

        UI.gameState.currentHand = [];

        // 單人 Solo 模式：複製配卡陣列並洗牌
        const deck = [...p.cards.deck]; 
        UI.shuffleArray(deck); 

        // 發 5 張牌
        for (let i = 0; i < 5; i++) {
            UI.gameState.currentHand.push({
                type: deck[i],
                ownerId: p.id
            });
        }

        UI.gameState.selectedCards = [];
        UI.gameState.isNPSelected = false;
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 渲染手牌 (含徽章)
    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            if (UI.gameState.selectedCards.includes(index)) {
                cardDiv.classList.add('used');
            }
            // 這裡就是報錯的地方，現在確保 UI.selectCard 是存在的
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

    // 選擇卡片
    selectCard: (index) => {
        if (UI.gameState.selectedCards.length >= 3) return;
        UI.gameState.selectedCards.push(index);
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 取消選擇
    deselectCard: (slotIndex) => {
        if (slotIndex >= UI.gameState.selectedCards.length) return;
        UI.gameState.selectedCards.splice(slotIndex, 1);
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 更新上方卡槽
    updateSelectedSlots: () => {
        const slots = [0, 1, 2];
        const selected = UI.gameState.selectedCards;
        const hand = UI.gameState.currentHand;

        slots.forEach(i => {
            const el = document.getElementById(`slot-${i}`);
            el.innerHTML = '';
            el.style.backgroundImage = 'none';
            el.style.backgroundColor = 'transparent';
            el.style.border = '2px dashed #666';

            if (i < selected.length) {
                const cardIndex = selected[i];
                const card = hand[cardIndex];

                el.style.backgroundImage = `url('${UI.cardImages[card.type]}')`;
                el.style.border = '2px solid #fff'; 

                const badge = document.createElement('img');
                badge.className = 'owner-badge';
                badge.src = UI.getServantIcon(card.ownerId);
                badge.onerror = () => { badge.src = 'https://placehold.co/40x40?text=?'; };
                badge.style.width = '40px'; 
                badge.style.height = '40px';
                badge.style.top = '-10px';
                badge.style.left = '-10px';
                el.appendChild(badge);
            } else {
                el.innerText = `${i + 1}nd`;
            }
        });

        document.getElementById('btn-execute').disabled = (selected.length !== 3);
    },

    // 執行回合
    executeTurn: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        const hand = UI.gameState.currentHand;
        const selectedIndices = UI.gameState.selectedCards;

        if (selectedIndices.length !== 3) return;

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
                UI.dealCards(); // 回合結束後重新發牌
            }
        }, 1000);
    },

    toggleNP: () => { UI.log("寶具功能開發中..."); },

    updateDisplay: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        if(!p || !e) return;

        // Enemy
        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-class').innerText = (e.class || 'Unknown').toUpperCase();
        document.getElementById('e-attr').innerText = (e.attribute || '').toUpperCase();
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;
        document.getElementById('e-avatar').src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python_logo_notext.svg/121px-Python_logo_notext.svg.png';

        // Player
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
