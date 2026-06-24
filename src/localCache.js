const DB_NAME = 'OMusicOffline';
const DB_VERSION = 1;
const STORE_NAME = 'songs';

let dbInstance = null;

const getDB = () => {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB failed to open: ' + event.target.error));
    };
  });
};

export const localCache = {
  // Download and cache a song by URL
  async cacheSong(songId, songUrl, progressCallback) {
    const db = await getDB();
    
    // Fetch audio data
    const response = await fetch(songUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio file from JioSaavn: ${response.statusText}`);
    }

    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore();
      
      const record = {
        id: songId,
        blob: blob,
        downloadedAt: Date.now()
      };

      const request = store.put(record);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to cache song in IndexedDB: ${event.target.error}`));
      };
    });
  },

  // Check if a song is currently cached
  async isCached(songId) {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(songId);

        request.onsuccess = (event) => {
          resolve(!!event.target.result);
        };

        request.onerror = () => {
          resolve(false);
        };
      });
    } catch (e) {
      console.warn('Offline cache check failed:', e);
      return false;
    }
  },

  // Get cached audio blob as a object URL for audio element playback
  async getCachedUrl(songId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(songId);

      request.onsuccess = (event) => {
        const record = event.target.result;
        if (record && record.blob) {
          const objectUrl = URL.createObjectURL(record.blob);
          resolve(objectUrl);
        } else {
          reject(new Error('Song not found in cache'));
        }
      };

      request.onerror = (event) => {
        reject(new Error(`Error reading from cache: ${event.target.error}`));
      };
    });
  },

  // Delete cached song
  async deleteSong(songId) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(songId);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to delete song: ${event.target.error}`));
      };
    });
  },

  // Clear entire cache
  async clearAll() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = (event) => {
        reject(new Error(`Failed to clear cache: ${event.target.error}`));
      };
    });
  }
};
