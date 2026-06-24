import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  onValue, 
  off, 
  remove, 
  update, 
  onDisconnect 
} from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL
};

const realFirebaseConfigured = 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.startsWith('mock-') && 
  !firebaseConfig.apiKey.startsWith('your-');

// Check if keys are placeholders or not set, or if explicitly running in Demo Guest session
export const isMockFirebase = 
  !realFirebaseConfigured ||
  (typeof window !== 'undefined' && localStorage.getItem('OMusic_sessionMode') === 'mock');

let app = null;
let auth = null;
let db = null;
let rtdb = null;

if (realFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    console.log("Firebase initialized successfully in live production mode.");
  } catch (error) {
    console.error("Firebase init failed, switching to mock services:", error);
  }
} else {
  console.log("Firebase is running in Demo/Mock Mode. Playback & personalized states will be saved locally.");
}


// ----------------------------------------------------
// MULTI-TAB MOCK BROADCAST (For Jam Room Demo Mode)
// ----------------------------------------------------
const jamBroadcast = (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('OMusicJamRoomMock') : null;
const mockRoomsState = {};
const mockRoomListeners = {};

if (jamBroadcast) {
  jamBroadcast.onmessage = (event) => {
    const { type, roomCode, data } = event.data;
    if (type === 'ROOM_UPDATE') {
      mockRoomsState[roomCode] = data;
      if (mockRoomListeners[roomCode]) {
        mockRoomListeners[roomCode].forEach(cb => cb(data));
      }
    }
  };
}

// Helper to notify other tabs about mock room update
const broadcastMockRoomUpdate = (roomCode, data) => {
  if (jamBroadcast) {
    jamBroadcast.postMessage({ type: 'ROOM_UPDATE', roomCode, data });
  }
};

// ----------------------------------------------------
// AUTH SERVICE
// ----------------------------------------------------
const mockAuthListeners = new Set();
let currentMockUser = null;

// Hydrate mock user from localStorage on start
if (typeof window !== 'undefined') {
  const cached = localStorage.getItem('OMusic_mockUser');
  if (cached) {
    currentMockUser = JSON.parse(cached);
  }
}

export const AuthService = {
  async signInWithGoogle() {
    const realFirebaseConfigured = firebaseConfig.apiKey && 
                                   !firebaseConfig.apiKey.startsWith('mock-') && 
                                   !firebaseConfig.apiKey.startsWith('your-');

    if (realFirebaseConfigured && auth) {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Save/Sync user profile doc to Firestore
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        createdAt: serverTimestamp()
      }, { merge: true });

      localStorage.removeItem('OMusic_sessionMode');
      localStorage.removeItem('OMusic_mockUser');
      localStorage.setItem('OMusic_loginToast', 'true');
      window.location.reload();
      return result.user;
    } else {
      // Mock login implementation with personalized name prompt
      let name = null;
      if (typeof window !== 'undefined') {
        name = window.prompt("Enter your name to initialize your OMusic retro account:");
      }
      const displayName = name?.trim() || 'Demo Guest';
      const mockUser = {
        uid: 'mock_user_' + Math.random().toString(36).substr(2, 9),
        displayName,
        email: displayName.toLowerCase().replace(/\s+/g, '.') + '@omusic.com',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
        createdAt: Date.now()
      };
      currentMockUser = mockUser;
      localStorage.setItem('OMusic_sessionMode', 'mock');
      localStorage.setItem('OMusic_mockUser', JSON.stringify(mockUser));
      mockAuthListeners.forEach(cb => cb(mockUser));
      window.location.reload();
      return mockUser;
    }
  },

  async signOut() {
    if (!isMockFirebase && auth) {
      await fbSignOut(auth);
    } else {
      currentMockUser = null;
      localStorage.removeItem('OMusic_mockUser');
      mockAuthListeners.forEach(cb => cb(null));
    }
  },

  onAuthStateChange(callback) {
    if (!isMockFirebase && auth) {
      return onAuthStateChanged(auth, async (user) => {
        if (user) {
          callback(user);
        } else {
          callback(null);
        }
      });
    } else {
      mockAuthListeners.add(callback);
      // Immediately run callback with current state
      setTimeout(() => callback(currentMockUser), 50);
      return () => {
        mockAuthListeners.delete(callback);
      };
    }
  }
};

// ----------------------------------------------------
// USER DATA SERVICE
// ----------------------------------------------------
const getLocalStorageKey = (uid, subKey) => `OMusic_${uid}_${subKey}`;

