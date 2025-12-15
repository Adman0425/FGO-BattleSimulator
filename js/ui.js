const UI = {
    gameState: {
        player: null,
        enemy: null,
        currentHand: [], // 當前手牌 (5張)
        selectedCards: [], // 已選擇的卡片索引 (0~4)
        isNPSelected: false // 是否選中寶具
    },

    // 圖片路徑配置 (請在這裡替換你之後上傳的 Arts/Quick 圖片)
    cardImages: {
        'Buster': 'data/Buster.png',
        'Arts': 'data/Arts.png',
        'Quick': 'data/Quick.png',
        'NP': 'data/NP.png'
    },

    init: () => {
        // 填充下拉選單
        const pSelect = document.getElementById('player-select');
        DB.SERVANTS.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.text = `[No.${s.id}] ${s.name} (${s.class})`;
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
        
        // 戰鬥開始時，發 5 張牌
        UI.dealCards();
    },

    // 發牌 (Deal Cards)
    dealCards: () => {
        const p = UI.gameState.player;
        if (!p) return;

        // 從從者的配卡中隨機抽取 5 張 (簡單模擬，不考慮 3 回合洗牌)
        // 實際 FGO 是 15 張牌洗一次，這裡簡化為每回合隨機 5 張
        UI.gameState.currentHand = [];
        for (let i = 0; i < 5; i++) {
            const randomCard = p.cards.deck[Math.floor(Math.random() * p.cards.deck.length)];
            UI.gameState.currentHand.push(randomCard);
        }

        UI.gameState.selectedCards = [];
        UI.gameState.isNPSelected = false;
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 渲染手牌區
    renderHand: () => {
        const container = document.getElementById('hand-container');
        container.innerHTML = '';

        UI.gameState.currentHand.forEach((cardType, index) => {
            const img = document.createElement('img');
            img.src = UI.cardImages[cardType] || UI.cardImages['Buster']; // 防呆
            img.className = 'command-card-img';
            img.id = `card-${index}`;
            
            // 如果這張卡已經被選了，加上灰色樣式
            if (UI.gameState.selectedCards.includes(index)) {
                img.classList.add('used');
            }

            img.onclick = () => UI.selectCard(index);
            container.appendChild(img);
        });
    },

    // 選擇卡片
    selectCard: (index) => {
        if (UI.gameState.selectedCards.length >= 3) return; // 最多選 3 張

        UI.gameState.selectedCards.push(index);
        UI.renderHand(); // 更新手牌狀態 (變灰)
        UI.updateSelectedSlots();
    },

    // 取消選擇 (點擊上面的格子)
    deselectCard: (slotIndex) => {
        if (slotIndex >= UI.gameState.selectedCards.length) return;

        // 移除該位置的卡片
        UI.gameState.selectedCards.splice(slotIndex, 1);
        UI.renderHand();
        UI.updateSelectedSlots();
    },

    // 更新上方已選卡槽
    updateSelectedSlots: () => {
        const slots = [0, 1, 2];
        const selected = UI.gameState.selectedCards;
        const hand = UI.gameState.currentHand;

        slots.forEach(i => {
            const el = document.getElementById(`slot-${i}`);
            el.style.backgroundImage = 'none';
            el.innerText = `${i + 1}nd`;
            el.style.backgroundColor = 'transparent';

            if (i < selected.length) {
                const cardIndex = selected[i];
                const cardType = hand[cardIndex];
                el.innerText = '';
                el.style.backgroundImage = `url('${UI.cardImages[cardType]}')`;
                el.style.backgroundColor = '#000'; // 背景黑底以免透明圖露餡
            }
        });

        // 控制 Attack 按鈕
        const btn = document.getElementById('btn-execute');
        btn.disabled = (selected.length !== 3);
        if (UI.gameState.isNPSelected) {
             // 如果選了寶具，邏輯會變複雜，這裡先簡化：寶具視為第一張卡
             // 實際 UI 應該要能把寶具插入任意位置，這裡暫時做「寶具+2張卡」或「3張卡」
             // 本次先做「選3張指令卡」的基礎功能
        }
    },

    // 發動攻擊 (Turn Execution)
    executeTurn: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        const hand = UI.gameState.currentHand;
        const selectedIndices = UI.gameState.selectedCards;

        if (selectedIndices.length !== 3) return;

        // 將選中的卡片轉換為卡片類型陣列 ['Buster', 'Arts', 'Buster']
        const cardChain = selectedIndices.map(idx => hand[idx]);

        // 呼叫 Engine 計算整回合
        const results = Engine.calculateTurn(p, e, cardChain, UI.gameState.isNPSelected);

        // 顯示結果
        UI.log("=== 回合開始 ===");
        
        // 顯示特殊連鎖
        if (results.chainBonus.busterChain) UI.log("【Buster Chain!】攻擊力提升");
        if (results.chainBonus.artsChain) UI.log("【Arts Chain!】全隊 NP +20%");
        if (results.chainBonus.quickChain) UI.log("【Quick Chain!】獲得 10 顆暴擊星");
        if (results.chainBonus.braveChain) UI.log("【Brave Chain!】追加 Extra 攻擊");

        // 逐一顯示每一卡的傷害
        results.attacks.forEach((atk, i) => {
            let prefix = (i < 3) ? `Card ${i+1} [${atk.type}]` : `Extra Attack`;
            UI.log(`${prefix}: 造成 <span class="dmg-text">${atk.damage}</span>, NP <span class="np-text">+${atk.np}%</span>, 星 <span class="star-text">+${atk.stars}</span>`);
            
            // 扣血
            e.currentHp -= atk.damage;
            p.currentNp += atk.np;
        });

        // 結算
        if (p.currentNp > 300) p.currentNp = 300;
        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> 敵方已被擊倒！");
        }

        UI.updateDisplay();
        
        // 準備下一回合 (重新發牌)
        setTimeout(() => {
            if (e.currentHp > 0) {
                UI.log("--- 下一回合準備中 ---");
                UI.dealCards();
            }
        }, 1000);
    },

    // 寶具開關 (暫時簡化)
    toggleNP: () => {
        // 這裡暫時只做一個簡單的 Log，下一階段我們再做寶具卡插入隊列的功能
        UI.log("寶具卡插入功能將在下一階段實裝 (需要更複雜的拖曳排序 UI)");
    },

    updateDisplay: () => {
        // (保持原本的代碼不變)
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        if(!p || !e) return;

        document.getElementById('p-name').innerText = p.name;
        document.getElementById('p-class').innerText = p.class.toUpperCase();
        document.getElementById('p-attr').innerText = p.attribute.toUpperCase();
        document.getElementById('p-hp-current').innerText = Math.floor(p.currentHp);
        document.getElementById('p-hp-max').innerText = p.maxHp;
        document.getElementById('p-atk').innerText = p.currentStats.atk;
        document.getElementById('p-np').innerText = p.currentNp.toFixed(2);
        
        const pHpPct = Math.max(0, (p.currentHp / p.maxHp) * 100);
        document.getElementById('p-hp-bar').style.width = `${pHpPct}%`;

        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-class').innerText = e.class.toUpperCase();
        document.getElementById('e-attr').innerText = e.attribute.toUpperCase();
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        document.getElementById('e-hp-max').innerText = e.maxHp;

        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;
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

window.onload = async () => {
    // (保持 index.html 裡的啟動邏輯，或者這裡直接寫死)
    // 這裡留給 index.html 呼叫
};
