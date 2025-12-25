import { SaveData } from './types';

const SAVE_KEY = 'neon_rogue_v1';

const DEFAULT_SAVE: SaveData = {
  shards: 0,
  totalShardsEarned: 0,
  metaLevels: {},
  unlockedAchievements: [],
  highScore: 0,
  totalKills: 0
};

export const Persistence = {
  load: (): SaveData => {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (!data) return DEFAULT_SAVE;
      const parsed = JSON.parse(data);
      // Merge with default to ensure any new fields are present
      return { ...DEFAULT_SAVE, ...parsed };
    } catch (e) {
      console.error('Failed to load save', e);
      return DEFAULT_SAVE;
    }
  },

  save: (data: SaveData) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save', e);
    }
  },

  reset: () => {
    localStorage.removeItem(SAVE_KEY);
    return DEFAULT_SAVE;
  }
};