export const UserDataService = {
  // LIKED SONGS
  async getLikedSongs(uid) {
    if (!isMockFirebase && db) {
      const colRef = collection(db, 'users', uid, 'liked_songs');
      const snap = await getDocs(colRef);
      return snap.docs.map(doc => doc.data());
    } else {
      const cached = localStorage.getItem(getLocalStorageKey(uid, 'liked_songs'));
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addLikedSong(uid, song) {
    // Standardize song details and fetch highest-quality image
    const songId = song.id;
    const songTitle = song.name || song.title;
    const primaryArtists = song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist';
    const image = song.image?.[2]?.url || song.image?.[1]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500';

    const payload = {
      id: songId,
      title: songTitle,
      primaryArtists,
      image,
      likedAt: !isMockFirebase ? serverTimestamp() : Date.now()
    };

    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'liked_songs', songId);
      await setDoc(docRef, payload);
    } else {
      const songs = await this.getLikedSongs(uid);
      if (!songs.some(s => s.id === songId)) {
        songs.push(payload);
        localStorage.setItem(getLocalStorageKey(uid, 'liked_songs'), JSON.stringify(songs));
      }
    }
    return payload;
  },

  async removeLikedSong(uid, songId) {
    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'liked_songs', songId);
      await deleteDoc(docRef);
    } else {
      const songs = await this.getLikedSongs(uid);
      const filtered = songs.filter(s => s.id !== songId);
      localStorage.setItem(getLocalStorageKey(uid, 'liked_songs'), JSON.stringify(filtered));
    }
  },

  // PLAYLISTS
  async getPlaylists(uid) {
    if (!isMockFirebase && db) {
      const colRef = collection(db, 'users', uid, 'playlists');
      const snap = await getDocs(colRef);
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const cached = localStorage.getItem(getLocalStorageKey(uid, 'playlists'));
      return cached ? JSON.parse(cached) : [];
    }
  },

  async createPlaylist(uid, name, songIds = []) {
    const playlistId = 'pl_' + Math.random().toString(36).substr(2, 9);
    const payload = {
      name,
      createdAt: !isMockFirebase ? serverTimestamp() : Date.now(),
      songIds
    };

    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'playlists', playlistId);
      await setDoc(docRef, payload);
    } else {
      const playlists = await this.getPlaylists(uid);
      playlists.push({ id: playlistId, ...payload });
      localStorage.setItem(getLocalStorageKey(uid, 'playlists'), JSON.stringify(playlists));
    }
    return { id: playlistId, ...payload };
  },

  async addSongToPlaylist(uid, playlistId, songId) {
    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'playlists', playlistId);
      await updateDoc(docRef, {
        songIds: arrayUnion(songId)
      });
    } else {
      const playlists = await this.getPlaylists(uid);
      const pl = playlists.find(p => p.id === playlistId);
      if (pl && !pl.songIds.includes(songId)) {
        pl.songIds.push(songId);
        localStorage.setItem(getLocalStorageKey(uid, 'playlists'), JSON.stringify(playlists));
      }
    }
  },

  async removeSongFromPlaylist(uid, playlistId, songId) {
    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'playlists', playlistId);
      await updateDoc(docRef, {
        songIds: arrayRemove(songId)
      });
    } else {
      const playlists = await this.getPlaylists(uid);
      const pl = playlists.find(p => p.id === playlistId);
      if (pl) {
        pl.songIds = pl.songIds.filter(id => id !== songId);
        localStorage.setItem(getLocalStorageKey(uid, 'playlists'), JSON.stringify(playlists));
      }
    }
  },

  async deletePlaylist(uid, playlistId) {
    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'playlists', playlistId);
      await deleteDoc(docRef);
    } else {
      const playlists = await this.getPlaylists(uid);
      const filtered = playlists.filter(p => p.id !== playlistId);
      localStorage.setItem(getLocalStorageKey(uid, 'playlists'), JSON.stringify(filtered));
    }
  },

  // DOWNLOADED SONGS
  async getDownloadedSongs(uid) {
    if (!isMockFirebase && db) {
      const colRef = collection(db, 'users', uid, 'downloaded_songs');
      const snap = await getDocs(colRef);
      return snap.docs.map(doc => doc.data());
    } else {
      const cached = localStorage.getItem(getLocalStorageKey(uid, 'downloaded_songs'));
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addDownloadedSong(uid, songId, title, localPath) {
    const payload = {
      id: songId,
      title,
      localPath,
      downloadedAt: !isMockFirebase ? serverTimestamp() : Date.now()
    };

    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'downloaded_songs', songId);
      await setDoc(docRef, payload);
    } else {
      const downloaded = await this.getDownloadedSongs(uid);
      const existingIdx = downloaded.findIndex(s => s.id === songId);
      if (existingIdx > -1) {
        downloaded[existingIdx] = payload;
      } else {
        downloaded.push(payload);
      }
      localStorage.setItem(getLocalStorageKey(uid, 'downloaded_songs'), JSON.stringify(downloaded));
    }
    return payload;
  },

  async removeDownloadedSong(uid, songId) {
    if (!isMockFirebase && db) {
      const docRef = doc(db, 'users', uid, 'downloaded_songs', songId);
      await deleteDoc(docRef);
    } else {
      const downloaded = await this.getDownloadedSongs(uid);
      const filtered = downloaded.filter(s => s.id !== songId);
      localStorage.setItem(getLocalStorageKey(uid, 'downloaded_songs'), JSON.stringify(filtered));
    }
  }
};

