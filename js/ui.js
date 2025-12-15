const UI = {
    gameState: {
        player: null,
        enemy: null,
        currentHand: [],
        selectedCards: [],
        isNPSelected: false
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
        // Player Select
        const pSelect = document.getElementById('player-select');
        DB.SERVANTS.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = `[No.${s.id}] ${s.name}`;
            pSelect.appendChild(opt);
        });

        // Quest Select (改讀 quests.json)
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
        const qIndex = document.getElementById('quest-select').value; // 改抓 quest
        const levelSetting = document.getElementById('level-select').value;

        const pData = DB.SERVANTS[pIndex];
        
        // 讀取關卡數據
        const quest = DB.QUESTS[qIndex];
        // 邏輯：抓取 Wave 1 的第 1 隻敵人 (模擬單挑)
        // 如果未來要做多隻敵人，這裡需要改成陣列
        const enemyDataRaw = quest.waves[0].enemies[0];
        
        // 從 enemies.json 裡找對應 ID 的詳細數值，或者直接用 quest 裡的覆蓋值
        // 這裡假設我們需要用 ID 去 DB.ENEMIES 查表，再用 quest 數值覆蓋
        // 但目前的 enemies.json 結構和 quest 裡的結構可能需要對應
        // 簡化：我們直接用 quest 裡的資料生成敵人物件
        // *注意*：你原本的 quests.json 裡敵人只有 id, hp 等，缺少 class/name 等詳細資料
        // 正式做法應該是：用 enemyDataRaw.id 去 DB.ENEMIES 撈基底，再把 hp 蓋過去
        
        // 暫時解法：因為我們 enemies.json 只有範本，我們先嘗試匹配，匹配不到就用預設
        let eBase = DB.ENEMIES.find(e => e.id === enemyDataRaw.id) || DB.ENEMIES[0]; // 找不到就用骷髏兵
        
        const eData = {
            ...eBase,
            hp: enemyDataRaw.hp || eBase.hp, // 使用關卡設定的血量
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

    // 洗牌演算法 (Fisher-Yates)
    shuffleArray: (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    dealCards: () => {
        const p = UI.gameState.player;
        if (!p) return;

        UI.gameState.currentHand = [];

        // 【修正】牌庫邏輯
        // 目前是單人 (Solo) 模式：
        // 規則：每回合都使用該從者的 5 張配卡，只是順序打亂。
        // 我們直接複製一份配卡陣列，然後洗牌。
        
        const deck = [...p.cards.deck]; // 複製 ['Quick', 'Arts', ...]
        UI.shuffleArray(deck); // 洗牌

        // 發牌
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

    // ... renderHand, selectCard, deselectCard, updateSelectedSlots 保持不變 ...
    // 請保留 v3.1 版中關於 renderHand (含徽章) 的代碼，這裡不重複貼上以免篇幅過長
    // 只要修改 dealCards 邏輯即可

    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((card, index) => {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'card-container';
            if (UI.gameState.selectedCards.includes(index)) {
                cardDiv.classList.add('used');
            }
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

    // selectCard, deselectCard, updateSelectedSlots 等與 v3.1 相同，請直接使用 v3.1 的內容

    // (為了完整性，這裡列出 updateSelectedSlots 的尺寸修正，確保 Slot 圖片也正確)
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
                // Slot 已經在 CSS 設定 background-size: cover，這裡會自動適配 140px
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

    // ... executeTurn, updateDisplay, log 等保持 v3.1 ...
    // (注意 updateDisplay 裡要抓 e-avatar 的邏輯，現在 eData 是混合出來的)
    // 這裡記得 executeTurn 的 setTimeout 裡要呼叫 UI.dealCards()

    // 補上 executeTurn 以防萬一
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
                UI.dealCards(); // 這裡會觸發新的洗牌
            }
        }, 1000);
    },

    toggleNP: () => { UI.log("寶具功能開發中..."); },

    updateDisplay: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        if(!p || !e) return;

        // Enemy Display
        document.getElementById('e-name').innerText = e.name;
        // 如果 enemy data 裡沒有 class 屬性 (從 quest 來的可能沒有)，要防呆
        document.getElementById('e-class').innerText = (e.class || 'Unknown').toUpperCase();
        document.getElementById('e-attr').innerText = (e.attribute || '').toUpperCase();
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;
        
        // 假圖或從 enemies.json 讀圖片 (目前沒欄位)
        document.getElementById('e-avatar').src = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python_logo_notext.svg/121px-Python_logo_notext.svg.png';

        // Player Display
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
