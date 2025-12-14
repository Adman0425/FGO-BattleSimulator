const DB = {
    CONSTANTS: null,
    SERVANTS: null,
    ENEMIES: null,
    QUESTS: null
};

const DataLoader = {
    // 讀取單個 JSON 檔案的輔助函式
    loadJSON: async (path) => {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e) {
            console.error(`無法讀取 ${path}:`, e);
            return null;
        }
    },

    // 一次讀取所有資料庫
    loadAll: async () => {
        console.log("正在載入遊戲數據...");
        
        // 平行讀取所有檔案
        const [constants, servants, enemies, quests] = await Promise.all([
            DataLoader.loadJSON('data/constants.json'),
            DataLoader.loadJSON('data/servants.json'),
            DataLoader.loadJSON('data/enemies.json'),
            DataLoader.loadJSON('data/quests.json')
        ]);

        DB.CONSTANTS = constants;
        DB.SERVANTS = servants;
        DB.ENEMIES = enemies;
        DB.QUESTS = quests;

        console.log("數據載入完成！", DB);
        return true;
    }
};
