const UI = {
    gameState: {
        player: null,
        enemy: null
    },

    init: () => {
        // 1. 填充下拉選單
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

        // 2. 綁定事件
        // (這裡不做自動刷新，等按「開始」按鈕)
    },

    initBattle: () => {
        const pIndex = document.getElementById('player-select').value;
        const eIndex = document.getElementById('enemy-select').value;
        const levelSetting = document.getElementById('level-select').value;

        // 讀取原始數據
        const pData = DB.SERVANTS[pIndex];
        const eData = DB.ENEMIES[eIndex];

        // 計算練度後的白值
        const finalStats = Engine.calculateStats(pData, levelSetting);

        // 初始化遊戲狀態
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
        UI.log(`我方: ${pData.name} (Lv: ${levelSetting}) HP:${finalStats.hp} ATK:${finalStats.atk}`);
        UI.log(`敵方: ${eData.name} HP:${eData.hp}`);

        UI.updateDisplay();
    },

    updateDisplay: () => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;

        if(!p || !e) return;

        // Player
        document.getElementById('p-name').innerText = p.name;
        document.getElementById('p-class').innerText = p.class.toUpperCase();
        document.getElementById('p-attr').innerText = p.attribute.toUpperCase();
        document.getElementById('p-hp-current').innerText = Math.floor(p.currentHp);
        document.getElementById('p-hp-max').innerText = p.maxHp;
        document.getElementById('p-atk').innerText = p.currentStats.atk;
        document.getElementById('p-np').innerText = p.currentNp.toFixed(2);
        
        const pHpPct = Math.max(0, (p.currentHp / p.maxHp) * 100);
        document.getElementById('p-hp-bar').style.width = `${pHpPct}%`;

        // Enemy
        document.getElementById('e-name').innerText = e.name;
        document.getElementById('e-class').innerText = e.class.toUpperCase();
        document.getElementById('e-attr').innerText = e.attribute.toUpperCase();
        document.getElementById('e-hp-current').innerText = Math.floor(e.currentHp);
        document.getElementById('e-hp-max').innerText = e.maxHp;

        const eHpPct = Math.max(0, (e.currentHp / e.maxHp) * 100);
        document.getElementById('e-hp-bar').style.width = `${eHpPct}%`;
    },

    handleAttack: (cardType) => {
        const p = UI.gameState.player;
        const e = UI.gameState.enemy;
        if(!p || !e) return alert("請先開始戰鬥！");
        if(e.currentHp <= 0) return alert("敵人已經倒下了！");

        // 1. 計算傷害
        // 假設卡片放在第1位 (pos=0)
        const damage = Engine.calculateDamage(p, e, cardType, 0, false);
        
        // 2. 計算 NP
        const npGain = Engine.calculateNPGain(p, e, cardType, 0, damage);

        // 3. 結算
        e.currentHp -= damage;
        p.currentNp += npGain;
        if(p.currentNp > 300) p.currentNp = 300; // NP上限

        // 4. 顯示特效與 Log
        const enemyCard = document.getElementById('enemy-card');
        enemyCard.classList.remove('hit-anim');
        void enemyCard.offsetWidth; // trigger reflow
        enemyCard.classList.add('hit-anim');

        let msg = `> 使用 ${cardType} 卡：造成 <span class="dmg-text">${damage}</span> 傷害`;
        msg += `，回收 NP <span class="np-text">${npGain.toFixed(2)}%</span>`;
        
        // 屬性相剋提示
        const aff = DB.CONSTANTS.class_affinity[p.class][e.class];
        if(aff > 1.0) msg += " (Weak!)";
        if(aff < 1.0) msg += " (Resist)";

        UI.log(msg);
        
        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> 敵方已被擊倒！");
        }

        UI.updateDisplay();
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

// 啟動初始化
window.onload = UI.init;