// ----------------------------------------------------
// JAM ROOM SERVICE (Synchronized Playback via RTDB)
// ----------------------------------------------------
export const JamRoomService = {
  // Generate random 6 character code, check collision
  async generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Attempt code generation
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    if (!isMockFirebase && rtdb) {
      const roomRef = ref(rtdb, `rooms/${code}`);
      const snap = await get(roomRef);
      if (snap.exists()) {
        return this.generateRoomCode(); // Recursive collision check
      }
      return code;
    } else {
      if (mockRoomsState[code]) {
        return this.generateRoomCode();
      }
      return code;
    }
  },

  // Create room
  async createRoom(hostUser, roomCode, initialSong) {
    const roomPayload = {
      hostUid: hostUser.uid,
      createdAt: Date.now(),
      currentSong: initialSong ? {
        id: initialSong.id,
        title: initialSong.name || initialSong.title,
        primaryArtists: initialSong.artists?.primary?.[0]?.name || initialSong.artist || 'Unknown Artist',
        image: initialSong.image?.[2]?.url || initialSong.image?.[1]?.url || initialSong.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
        downloadUrl: initialSong.audioUrl || initialSong.downloadUrl?.[4]?.url || initialSong.downloadUrl?.[0]?.url || ''
      } : null,
      playbackState: {
        isPlaying: false,
        positionMs: 0,
        updatedAt: Date.now()
      },
      participants: {
        [hostUser.uid]: {
          displayName: hostUser.displayName || 'Anonymous Host',
          photoURL: hostUser.photoURL || '',
          joinedAt: Date.now()
        }
      }
    };

    if (!isMockFirebase && rtdb) {
      const roomRef = ref(rtdb, `rooms/${roomCode}`);
      await set(roomRef, roomPayload);

      // Handle self deletion / disconnect removals
      const participantRef = ref(rtdb, `rooms/${roomCode}/participants/${hostUser.uid}`);
      onDisconnect(participantRef).remove();
    } else {
      mockRoomsState[roomCode] = roomPayload;
      broadcastMockRoomUpdate(roomCode, roomPayload);
    }

    return roomPayload;
  },

  // Join Room
  async joinRoom(user, roomCode) {
    const participantData = {
      displayName: user.displayName || 'Listener',
      photoURL: user.photoURL || '',
      joinedAt: Date.now()
    };

    if (!isMockFirebase && rtdb) {
      const roomRef = ref(rtdb, `rooms/${roomCode}`);
      const snap = await get(roomRef);
      if (!snap.exists()) {
        throw new Error('Room not found! Double check the code.');
      }

      const participantRef = ref(rtdb, `rooms/${roomCode}/participants/${user.uid}`);
      await set(participantRef, participantData);
      onDisconnect(participantRef).remove();

      const updatedSnap = await get(roomRef);
      return updatedSnap.val();
    } else {
      const room = mockRoomsState[roomCode];
      if (!room) {
        throw new Error('Room not found! Double check the code.');
      }
      room.participants[user.uid] = participantData;
      broadcastMockRoomUpdate(roomCode, room);
      if (mockRoomListeners[roomCode]) {
        mockRoomListeners[roomCode].forEach(cb => cb(room));
      }
      return room;
    }
  },

  // Listen to room updates
  listenToRoom(roomCode, onUpdate) {
    if (!isMockFirebase && rtdb) {
      const roomRef = ref(rtdb, `rooms/${roomCode}`);
      const callback = (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.val());
        } else {
          onUpdate(null);
        }
      };
      onValue(roomRef, callback);
      return () => off(roomRef, 'value', callback);
    } else {
      if (!mockRoomListeners[roomCode]) {
        mockRoomListeners[roomCode] = new Set();
      }
      mockRoomListeners[roomCode].add(onUpdate);

      // Send current state
      setTimeout(() => {
        if (mockRoomsState[roomCode]) {
          onUpdate(mockRoomsState[roomCode]);
        } else {
          onUpdate(null);
        }
      }, 50);

      return () => {
        mockRoomListeners[roomCode].delete(onUpdate);
      };
    }
  },

  // Update Playback State (Host only)
  async updatePlaybackState(roomCode, isPlaying, positionMs) {
    const playbackState = {
      isPlaying,
      positionMs,
      updatedAt: Date.now()
    };

    if (!isMockFirebase && rtdb) {
      const playStateRef = ref(rtdb, `rooms/${roomCode}/playbackState`);
      await set(playStateRef, playbackState);
    } else {
      const room = mockRoomsState[roomCode];
      if (room) {
        room.playbackState = playbackState;
        broadcastMockRoomUpdate(roomCode, room);
        if (mockRoomListeners[roomCode]) {
          mockRoomListeners[roomCode].forEach(cb => cb(room));
        }
      }
    }
  },

  // Update song details (Host only)
  async updateSong(roomCode, song) {
    const currentSong = {
      id: song.id,
      title: song.name || song.title,
      primaryArtists: song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist',
      image: song.image?.[2]?.url || song.image?.[1]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
      downloadUrl: song.audioUrl || song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || '',
      hasLyrics: song.hasLyrics || false,
      lyricsId: song.lyricsId || null,
      artists: song.artists || null
    };

    if (!isMockFirebase && rtdb) {
      const roomRef = ref(rtdb, `rooms/${roomCode}`);
      await update(roomRef, {
        currentSong,
        'playbackState/positionMs': 0,
        'playbackState/isPlaying': true,
        'playbackState/updatedAt': Date.now()
      });
    } else {
      const room = mockRoomsState[roomCode];
      if (room) {
        room.currentSong = currentSong;
        room.playbackState = {
          isPlaying: true,
          positionMs: 0,
          updatedAt: Date.now()
        };
        broadcastMockRoomUpdate(roomCode, room);
        if (mockRoomListeners[roomCode]) {
          mockRoomListeners[roomCode].forEach(cb => cb(room));
        }
      }
    }
  },

  // Leave room manually
  async leaveRoom(user, roomCode) {
    if (!isMockFirebase && rtdb) {
      const participantRef = ref(rtdb, `rooms/${roomCode}/participants/${user.uid}`);
      await remove(participantRef);

      // Perform a check to promote host or delete
      const roomRef = ref(rtdb, `rooms/${roomCode}`);
      const snap = await get(roomRef);
      if (snap.exists()) {
        const room = snap.val();
        if (room.hostUid === user.uid) {
          await this.promoteNextParticipant(roomCode, room);
        }
      }
    } else {
      const room = mockRoomsState[roomCode];
      if (room) {
        delete room.participants[user.uid];
        if (room.hostUid === user.uid) {
          await this.promoteNextParticipant(roomCode, room);
        } else {
          broadcastMockRoomUpdate(roomCode, room);
          if (mockRoomListeners[roomCode]) {
            mockRoomListeners[roomCode].forEach(cb => cb(room));
          }
        }
      }
    }
  },

  // Internal helper to promote another participant to host if host leaves
  async promoteNextParticipant(roomCode, room) {
    const participantsList = Object.entries(room.participants || {});
    if (participantsList.length === 0) {
      // No one left, delete the room
      if (!isMockFirebase && rtdb) {
        await remove(ref(rtdb, `rooms/${roomCode}`));
      } else {
        delete mockRoomsState[roomCode];
        broadcastMockRoomUpdate(roomCode, null);
        if (mockRoomListeners[roomCode]) {
          mockRoomListeners[roomCode].forEach(cb => cb(null));
        }
      }
      return;
    }

    // Sort by joinedAt to find earliest-joined member
    participantsList.sort((a, b) => a[1].joinedAt - b[1].joinedAt);
    const [nextHostUid] = participantsList[0];

    if (!isMockFirebase && rtdb) {
      await update(ref(rtdb, `rooms/${roomCode}`), { hostUid: nextHostUid });
    } else {
      room.hostUid = nextHostUid;
      broadcastMockRoomUpdate(roomCode, room);
      if (mockRoomListeners[roomCode]) {
        mockRoomListeners[roomCode].forEach(cb => cb(room));
      }
    }
  }
};
