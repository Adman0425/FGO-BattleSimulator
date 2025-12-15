const UserSave = {
    KEY: 'fgo_sim_party_v1',

    // 儲存隊伍 (Array of {id, level})
    saveParty: (partyData) => {
        localStorage.setItem(UserSave.KEY, JSON.stringify(partyData));
    },

    // 讀取隊伍
    loadParty: () => {
        const data = localStorage.getItem(UserSave.KEY);
        if (!data) return null;
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error("Save file corrupted", e);
            return null;
        }
    },

    // 預設隊伍 (如果沒存檔)
    getDefaultParty: () => {
        return [
            { servantIndex: 0, level: 'lv120' },
            { servantIndex: 1, level: 'lv120' },
            { servantIndex: 2, level: 'lv120' }
        ];
    }
};
