const UI = {
    gameState: {
        party: [], 
        enemy: null,
        deck: [],        // 剩餘牌庫 (Pool)
        currentHand: [], // 當前手牌 (5張)
        selectedCards: [],
        stars: 0,
        turnCount: 0     // 回合計數
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
            const stats = Engine.calculateStats(data, p.lv);
            return {
                ...data,
                currentStats: stats,
                currentHp: stats.hp,
                maxHp: stats.hp,
                currentNp: 0
            };
        });

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
        UI.gameState.turnCount = 0;
        
        // 初始化牌庫
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

    // 建立牌庫
    createFullDeck: () => {
        let fullDeck = [];
        UI.gameState.party.forEach((servant, sIndex) => {
            servant.cards.deck.forEach(cardType => {
                fullDeck.push({ type: cardType, ownerIndex: sIndex, ownerId: servant.id });
            });
        });
        UI.gameState.deck = UI.shuffleArray(fullDeck); // 洗牌後存入 gameState.deck
        UI.log(">> 牌庫已重置");
    },

    // 發牌邏輯
    dealCards: () => {
        if (UI.gameState.party.length === 0) return;

        // 如果牌庫不足 5 張，則視為新的一輪循環，重新洗牌
        if (UI.gameState.deck.length < 5) {
            UI.log(">> 牌庫洗牌 (Reshuffle)");
            UI.createFullDeck();
        }

        UI.gameState.turnCount++;
        UI.log(`[Turn ${UI.gameState.turnCount}] 發牌... (牌庫剩餘 ${UI.gameState.deck.length} 張)`);

        // 從牌庫頂端抽出 5 張
        UI.gameState.currentHand = UI.gameState.deck.splice(0, 5);
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
                attacker: UI.gameState.party[card.ownerIndex] 
            };
        });

        UI.closeCommandPhase();

        const isBusterChain = cardChain.every(c => c.type === 'Buster');
        const isArtsChain = cardChain.every(c => c.type === 'Arts');
        const isQuickChain = cardChain.every(c => c.type === 'Quick');
        const firstOwner = cardChain[0].attacker.id;
        const isBraveChain = cardChain.every(c => c.attacker.id === firstOwner);

        UI.log("=== Turn Start ===");
        if (isBusterChain) UI.log("【Buster Chain】Atk Up!");
        if (isArtsChain) { UI.log("【Arts Chain】Party NP +20%"); UI.gameState.party.forEach(p => p.currentNp += 20); }
        if (isQuickChain) { UI.log("【Quick Chain】Stars +10"); UI.gameState.stars += 10; }

        cardChain.forEach((card, i) => {
            const p = card.attacker;
            const dmg = Engine.calculateDamage(p, e, card.type, i, false, isBusterChain);
            const np = Engine.calculateNPGain(p, e, card.type, i, dmg);
            const star = Engine.calculateStarGen(p, e, card.type, i, false);

            e.currentHp -= dmg;
            p.currentNp += np;
            UI.gameState.stars += star;

            UI.log(`Card ${i+1} (${p.name}): Dmg <span class="dmg-text">${dmg}</span>, NP +${np}%, Star +${star}`);
        });

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

        if (e.currentHp <= 0) {
            e.currentHp = 0;
            UI.log(">> Enemy Defeated!");
        }
        UI.gameState.party.forEach(p => { if(p.currentNp > 300) p.currentNp = 300; });

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
            
            // NP 顯示為整數
            document.getElementById(`val-np-p${slot}`).innerText = Math.floor(p.currentNp);
            document.getElementById(`np-p${slot}`).style.width = `${Math.min(100, p.currentNp)}%`;
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
    }
};
