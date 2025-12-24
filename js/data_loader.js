// 定義全域資料庫
window.DB = {
    SERVANTS: [],
    ENEMIES: [],
    QUESTS: [],
    CONSTANTS: {}
};

const DataLoader = {
    // 通用讀取函式 (含錯誤處理)
    loadJSON: async (path) => {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`讀取失敗: ${path}`, e);
            // 讀取失敗時回傳 null，讓 loadAll 決定怎麼處理
            return null;
        }
    },

    loadAll: async () => {
        console.log("正在載入資料庫...");
        
        // 平行讀取所有檔案
        const [s, e, q, c] = await Promise.all([
            DataLoader.loadJSON('data/servants.json'),
            DataLoader.loadJSON('data/enemies.json'),
            DataLoader.loadJSON('data/quests.json'),
            DataLoader.loadJSON('data/constants.json')
        ]);

        // 【關鍵修正】如果讀取失敗(null)，保持原本的空陣列 []，防止 UI 崩潰
        if (s) DB.SERVANTS = s;
        else console.warn("警告：servants.json 載入失敗或格式錯誤");

        if (e) DB.ENEMIES = e;
        else console.warn("警告：enemies.json 載入失敗或格式錯誤");

        if (q) DB.QUESTS = q;
        else console.warn("警告：quests.json 載入失敗或格式錯誤");

        if (c) DB.CONSTANTS = c;
        
        console.log("資料庫載入完成", DB);
    }
};
