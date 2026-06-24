import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Search, Heart, 
  MoreHorizontal, Bell, Home, Compass, Radio, Mic, Music, User, 
  Trash2, Volume2, VolumeX, ChevronLeft, ChevronRight, Share2, 
  Download, ListMusic, Flame, Award, Globe, Sparkles, CheckCircle2,
  FolderOpen, AlertCircle, Users, Copy, Check, LogOut, Loader2, Info
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { QRCodeSVG } from 'qrcode.react';

// Services
import { 
  AuthService, 
  UserDataService, 
  JamRoomService, 
  isMockFirebase 
} from './firebase';
import { localCache } from './localCache';
import { lyricsService } from './lyricsService';
import { ClientVocalRemover } from './vocalRemover';

// Fallback songs to ensure the app is fully functional even if the external API is offline or rate-limited.
const FALLBACK_SONGS = [
  {
    id: "apna_bana_le",
    name: "Apna Bana Le",
    artists: { primary: [{ name: "Arijit Singh" }] },
    duration: 261,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
    ]
  },
  {
    id: "midnight_vibes",
    name: "Midnight Vibes",
    artists: { primary: [{ name: "Sachin-Jigar & Arijit Singh" }] },
    duration: 320,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" }
    ]
  },
  {
    id: "summer_chill",
    name: "Summer Chill",
    artists: { primary: [{ name: "Lofi Beats Collective" }] },
    duration: 280,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" }
    ]
  },
  {
    id: "focus_drive",
    name: "Focus Drive",
    artists: { primary: [{ name: "Electronic Mind" }] },
    duration: 300,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" }
    ]
  }
];

// Helper to draw pseudorandom bars based on seed
const generateBars = (seed) => {
  const bars = [];
  let r = seed;
  for (let i = 0; i < 60; i++) {
    r = (r * 1664525 + 1013904223) & 0xffffffff;
    bars.push(8 + (Math.abs(r) % 24));
  }
  return bars;
};

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const CATEGORIES = ['Classic', '90s', 'New', 'Instrumental', 'Modern'];
const CATEGORY_QUERIES = {
  'Classic': 'classic hindi',
  '90s': '90s hits',
  'New': 'new releases',
  'Instrumental': 'instrumental',
  'Modern': 'modern pop'
};

export default function App() {
  // Navigation states
  const [selectedNav, setSelectedNav] = useState('Home'); // 'Home' | 'Search' | 'Favorites' | 'Songs' | 'JamRoom' | 'Profile'
  const [activeCategory, setActiveCategory] = useState('Classic');
  const [profileTab, setProfileTab] = useState('liked'); // 'liked' | 'playlists' | 'downloads'

  // Search states
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Authentication states
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Network Offline state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Library states
  const [likedSongs, setLikedSongs] = useState(new Set());
  const [likedSongsData, setLikedSongsData] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);

  // Audio Playback states
  const [songs, setSongs] = useState(FALLBACK_SONGS);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Queue indexing
  const [queue, setQueue] = useState(FALLBACK_SONGS);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Audio configuration settings
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'one' | 'all'
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompressed, setIsCompressed] = useState(false);
  const [audioQuality, setAudioQuality] = useState('high'); // 'high' | 'standard'

  // Jam Room states
  const [isInJamRoom, setIsInJamRoom] = useState(false);
  const [jamRoomCode, setJamRoomCode] = useState('');
  const [jamJoinCode, setJamJoinCode] = useState('');
  const [jamRoomData, setJamRoomData] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Tune Mode (AI Vocal separation) states
  const [tuneModeActive, setTuneModeActive] = useState(false);
  const [tuneModeLoading, setTuneModeLoading] = useState(false);
  const [instrumentalCache, setInstrumentalCache] = useState({}); // songId -> URL

  // Timed Lyrics states
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsLines, setLyricsLines] = useState([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsActiveIndex, setLyricsActiveIndex] = useState(-1);

  // Downloads states
  const [downloadingSongs, setDownloadingSongs] = useState({}); // songId -> boolean
  const [downloadedSongsList, setDownloadedSongsList] = useState([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeMenuSongId, setActiveMenuSongId] = useState(null);
  const [showInbox, setShowInbox] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);
  const vocalRemoverRef = useRef(null);

  // Helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // ----------------------------------------------------
  // OFFLINE & ONLINE DETECTOR / SYNCRONIZATION
  // ----------------------------------------------------
  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      addToast("Network returned. Cloud syncing active.", "success");
      syncOfflineData();
    };
    const goOffline = () => {
      setIsOffline(true);
      addToast("Network offline. Running from browser cache.", "warning");
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [currentUser]);

  const syncOfflineData = async () => {
    if (!currentUser || isMockFirebase) return;
    try {
      const localLikes = localStorage.getItem(`OMusic_${currentUser.uid}_liked_songs`);
      if (localLikes) {
        const likedList = JSON.parse(localLikes);
        for (const song of likedList) {
          await UserDataService.addLikedSong(currentUser.uid, song);
        }
      }
      const localPlaylists = localStorage.getItem(`OMusic_${currentUser.uid}_playlists`);
      if (localPlaylists) {
        const playlists = JSON.parse(localPlaylists);
        for (const pl of playlists) {
          await UserDataService.createPlaylist(currentUser.uid, pl.name, pl.songIds);
        }
      }
      const likes = await UserDataService.getLikedSongs(currentUser.uid);
      const playlistList = await UserDataService.getPlaylists(currentUser.uid);
      setLikedSongs(new Set(likes.map(s => s.id)));
      setLikedSongsData(likes);
      setPlaylists(playlistList);
      addToast("Offline data synched to Firestore!", "success");
    } catch (e) {
      console.warn(e);
    }
  };

  // ----------------------------------------------------
  // AUTH HYDRATION
  // ----------------------------------------------------
  useEffect(() => {
    const unsub = AuthService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
      
      if (user) {
        try {
          let likes = await UserDataService.getLikedSongs(user.uid);
          if (!Array.isArray(likes)) likes = [];
          likes = likes.filter(s => s && typeof s === 'object' && s.id);

          let playlistList = await UserDataService.getPlaylists(user.uid);
          if (!Array.isArray(playlistList)) playlistList = [];
          playlistList = playlistList.filter(p => p && typeof p === 'object' && p.id);

          let downloads = await UserDataService.getDownloadedSongs(user.uid);
          if (!Array.isArray(downloads)) downloads = [];
          downloads = downloads.filter(d => d && typeof d === 'object' && d.id);
          
          setLikedSongs(new Set(likes.map(s => s.id)));
          setLikedSongsData(likes);
          setPlaylists(playlistList);
          setDownloadedSongsList(downloads);
        } catch (err) {
          console.error("Hydration error:", err);
        }
      } else {
        setLikedSongs(new Set());
        setLikedSongsData([]);
        setPlaylists([]);
        setDownloadedSongsList([]);
      }
    });
    return () => unsub();
  }, []);

  // ----------------------------------------------------
  // LAZY AUDIO REMOVER NODE INITIALIZER
  // ----------------------------------------------------
  useEffect(() => {
    if (audioRef.current && !vocalRemoverRef.current) {
      vocalRemoverRef.current = new ClientVocalRemover(audioRef.current);
    }
  }, [audioRef.current]);

  // ----------------------------------------------------
  // SEARCH DEBOUNCING
  // ----------------------------------------------------
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchVal]);

  // ----------------------------------------------------
  // API SEARCH CALLS
  // ----------------------------------------------------
  useEffect(() => {
    const term = searchQuery.trim() || CATEGORY_QUERIES[activeCategory] || 'trending';
    const fetchSongs = async () => {
      setIsLoading(true);
      try {
        const url = `https://jiosavnapi-production.up.railway.app/api/search/songs?query=${encodeURIComponent(term)}&limit=10`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.success && data.data && data.data.results && data.data.results.length > 0) {
          const apiSongs = data.data.results;
          setSongs(apiSongs);
          setQueue(apiSongs);
          if (!currentSong && !isInJamRoom) {
            loadSongAtIndex(apiSongs, 0, false);
          }
        } else {
          setSongs(FALLBACK_SONGS);
          setQueue(FALLBACK_SONGS);
        }
      } catch (err) {
        console.warn("Using fallback songs due to API offline:", err);
        setSongs(FALLBACK_SONGS);
        setQueue(FALLBACK_SONGS);
        if (!currentSong && !isInJamRoom) {
          loadSongAtIndex(FALLBACK_SONGS, 0, false);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSongs();
  }, [searchQuery, activeCategory]);

  // ----------------------------------------------------
  // AUDIO CONTROLS & STATE SYNC
  // ----------------------------------------------------
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio playback prevented by browser:", err);
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      // Dynamic compression / volume headroom damping (15% headroom or dynamic compression scale down)
      const targetVolume = isCompressed ? volume * 0.5 : volume;
      audioRef.current.volume = isMuted ? 0 : targetVolume;
    }
  }, [volume, isMuted, isCompressed]);

  // ----------------------------------------------------
  // WAVEFORM CANVAS DRAWING LOOP
  // ----------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 320, 40);
    const bars = generateBars(currentIndex + 1);
    const progress = duration > 0 ? currentTime / duration : 0;
    const playheadX = Math.floor(progress * 320);

    bars.forEach((h, i) => {
      const x = (i / 60) * 320;
      ctx.fillStyle = x < playheadX ? '#111111' : '#CCCCCC';
      ctx.fillRect(x, (40 - h) / 2, 4, h);
    });

    // Red active needle line
    ctx.fillStyle = '#CC0000';
    ctx.fillRect(playheadX, 0, 2, 40);
  }, [currentTime, duration, currentIndex, currentSong?.id]);

  const handleCanvasClick = (e) => {
    if (!duration || !audioRef.current) return;
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can seek tracks", "warning");
        return;
      }
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = clickX / rect.width;
    const targetSecs = pct * duration;
    
    audioRef.current.currentTime = targetSecs;
    setCurrentTime(targetSecs);
    handleHostPlaybackUpdate(isPlaying, targetSecs);
  };

  // ----------------------------------------------------
  // LYRICS ENGINE (TIMED SYNC)
  // ----------------------------------------------------
  useEffect(() => {
    if (!currentSong) {
      setLyricsLines([]);
      setLyricsSynced(false);
      return;
    }

    const loadLyrics = async () => {
      setLyricsLoading(true);
      setLyricsLines([]);
      setLyricsSynced(false);
      
      try {
        const songDetails = queue[currentIndex] || currentSong;
        const dur = songDetails.duration || duration || 0;
        const hasLyrics = songDetails.hasLyrics || currentSong.hasLyrics || false;
        const lyricsId = songDetails.lyricsId || currentSong.lyricsId || null;
        const artists = songDetails.artists || currentSong.artists || null;
        
        const res = await lyricsService.fetchLyrics(
          currentSong.id,
          currentSong.name,
          currentSong.artist,
          dur,
          hasLyrics,
          lyricsId,
          artists
        );

        if (res.error) {
          setLyricsLines([]);
          setLyricsSynced(false);
        } else {
          setLyricsLines(res.lines);
          setLyricsSynced(res.synced);
        }
      } catch (err) {
        console.log("Lyrics failed to load:", err.message);
        setLyricsLines([]);
        setLyricsSynced(false);
      } finally {
        setLyricsLoading(false);
      }
    };
    loadLyrics();
  }, [currentSong?.id]);

  useEffect(() => {
    if (!lyricsSynced || lyricsLines.length === 0) return;

    const currentMs = currentTime * 1000;
    let activeIdx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (lyricsLines[i].timeMs <= currentMs) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== lyricsActiveIndex) {
      setLyricsActiveIndex(activeIdx);
      if (activeIdx !== -1) {
        const el = document.getElementById(`lyric-line-${activeIdx}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, lyricsSynced, lyricsLines, lyricsActiveIndex]);

  // ----------------------------------------------------
  // JAM ROOM BACKEND SYNC LOOP
  // ----------------------------------------------------
  useEffect(() => {
    if (!isInJamRoom || !jamRoomCode) return;

    const isHost = jamRoomData && currentUser && jamRoomData.hostUid === currentUser.uid;

    const unsub = JamRoomService.listenToRoom(jamRoomCode, (room) => {
      if (!room) {
        addToast("Jam Room ended by host", "info");
        exitJamRoom();
        return;
      }

      setJamRoomData(room);

      if (!isHost) {
        if (room.currentSong) {
          const song = room.currentSong;
          if (currentSong?.id !== song.id) {
            setCurrentSong({
              id: song.id,
              name: song.title,
              artist: song.primaryArtists,
              image: song.image,
              audioUrl: song.downloadUrl,
              hasLyrics: song.hasLyrics || false,
              lyricsId: song.lyricsId || null,
              artists: song.artists || null
            });
            if (tuneModeActive) {
              if (vocalRemoverRef.current) vocalRemoverRef.current.setTuneMode(false);
              setTuneModeActive(false);
            }
          }
        }

        if (room.playbackState) {
          const pbState = room.playbackState;
          if (pbState.isPlaying !== isPlaying) {
            setIsPlaying(pbState.isPlaying);
          }

          if (audioRef.current) {
            let targetSec = pbState.positionMs / 1000;
            if (pbState.isPlaying) {
              const latency = (Date.now() - pbState.updatedAt) / 1000;
              targetSec += latency;
            }

            const offset = Math.abs(audioRef.current.currentTime - targetSec);
            if (offset > 1.5) {
              audioRef.current.currentTime = targetSec;
            }
          }
        }
      }
    });

    return () => unsub();
  }, [isInJamRoom, jamRoomCode, jamRoomData?.hostUid, isPlaying, currentSong?.id]);

  // Periodic position updates sent by host
  useEffect(() => {
    if (!isInJamRoom || !jamRoomData || !currentUser) return;
    const isHost = jamRoomData.hostUid === currentUser.uid;
    if (!isHost || !isPlaying) return;

    const interval = setInterval(() => {
      if (audioRef.current) {
        JamRoomService.updatePlaybackState(
          jamRoomCode, 
          true, 
          audioRef.current.currentTime * 1000
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isInJamRoom, jamRoomCode, jamRoomData?.hostUid, isPlaying]);

  const handleHostPlaybackUpdate = (playingVal, secs) => {
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (isHost) {
        JamRoomService.updatePlaybackState(jamRoomCode, playingVal, secs * 1000);
      }
    }
  };

  // ----------------------------------------------------
  // INTERACTIVE WORKFLOW HANDLERS
  // ----------------------------------------------------
  const loadSongAtIndex = async (songList, index, autoPlay = true) => {
    if (!songList || songList.length === 0) return;
    const targetIdx = (index + songList.length) % songList.length;
    let song = songList[targetIdx];
    
    if (tuneModeActive) {
      if (vocalRemoverRef.current) {
        vocalRemoverRef.current.setTuneMode(false);
      }
      setTuneModeActive(false);
    }

    // Resolve audio url dynamically if missing (e.g. liked songs, or expired CDN URLs)
    const hasAudio = song.audioUrl || (song.downloadUrl && song.downloadUrl.length > 0);
    if (!hasAudio && song.id) {
      try {
        const res = await fetch(`https://jiosavnapi-production.up.railway.app/api/songs/${song.id}`);
        const json = await res.json();
        const apiSong = json.data?.[0] || json.data?.results?.[0];
        if (apiSong) {
          song = {
            ...song,
            ...apiSong,
            name: apiSong.name || apiSong.title,
            artist: apiSong.artists?.primary?.[0]?.name || apiSong.artist || 'Unknown Artist'
          };
          // Cache the resolved URL back in the queue list
          songList[targetIdx] = song;
        }
      } catch (err) {
        console.warn("Failed resolving song details in loadSongAtIndex:", err);
      }
    }

    const payloadUrl = audioQuality === 'high' 
      ? song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || song.audioUrl || ''
      : song.downloadUrl?.[2]?.url || song.downloadUrl?.[0]?.url || song.audioUrl || '';
    
    setCurrentSong({
      id: song.id,
      name: song.name || song.title,
      artist: song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist',
      image: song.image?.[2]?.url || song.image?.[1]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
      audioUrl: payloadUrl,
      hasLyrics: song.hasLyrics || false,
      lyricsId: song.lyricsId || null,
      artists: song.artists || null
    });
    
    setCurrentIndex(targetIdx);
    setIsPlaying(autoPlay);
  };

  const handlePlaySong = async (song, idx, customList = null) => {
    const activeList = customList || songs;
    const normalizedList = activeList.map(s => ({
      ...s,
      name: s.name || s.title,
      artist: s.artists?.primary?.[0]?.name || s.artist || s.primaryArtists || 'Unknown Artist'
    }));

    let targetSong = normalizedList[idx] || song;

    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can change tracks in a Jam Room", "warning");
        return;
      } else {
        addToast("Syncing track to Jam Room...", "info");
        try {
          const res = await fetch(`https://jiosavnapi-production.up.railway.app/api/songs/${song.id}`);
          const json = await res.json();
          const fetchedSong = json.data?.[0] || json.data?.results?.[0] || targetSong;
          const downloadUrl = audioQuality === 'high'
            ? fetchedSong.downloadUrl?.[4]?.url || fetchedSong.downloadUrl?.[0]?.url || targetSong.audioUrl || ''
            : fetchedSong.downloadUrl?.[2]?.url || fetchedSong.downloadUrl?.[0]?.url || targetSong.audioUrl || '';
          
          const payload = {
            id: targetSong.id,
            name: fetchedSong.name || fetchedSong.title || targetSong.name,
            artist: fetchedSong.artists?.primary?.[0]?.name || fetchedSong.artist || targetSong.artist || 'Unknown Artist',
            image: fetchedSong.image?.[2]?.url || fetchedSong.image?.[1]?.url || fetchedSong.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
            audioUrl: downloadUrl,
            hasLyrics: fetchedSong.hasLyrics || targetSong.hasLyrics || false,
            lyricsId: fetchedSong.lyricsId || targetSong.lyricsId || null,
            artists: fetchedSong.artists || targetSong.artists || null
          };
          
          await JamRoomService.updateSong(jamRoomCode, payload);
          setCurrentSong(payload);
          setIsPlaying(true);
        } catch (e) {
          console.warn("Failed resolving track, playing standard:", e);
          await JamRoomService.updateSong(jamRoomCode, targetSong);
          await loadSongAtIndex(normalizedList, idx, true);
        }
        return;
      }
    }

    setQueue(normalizedList);
    await loadSongAtIndex(normalizedList, idx, true);
    addToast(`Playing: ${targetSong.name || targetSong.title}`, 'success');
  };

  const togglePlay = () => {
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can pause/play playback", "warning");
        return;
      }
    }

    if (!currentSong && songs.length > 0) {
      loadSongAtIndex(songs, 0, true);
    } else {
      const targetState = !isPlaying;
      setIsPlaying(targetState);
      handleHostPlaybackUpdate(targetState, audioRef.current?.currentTime || 0);
    }
  };

  const handleNext = () => {
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can skip tracks", "warning");
        return;
      }
    }

    if (queue.length === 0) return;
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      loadSongAtIndex(queue, randomIndex, true);
    } else {
      loadSongAtIndex(queue, currentIndex + 1, true);
    }
  };

  const handleAudioEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.warn(err));
      }
    } else if (repeat === 'all' && currentIndex === queue.length - 1) {
      loadSongAtIndex(queue, 0, true);
    } else {
      handleNext();
    }
  };

  const handlePrev = () => {
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can rewind tracks", "warning");
        return;
      }
    }

    if (queue.length === 0) return;
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        handleHostPlaybackUpdate(isPlaying, 0);
      }
    } else {
      loadSongAtIndex(queue, currentIndex - 1, true);
    }
  };

  const toggleQuality = () => {
    const nextQuality = audioQuality === 'high' ? 'standard' : 'high';
    setAudioQuality(nextQuality);
    addToast(nextQuality === 'high' ? 'Switched to HQ (320kbps)' : 'Switched to Standard (160kbps)', 'info');
    
    if (currentSong && audioRef.current) {
      const wasPlaying = isPlaying;
      const time = audioRef.current.currentTime;
      const originalSong = queue[currentIndex] || currentSong;
      const nextUrl = nextQuality === 'high' 
        ? originalSong.downloadUrl?.[4]?.url || originalSong.downloadUrl?.[0]?.url || originalSong.audioUrl || ''
        : originalSong.downloadUrl?.[2]?.url || originalSong.downloadUrl?.[0]?.url || originalSong.audioUrl || '';
      
      setCurrentSong(prev => ({ ...prev, audioUrl: nextUrl }));
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (wasPlaying) audioRef.current.play();
        }
      }, 100);
    }
  };

  // ----------------------------------------------------
  // FIREBASE USER DATA OPERATIONS
  // ----------------------------------------------------
  const toggleLikeSong = async (songId, songName) => {
    if (!currentUser) {
      addToast("Please log in to like songs!", "warning");
      return;
    }

    const isLiked = likedSongs.has(songId);
    try {
      if (isLiked) {
        await UserDataService.removeLikedSong(currentUser.uid, songId);
        setLikedSongs(prev => {
          const next = new Set(prev);
          next.delete(songId);
          return next;
        });
        setLikedSongsData(prev => prev.filter(s => s.id !== songId));
        addToast(`Removed from Favorites`, 'trash');
      } else {
        const fullSong = songs.find(s => s.id === songId) || queue.find(s => s.id === songId) || currentSong;
        const saved = await UserDataService.addLikedSong(currentUser.uid, fullSong);
        setLikedSongs(prev => {
          const next = new Set(prev);
          next.add(songId);
          return next;
        });
        setLikedSongsData(prev => [...prev, saved]);
        addToast(`Added to Favorites`, 'heart');
      }
    } catch (e) {
      addToast("Sync error updating favorites.", "warning");
    }
  };

  const handleCreatePlaylist = async () => {
    if (!currentUser || !newPlaylistName.trim()) return;
    try {
      const pl = await UserDataService.createPlaylist(currentUser.uid, newPlaylistName.trim());
      setPlaylists(prev => [...prev, pl]);
      setNewPlaylistName('');
      setShowCreatePlaylistModal(false);
      addToast(`Playlist "${pl.name}" created!`, "success");
    } catch (e) {
      addToast("Failed to create playlist", "warning");
    }
  };

  const handleDeletePlaylist = async (e, playlistId, playlistName) => {
    e.stopPropagation();
    if (!currentUser) return;
    try {
      await UserDataService.deletePlaylist(currentUser.uid, playlistId);
      setPlaylists(prev => prev.filter(p => p.id !== playlistId));
      addToast(`Playlist "${playlistName}" removed`, 'trash');
    } catch (err) {
      addToast("Failed to delete playlist", "warning");
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId, songName) => {
    if (!currentUser) return;
    try {
      await UserDataService.addSongToPlaylist(currentUser.uid, playlistId, songId);
      const updated = await UserDataService.getPlaylists(currentUser.uid);
      setPlaylists(updated);
      addToast(`Added to playlist!`, 'success');
      setActiveMenuSongId(null);
    } catch (err) {
      addToast("Failed to add track to playlist", "warning");
    }
  };

  // ----------------------------------------------------
  // DOWNLOADS (IndexedDB Cache + Firestore sync)
  // ----------------------------------------------------
  const handleDownloadTrack = async (song) => {
    if (!currentUser) {
      addToast("Please login to download tracks!", "warning");
      return;
    }

    const songId = song.id;
    const downloadUrl = song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || song.audioUrl;

    if (!downloadUrl) {
      addToast("Playback URL missing.", "warning");
      return;
    }

    setDownloadingSongs(prev => ({ ...prev, [songId]: true }));
    addToast(`Downloading: "${song.name || song.title}"...`, "info");

    try {
      await localCache.cacheSong(songId, downloadUrl);
      const virtualPath = `indexeddb://songs/${songId}`;
      await UserDataService.addDownloadedSong(currentUser.uid, songId, song.name || song.title, virtualPath);
      
      const downloads = await UserDataService.getDownloadedSongs(currentUser.uid);
      setDownloadedSongsList(downloads);
      
      addToast(`Downloaded "${song.name || song.title}" for offline playback!`, "success");
    } catch (err) {
      console.error(err);
      addToast("Download failed.", "warning");
    } finally {
      setDownloadingSongs(prev => ({ ...prev, [songId]: false }));
      setActiveMenuSongId(null);
    }
  };

  const handlePlayDownloadedSong = async (songId, title) => {
    try {
      const cachedUrl = await localCache.getCachedUrl(songId);
      setCurrentSong({
        id: songId,
        name: title,
        artist: 'Offline Download',
        image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200',
        audioUrl: cachedUrl
      });
      setIsPlaying(true);
      addToast(`Playing offline track: ${title}`, "success");
    } catch (err) {
      console.error(err);
      addToast("Cached file missing or deleted.", "warning");
    }
  };

  const handleDeleteDownloadedSong = async (songId, title) => {
    if (!currentUser) return;
    try {
      await localCache.deleteSong(songId);
      await UserDataService.removeDownloadedSong(currentUser.uid, songId);
      const downloads = await UserDataService.getDownloadedSongs(currentUser.uid);
      setDownloadedSongsList(downloads);
      addToast(`Removed "${title}" cache files.`, "trash");
    } catch (err) {
      addToast("Error deleting cache", "warning");
    }
  };

  // ----------------------------------------------------
  // TUNE MODE INTEGRATION (AI VOCAL REMOVER)
  // ----------------------------------------------------
  const handleTuneModeToggle = async () => {
    if (!currentSong) return;

    const songId = currentSong.id;
    const backendUrl = import.meta.env.VITE_TUNE_MODE_BACKEND_URL || 'http://localhost:3001';

    if (tuneModeActive) {
      setTuneModeActive(false);
      if (vocalRemoverRef.current) {
        vocalRemoverRef.current.setTuneMode(false);
      }
      
      const songDetails = queue.find(s => s.id === songId) || currentSong;
      const originalUrl = audioQuality === 'high'
        ? songDetails.downloadUrl?.[4]?.url || songDetails.downloadUrl?.[0]?.url || songDetails.audioUrl || ''
        : songDetails.downloadUrl?.[2]?.url || songDetails.downloadUrl?.[0]?.url || songDetails.audioUrl || '';
      
      const wasPlaying = isPlaying;
      const time = audioRef.current?.currentTime || 0;
      
      setCurrentSong(prev => ({ ...prev, audioUrl: originalUrl }));
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (wasPlaying) audioRef.current.play();
        }
      }, 100);
      addToast("Vocal Separator Filter bypassed.", "info");
    } else {
      setTuneModeLoading(true);
      
      if (instrumentalCache[songId]) {
        applyInstrumental(instrumentalCache[songId]);
        setTuneModeLoading(false);
        setTuneModeActive(true);
        addToast("Vocal Separator Active (cached)", "success");
        return;
      }

      try {
        const payloadUrl = queue.find(s => s.id === songId)?.downloadUrl?.[4]?.url || currentSong.audioUrl;
        const response = await fetch(`${backendUrl}/api/separate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songId, songUrl: payloadUrl })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.instrumentalUrl) {
            const instUrl = data.instrumentalUrl;
            setInstrumentalCache(prev => ({ ...prev, [songId]: instUrl }));
            applyInstrumental(instUrl);
            setTuneModeActive(true);
            addToast("Vocal Separator Active (vocals separated)", "success");
            return;
          }
        }
        throw new Error("Vocal separator backend failed");
      } catch (err) {
        console.warn("Backend separation error, using Web Audio API client fallback:", err);
        addToast("Backend separation server offline. Using client filter fallback.", "warning");
        if (vocalRemoverRef.current) {
          vocalRemoverRef.current.setTuneMode(true);
        }
        setTuneModeActive(true);
      } finally {
        setTuneModeLoading(false);
      }
    }
  };

  const applyInstrumental = (url) => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      const time = audioRef.current.currentTime;
      setCurrentSong(prev => ({ ...prev, audioUrl: url }));
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (wasPlaying) audioRef.current.play();
        }
      }, 100);
    }
  };

  // ----------------------------------------------------
  // JAM ROOM CREATION & TRANSITIONS
  // ----------------------------------------------------
  const startJamRoom = async () => {
    if (!currentUser) {
      addToast("Log in first to host a Jam Room!", "warning");
      return;
    }
    
    setIsLoading(true);
    try {
      const code = await JamRoomService.generateRoomCode();
      const initialSong = currentSong || songs[0];
      await JamRoomService.createRoom(currentUser, code, initialSong);
      
      setJamRoomCode(code);
      setIsInJamRoom(true);
      setSelectedNav('JamRoom');
      addToast(`Jam Room ${code} created successfully!`, "success");
    } catch (err) {
      console.error(err);
      addToast("Error starting Jam Room", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  const joinJamRoom = async () => {
    if (!currentUser) {
      addToast("Log in first to join a Jam Room!", "warning");
      return;
    }

    const code = jamJoinCode.trim().toUpperCase();
    if (code.length !== 6) {
      addToast("Code must be 6 letters", "warning");
      return;
    }

    setIsLoading(true);
    try {
      const room = await JamRoomService.joinRoom(currentUser, code);
      setJamRoomCode(code);
      setJamRoomData(room);
      setIsInJamRoom(true);
      setSelectedNav('JamRoom');
      setJamJoinCode('');
      addToast(`Joined Jam Room ${code}!`, "success");
    } catch (err) {
      addToast(err.message, "warning");
    } finally {
      setIsLoading(false);
    }
  };

  const exitJamRoom = async () => {
    if (!currentUser || !jamRoomCode) return;
    try {
      await JamRoomService.leaveRoom(currentUser, jamRoomCode);
    } catch (e) {
      console.warn(e);
    }
    setIsInJamRoom(false);
    setJamRoomCode('');
    setJamRoomData(null);
    setSelectedNav('Home');
    addToast("Exited Jam Room session", "info");
  };

  // ----------------------------------------------------
  // GOOGLE LOGIN HANDLERS
  // ----------------------------------------------------
  const handleGoogleLogin = async () => {
    try {
      await AuthService.signInWithGoogle();
      addToast("Logged in with Google!", "success");
    } catch (err) {
      console.error(err);
      addToast("Sign-in failed.", "warning");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      localStorage.removeItem('OMusic_sessionMode');
      localStorage.removeItem('OMusic_mockUser');
      await AuthService.signOut();
      setSelectedNav('Home');
      addToast("Logged out successfully.", "info");
      window.location.reload();
    } catch (e) {
      addToast("Logout failed.", "warning");
    }
  };

  return (
    <div className="flex items-start md:items-center justify-center min-h-screen bg-[#E8E8E8] text-[#111111] font-space p-3 md:p-6 select-none">
      
      {/* HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentSong?.audioUrl || ''}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleAudioEnded}
      />

      {/* LOGIN OVERLAY IF NOT AUTHENTICATED */}
      {isAuthLoading ? (
        <div className="bg-[#EBEBEB] border-2 border-[#111111] p-8 rounded-lg shadow-[6px_6px_0px_rgba(0,0,0,0.15)] flex flex-col items-center gap-4 text-center">
          <div className="text-sm font-bold uppercase tracking-wider animate-pulse">Initializing OMusic Platform...</div>
        </div>
      ) : !currentUser ? (
        <div className="bg-[#EBEBEB] border-2 border-[#111111] p-8 rounded-lg shadow-[6px_6px_0px_rgba(0,0,0,0.15)] max-w-sm w-full flex flex-col items-center text-center">
          <div className="text-xl font-extrabold uppercase tracking-tighter mb-2">MUSIC2D <span className="text-xs bg-[#111111] text-[#E8E8E8] px-2 py-0.5 rounded-full ml-1">RETRO</span></div>
          <p className="text-xs text-[#555555] mb-6 leading-relaxed">
            Vintage retro brutalist player with synced timed lyrics, vocal separators, and synchronized listening.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-neutral-100 border-2 border-[#111111] text-black font-bold text-xs py-3 px-4 rounded shadow-[3px_3px_0px_#111111] flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#111111]"
            >
              Continue with Google
            </button>

            <button
              onClick={() => {
                try {
                  const mockUser = {
                    uid: 'mock_user_' + Math.random().toString(36).substr(2, 9),
                    displayName: 'Demo Guest',
                    email: 'guest@omusic.com',
                    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                    createdAt: Date.now()
                  };
                  localStorage.setItem('OMusic_sessionMode', 'mock');
                  localStorage.setItem('OMusic_mockUser', JSON.stringify(mockUser));
                  window.location.reload();
                } catch (err) {
                  console.error(err);
                }
              }}
              className="w-full bg-[#E8E8E8] hover:bg-[#D8D8D8] border-2 border-[#111111] text-[#111111] font-bold text-xs py-3 px-4 rounded shadow-[3px_3px_0px_#111111] cursor-pointer transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#111111]"
            >
              Try as Demo Guest
            </button>
          </div>
        </div>
      ) : (
        /* MAIN APPLICATION CONTAINER */
        <div className="app-container max-w-[1200px] min-w-0 md:min-w-[1100px] w-full flex flex-col gap-4 md:gap-6 pb-24 md:pb-0">
          
          {/* NAVBAR */}
          <nav className="navbar h-14 bg-[#EBEBEB] border border-[#C0C0C0] rounded flex items-center justify-between px-4">
            <div className="logo-container flex items-center gap-2 text-lg font-bold">
              <span>MUSIC2D</span>
              <span className="logo-badge text-[10px] bg-[#111111] text-[#E8E8E8] px-1.5 py-0.5 rounded-full uppercase">RETRO</span>
            </div>

            {/* Navbar search */}
            <div className="hidden md:block relative w-[380px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#888]">⌕</span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search songs, artists, albums..."
                value={searchVal}
                onChange={(e) => {
                  setSearchVal(e.target.value);
                  if (selectedNav !== 'Home' && selectedNav !== 'Search') {
                    setSelectedNav('Home');
                  }
                }}
                className="w-full bg-[#F5F5F5] text-xs font-space border border-[#C0C0C0] rounded px-8 py-2 focus:outline-none focus:border-[#111111]"
              />
              {searchVal && (
                <button 
                  onClick={() => setSearchVal('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888] font-bold hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Actions & Profile */}
            <div className="nav-actions flex items-center gap-4 relative">
              <button 
                onClick={() => { setShowInbox(!showInbox); setShowNotifications(false); }} 
                className="action-btn text-base relative p-1 hover:bg-black/5 rounded cursor-pointer"
                title="Messages"
              >
                ✉
                <span className="badge absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#CC0000] rounded-full" />
              </button>

              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowInbox(false); }} 
                className="action-btn text-base relative p-1 hover:bg-black/5 rounded cursor-pointer"
                title="Notifications"
              >
                🔔
                <span className="badge absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#CC0000] rounded-full" />
              </button>

              {/* Inbox dropdown */}
              {showInbox && (
                <div className="dropdown-panel absolute right-16 top-10 bg-[#EBEBEB] border border-[#111111] rounded w-60 p-3 z-30 shadow-[4px_4px_0px_rgba(0,0,0,0.15)] text-left">
                  <p className="dropdown-title text-[10px] font-bold border-b border-[#C0C0C0] pb-1.5 mb-2 uppercase">Inbox (2)</p>
                  <div className="dropdown-item text-[11px] py-1 border-b border-black/5"><strong>Admin:</strong> Welcome to OMusic brutalist upgrade!</div>
                  <div className="dropdown-item text-[11px] py-1"><strong>System:</strong> Replicate separation node initialized.</div>
                </div>
              )}

              {/* Notifications dropdown */}
              {showNotifications && (
                <div className="dropdown-panel absolute right-10 top-10 bg-[#EBEBEB] border border-[#111111] rounded w-60 p-3 z-30 shadow-[4px_4px_0px_rgba(0,0,0,0.15)] text-left">
                  <p className="dropdown-title text-[10px] font-bold border-b border-[#C0C0C0] pb-1.5 mb-2 uppercase">Alerts</p>
                  <div className="dropdown-item text-[11px] py-1 border-b border-black/5">Vocal separation cache loaded.</div>
                  <div className="dropdown-item text-[11px] py-1">Jam Room active on code {jamRoomCode || 'N/A'}.</div>
                </div>
              )}

              {/* Pixel Avatar SVG */}
              <svg 
                className="avatar-svg border border-[#C0C0C0] rounded bg-[#E8E8E8] cursor-pointer hover:border-black" 
                width="32" 
                height="32" 
                viewBox="0 0 32 32" 
                xmlns="http://www.w3.org/2000/svg" 
                onClick={() => setSelectedNav('Profile')} 
                title="User Profile"
              >
                {/* Row 0 */}
                <rect x="8" y="0" width="4" height="4" fill="#111111" />
                <rect x="12" y="0" width="4" height="4" fill="#111111" />
                <rect x="16" y="0" width="4" height="4" fill="#111111" />
                <rect x="20" y="0" width="4" height="4" fill="#111111" />
                {/* Row 1 */}
                <rect x="4" y="4" width="4" height="4" fill="#111111" />
                <rect x="8" y="4" width="4" height="4" fill="#111111" />
                <rect x="12" y="4" width="4" height="4" fill="#111111" />
                <rect x="16" y="4" width="4" height="4" fill="#111111" />
                <rect x="20" y="4" width="4" height="4" fill="#111111" />
                <rect x="24" y="4" width="4" height="4" fill="#111111" />
                {/* Row 2 */}
                <rect x="0" y="8" width="4" height="4" fill="#111111" />
                <rect x="4" y="8" width="4" height="4" fill="#111111" />
                <rect x="12" y="8" width="4" height="4" fill="#111111" />
                <rect x="16" y="8" width="4" height="4" fill="#111111" />
                <rect x="24" y="8" width="4" height="4" fill="#111111" />
                <rect x="28" y="8" width="4" height="4" fill="#111111" />
                {/* Row 3 */}
                <rect x="0" y="12" width="4" height="4" fill="#111111" />
                <rect x="4" y="12" width="4" height="4" fill="#111111" />
                <rect x="8" y="12" width="4" height="4" fill="#111111" />
                <rect x="12" y="12" width="4" height="4" fill="#111111" />
                <rect x="16" y="12" width="4" height="4" fill="#111111" />
                <rect x="20" y="12" width="4" height="4" fill="#111111" />
                <rect x="24" y="12" width="4" height="4" fill="#111111" />
                <rect x="28" y="12" width="4" height="4" fill="#111111" />
                {/* Row 4 */}
                <rect x="0" y="16" width="4" height="4" fill="#111111" />
                <rect x="4" y="16" width="4" height="4" fill="#111111" />
                <rect x="24" y="16" width="4" height="4" fill="#111111" />
                <rect x="28" y="16" width="4" height="4" fill="#111111" />
                {/* Row 5 */}
                <rect x="0" y="20" width="4" height="4" fill="#111111" />
                <rect x="4" y="20" width="4" height="4" fill="#111111" />
                <rect x="12" y="20" width="4" height="4" fill="#111111" />
                <rect x="16" y="20" width="4" height="4" fill="#111111" />
                <rect x="24" y="20" width="4" height="4" fill="#111111" />
                <rect x="28" y="20" width="4" height="4" fill="#111111" />
                {/* Row 6 */}
                <rect x="4" y="24" width="4" height="4" fill="#111111" />
                <rect x="8" y="24" width="4" height="4" fill="#111111" />
                <rect x="12" y="24" width="4" height="4" fill="#111111" />
                <rect x="16" y="24" width="4" height="4" fill="#111111" />
                <rect x="20" y="24" width="4" height="4" fill="#111111" />
                <rect x="24" y="24" width="4" height="4" fill="#111111" />
                {/* Row 7 */}
                <rect x="8" y="28" width="4" height="4" fill="#111111" />
                <rect x="12" y="28" width="4" height="4" fill="#111111" />
                <rect x="16" y="28" width="4" height="4" fill="#111111" />
                <rect x="20" y="28" width="4" height="4" fill="#111111" />
              </svg>
            </div>
          </nav>

          {/* BODY LAYOUT */}
          <div className="main-layout flex flex-col md:flex-row gap-6">
            
            {/* LEFT NAV SIDEBAR (48px wide) */}
            <div className="hidden md:flex left-nav w-12 bg-[#EBEBEB] border border-[#C0C0C0] rounded flex-col items-center gap-4 py-4 h-fit">
              <button onClick={() => setSelectedNav('Home')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'Home' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="Player">💿</button>
              <button onClick={() => setSelectedNav('Search')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'Search' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="Search">⌕</button>
              <button onClick={() => setSelectedNav('Favorites')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'Favorites' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="Favorites">♡</button>
              <button onClick={() => setSelectedNav('Songs')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'Songs' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="Tracks Queue">♫</button>
              <button onClick={() => setSelectedNav('JamRoom')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'JamRoom' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="Jam Room Synchronization">👥</button>
              <button onClick={() => setSelectedNav('Profile')} className={`nav-item text-lg w-full text-center py-2 border-l-2 cursor-pointer transition-all ${selectedNav === 'Profile' ? 'border-[#111111] text-[#111111] font-bold bg-black/2' : 'border-transparent text-[#555555] hover:text-black'}`} title="My Space">⚙</button>
            </div>

            {/* CENTER PANEL (500px wide) */}
            <div className={`center-panel w-full md:w-[500px] flex-col gap-6 flex-shrink-0 ${selectedNav === 'Home' ? 'flex' : 'hidden md:flex'}`}>
              
              {/* Rotating Vinyl Turntable SVG */}
              <div className="turntable-panel bg-[#EBEBEB] border border-[#C0C0C0] rounded p-4 flex items-center justify-center">
                <svg id="turntable-root" className={`max-w-[400px] w-full h-auto ${isPlaying ? 'playing' : 'paused'}`} viewBox="0 0 400 380" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="10" width="380" height="360" rx="16" fill="#BBBBBB" stroke="#111111" strokeWidth="2"/>
                  <rect x="25" y="25" width="350" height="330" rx="12" fill="#CCCCCC" stroke="#111111" strokeWidth="2"/>
                  <circle cx="200" cy="190" r="135" fill="#999999" stroke="#111111" strokeWidth="2"/>
                  
                  {/* Vinyl spinning group */}
                  <g id="vinyl-group">
                    <circle cx="200" cy="190" r="128" fill="#111111"/>
                    <circle cx="200" cy="190" r="122" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="115" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="108" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="101" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="94" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="87" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="80" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="73" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="66" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="59" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="52" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="45" fill="none" stroke="#222222" strokeWidth="1.5"/>
                    <circle cx="200" cy="190" r="38" fill="none" stroke="#1A1A1A" strokeWidth="2"/>
                    <circle cx="200" cy="190" r="31" fill="none" stroke="#222222" strokeWidth="1.5"/>

                    <circle cx="200" cy="190" r="35" fill="#CCCCCC" stroke="#111111" strokeWidth="1.5"/>
                    <text x="200" y="193" fontFamily="'Space Mono', monospace" fontSize="8" fill="#333333" fontWeight="700" textAnchor="middle">33⅓ RPM</text>
                    <circle cx="200" cy="190" r="5" fill="#111111"/>
                  </g>

                  {/* Tonearm pivot-group */}
                  <g id="tonearm">
                    <circle cx="330" cy="80" r="12" fill="#888888" stroke="#111111" strokeWidth="1.5"/>
                    <circle cx="330" cy="80" r="6" fill="#555555" stroke="#111111" strokeWidth="1.5"/>
                    <rect x="326" y="80" width="8" height="130" fill="#777777" stroke="#111111" strokeWidth="1.5" rx="3"/>
                    <rect x="315" y="204" width="22" height="10" fill="#444444" stroke="#111111" strokeWidth="1.5" rx="2"/>
                    <circle cx="326" cy="214" r="3.5" fill="#CC0000"/>
                  </g>

                  <circle cx="370" cy="260" r="10" fill="#888888" stroke="#111111" strokeWidth="1.5"/>
                  <circle cx="370" cy="260" r="3.5" fill="#333333"/>
                  <circle cx="370" cy="290" r="8" fill="#777777" stroke="#111111" strokeWidth="1.5"/>
                  <circle cx="370" cy="290" r="2.5" fill="#333333"/>
                  <circle cx="370" cy="315" r="8" fill="#777777" stroke="#111111" strokeWidth="1.5"/>
                  <circle cx="370" cy="315" r="2.5" fill="#333333"/>
                </svg>
              </div>

              {/* Song details and timeline cards */}
              <div id="song-info-card" class="song-info-panel bg-[#EBEBEB] border border-[#C0C0C0] rounded p-5 flex flex-col">
                <div className="song-meta-header flex gap-4">
                  <img 
                    src={currentSong?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100'} 
                    alt="Art" 
                    className="album-art-grayscale w-20 h-20 object-cover flex-shrink-0"
                  />
                  
                  <div className="song-details-block flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="title-row flex justify-between items-start gap-2">
                        <h2 id="song-title" className="text-sm font-bold text-[#111111] truncate max-w-[280px]">
                          {currentSong?.name || 'Loading...'}
                        </h2>
                        {currentSong && (
                          <span 
                            onClick={() => toggleLikeSong(currentSong.id, currentSong.name)}
                            className={`likes-container text-xs cursor-pointer font-bold px-2 py-0.5 rounded border border-transparent hover:border-[#C0C0C0] hover:bg-black/2 flex items-center gap-1 ${
                              likedSongs.has(currentSong.id) ? 'liked text-[#CC0000]' : 'text-brand-text-secondary'
                            }`}
                          >
                            {likedSongs.has(currentSong.id) ? '♥' : '♡'}
                          </span>
                        )}
                      </div>
                      <p id="song-artist" className="text-xs text-[#555555] truncate mt-0.5">{currentSong?.artist || 'Unknown'}</p>
                    </div>

                    <div className="flex gap-2 items-center">
                      <span id="genre-tag" className="pill-black text-[9px] font-bold bg-[#111111] text-[#E8E8E8] px-2 py-0.5 rounded uppercase">HQ Audio</span>
                      <button 
                        onClick={toggleQuality}
                        className="bg-[#111111] text-[#E8E8E8] text-[9px] font-bold px-2 py-0.5 rounded border border-[#111111] cursor-pointer hover:bg-black/80"
                      >
                        {audioQuality === 'high' ? 'HQ (320K)' : 'STD (160K)'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status indicator */}
                <div className="indicator-text text-[11px] font-bold text-[#555555] min-h-[16px] mt-2">
                  {(isLoading || tuneModeLoading) && (
                    <p className="animate-pulse">Streaming data buffering...</p>
                  )}
                  {isOffline && (
                    <p className="text-yellow-600">Local offline cache play</p>
                  )}
                </div>

                {/* Waveform Canvas */}
                <canvas 
                  ref={canvasRef} 
                  id="waveform" 
                  width="320" 
                  height="40" 
                  onClick={handleCanvasClick}
                  className="w-full cursor-pointer h-10 border border-[#C0C0C0] bg-[#E8E8E8] rounded-[2px] mt-2"
                />

                {/* Timing labels */}
                <div className="time-row flex justify-between text-[11px] font-bold text-[#555555] mt-1.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* Control toolbar */}
                <div className="flex items-center justify-between border-t border-[#C0C0C0] pt-4 mt-4">
                  {/* Web Audio Lyrics synced drawers */}
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    disabled={!currentSong}
                    className={`brutalist-button px-3 py-1.5 ${showLyrics ? 'active-pill bg-[#111111] text-white' : ''}`}
                  >
                    LYRICS
                  </button>

                  <button
                    onClick={handleTuneModeToggle}
                    disabled={!currentSong || tuneModeLoading}
                    className={`brutalist-button px-3 py-1.5 ${tuneModeActive ? 'active-pill bg-[#111111] text-white' : ''}`}
                  >
                    {tuneModeLoading ? 'Tuning...' : 'TUNE MODE'}
                  </button>
                </div>

                {/* Audio controls row */}
                <div className="controls-row flex justify-between items-center mt-3 border-t border-[#C0C0C0]/50 pt-3">
                  <button 
                    onClick={() => setIsCompressed(!isCompressed)}
                    className={`control-btn brutalist-button px-3 py-1.5 ${isCompressed ? 'active bg-[#111111] text-white' : ''}`}
                    title="Toggle Dynamic volume compression"
                  >
                    COMPRESS
                  </button>
                  <button onClick={handlePrev} className="control-btn brutalist-button px-3 py-1.5">PREV</button>
                  <button onClick={togglePlay} className="control-btn brutalist-button btn-play-pause px-5 py-1.5 font-extrabold border-[#111111]">
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                  </button>
                  <button onClick={handleNext} className="control-btn brutalist-button px-3 py-1.5">NEXT</button>
                  <button 
                    onClick={() => { setShuffle(!shuffle); addToast(shuffle ? "Shuffle OFF" : "Shuffle ON", 'info'); }}
                    className={`control-btn brutalist-button px-3 py-1.5 ${shuffle ? 'active bg-[#111111] text-white' : ''}`}
                  >
                    SHUFFLE
                  </button>
                </div>

              </div>

            </div>

            {/* RIGHT DASHBOARD PANEL (flex-1) */}
            <div className={`right-panel flex-1 bg-[#EBEBEB] border border-[#C0C0C0] rounded p-4 md:p-5 flex-col gap-5 h-auto md:h-[728px] min-h-[400px] md:min-h-0 overflow-y-auto ${selectedNav !== 'Home' ? 'flex' : 'hidden md:flex'}`}>
              
              {/* IF LYRICS ARE SHOWN */}
              {showLyrics && currentSong ? (
                <div className="flex flex-col h-full gap-4 relative min-h-0">
                  <div className="flex justify-between items-center border-b border-[#C0C0C0] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Live timed Lyrics</span>
                    <button onClick={() => setShowLyrics(false)} className="text-xs underline cursor-pointer">Close</button>
                  </div>
                  
                  {tuneModeActive && (
                    <div className="bg-[#111111] text-[#E8E8E8] text-[10px] font-bold p-2 border border-[#111111] text-center uppercase tracking-widest animate-pulse">
                      🎵 Listening in Tune Mode — vocals removed
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 py-4 scroll-smooth">
                    {lyricsLoading ? (
                      <p className="text-xs text-[#555555] animate-pulse">Buffering lyrics...</p>
                    ) : lyricsLines.length === 0 ? (
                      <div className="text-center py-12 text-[#555555] text-xs">
                        Lyrics not available for this track.
                      </div>
                    ) : (
                      lyricsLines.map((line, idx) => {
                        const isActive = lyricsSynced && idx === lyricsActiveIndex;
                        return (
                          <p 
                            key={idx}
                            id={`lyric-line-${idx}`}
                            className={`text-xs font-bold transition-all duration-200 ${
                              isActive ? 'lyric-line-active text-[#E8E8E8] bg-[#111111] p-1.5 text-center text-sm scale-102' : 'text-[#555555]'
                            }`}
                          >
                            {line.text}
                          </p>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : selectedNav === 'Home' ? (
                /* BROWSE VIEW IN HOME */
                <div className="flex flex-col gap-5">
                  <div className="section-header flex justify-between items-center">
                    <span className="section-title text-xs font-bold uppercase">Trending Tracks</span>
                  </div>

                  {/* Category Pills */}
                  <div className="pills-row flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          addToast(`Switched category: ${cat}`, 'info');
                        }}
                        className={`category-pill brutalist-button px-3 py-1 rounded-full ${activeCategory === cat ? 'active-pill bg-[#111111] text-white' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Browse Tracks list */}
                  <div className="flex flex-col gap-2">
                    {isLoading ? (
                      [...Array(5)].map((_, idx) => (
                        <div key={idx} className="h-14 bg-[#E8E8E8] border border-[#C0C0C0] animate-pulse rounded" />
                      ))
                    ) : songs.length === 0 ? (
                      <p className="text-xs text-[#555555]">No tracks loaded.</p>
                    ) : (
                      songs.map((song, idx) => {
                        const isCurrent = currentSong?.id === song.id;
                        const artist = song.artists?.primary?.[0]?.name || song.artist || 'Unknown';
                        const image = song.image?.[2]?.url || song.image?.[1]?.url || song.image || '';

                        return (
                          <div
                            key={song.id}
                            onClick={() => handlePlaySong(song, idx, songs)}
                            className={`playlist-row flex items-center justify-between p-2 bg-[#E8E8E8] border border-[#C0C0C0] rounded cursor-pointer transition-all hover:bg-[#E2E2E2] ${
                              isCurrent ? 'border-[#111111] bg-[#D8D8D8]' : ''
                            }`}
                          >
                            <div className="playlist-left flex items-center gap-3 min-w-0">
                              <img src={image} className="w-8 h-8 album-art-grayscale object-cover flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="playlist-name text-xs font-bold text-[#111111] truncate max-w-[180px]">{song.name || song.title}</p>
                                <p className="text-[10px] text-[#555555] truncate max-w-[150px]">{artist}</p>
                              </div>
                            </div>

                            <div className="playlist-right flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLikeSong(song.id, song.name || song.title);
                                }}
                                className="p-1 text-xs hover:text-red-500"
                              >
                                {likedSongs.has(song.id) ? '♥' : '♡'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id);
                                }}
                                className="p-1 text-xs hover:text-black"
                              >
                                ☰
                              </button>

                              {/* Song dropdown context menu */}
                              {activeMenuSongId === song.id && (
                                <div ref={menuRef} className="absolute right-10 bg-[#EBEBEB] border border-[#111111] rounded py-1 z-25 shadow-[3px_3px_0px_#111111] w-40 text-left">
                                  {playlists.map(pl => (
                                    <button
                                      key={pl.id}
                                      onClick={(e) => { e.stopPropagation(); handleAddSongToPlaylist(pl.id, song.id, song.name || song.title); }}
                                      className="w-full px-3 py-1.5 text-[10px] text-left hover:bg-black/5 block font-bold truncate"
                                    >
                                      Add to: {pl.name}
                                    </button>
                                  ))}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDownloadTrack(song); }}
                                    className="w-full px-3 py-1.5 text-[10px] text-left hover:bg-black/5 block font-bold border-t border-[#C0C0C0]"
                                  >
                                    Download 320kbps
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : selectedNav === 'Search' ? (
                /* SEARCH VIEW RESULTS */
                <div className="flex flex-col gap-4">
                  {/* Mobile Search input */}
                  <div className="block md:hidden relative w-full mb-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#888]">⌕</span>
                    <input
                      type="text"
                      placeholder="Search songs, artists, albums..."
                      value={searchVal}
                      onChange={(e) => setSearchVal(e.target.value)}
                      className="w-full bg-[#F5F5F5] text-xs font-space border border-[#C0C0C0] rounded px-8 py-2.5 focus:outline-none focus:border-[#111111]"
                    />
                    {searchVal && (
                      <button 
                        onClick={() => setSearchVal('')} 
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#888] font-bold hover:text-black"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center border-b border-[#C0C0C0] pb-2">
                    <span className="text-xs font-bold uppercase">Search results query: "{searchQuery}"</span>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {songs.map((song, idx) => (
                      <div
                        key={song.id}
                        onClick={() => handlePlaySong(song, idx, songs)}
                        className={`playlist-row flex justify-between p-2 bg-[#E8E8E8] border border-[#C0C0C0] rounded cursor-pointer ${
                          currentSong?.id === song.id ? 'border-[#111111] bg-[#D8D8D8]' : ''
                        }`}
                      >
                        <div>
                          <p className="playlist-name text-xs font-bold">{song.name || song.title}</p>
                          <p className="text-[10px] text-[#555555]">{song.artists?.primary?.[0]?.name || song.artist || 'Unknown'}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadTrack(song); }}
                          className="text-xs underline hover:text-black font-bold"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedNav === 'Favorites' ? (
                /* LIKED FAVORITES LIBRARY */
                <div className="flex flex-col gap-4">
                  <span className="section-title text-xs font-bold uppercase border-b border-[#C0C0C0] pb-2">My Favorites ({likedSongsData.length})</span>
                  {likedSongsData.length === 0 ? (
                    <p className="text-xs text-[#555555]">No liked songs synced yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {likedSongsData.map((song, idx) => (
                        <div
                          key={song.id}
                          onClick={() => handlePlaySong({ ...song, name: song.title, artist: song.primaryArtists }, idx, likedSongsData)}
                          className="playlist-row flex justify-between p-2 bg-[#E8E8E8] border border-[#C0C0C0] rounded cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <img src={song.image} className="w-8 h-8 album-art-grayscale object-cover" />
                            <div>
                              <p className="playlist-name text-xs font-bold">{song.title}</p>
                              <p className="text-[10px] text-[#555555]">{song.primaryArtists}</p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLikeSong(song.id, song.title); }}
                            className="text-xs text-[#CC0000] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedNav === 'Songs' ? (
                /* TRACKS QUEUE */
                <div className="flex flex-col gap-4">
                  <span className="section-title text-xs font-bold uppercase border-b border-[#C0C0C0] pb-2">Active Play Queue</span>
                  <div className="flex flex-col gap-2">
                    {queue.map((song, idx) => (
                      <div
                        key={song.id}
                        onClick={() => handlePlaySong(song, idx, queue)}
                        className={`playlist-row flex justify-between p-2 bg-[#E8E8E8] border border-[#C0C0C0] rounded cursor-pointer ${
                          currentIndex === idx ? 'border-[#111111] bg-[#D8D8D8]' : ''
                        }`}
                      >
                        <div>
                          <p className="playlist-name text-xs font-bold truncate max-w-[200px]">{song.name || song.title}</p>
                          <p className="text-[10px] text-[#555555]">{song.artists?.primary?.[0]?.name || song.artist || 'Unknown'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#555555]">{formatTime(song.duration)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedNav === 'JamRoom' ? (
                /* JAM ROOM CONSOLE */
                <div className="flex flex-col gap-5">
                  <span className="section-title text-xs font-bold uppercase border-b border-[#C0C0C0] pb-2">Jam Room Synchronization</span>
                  
                  {!isInJamRoom ? (
                    <div className="flex flex-col gap-4 p-4 bg-[#E8E8E8] border border-[#C0C0C0] rounded">
                      <div className="flex flex-col gap-2 text-xs">
                        <p className="font-bold">Host listening party sessions with other tabs/browsers.</p>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-3 border-t border-[#C0C0C0]">
                        <button
                          onClick={startJamRoom}
                          className="w-full bg-[#111111] text-white text-xs font-bold py-2.5 rounded cursor-pointer border border-[#111111]"
                        >
                          Start a Party Room
                        </button>
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="6-LETTER CODE"
                            maxLength={6}
                            value={jamJoinCode}
                            onChange={(e) => setJamJoinCode(e.target.value.toUpperCase())}
                            className="bg-[#F5F5F5] text-xs font-bold text-center border border-[#C0C0C0] rounded px-3 py-2 flex-1"
                          />
                          <button
                            onClick={joinJamRoom}
                            className="bg-white hover:bg-neutral-100 text-[#111111] border border-[#111111] text-xs font-bold px-4 rounded cursor-pointer"
                          >
                            Join Room
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4 p-4 bg-[#E8E8E8] border border-[#111111] rounded shadow-[3px_3px_0px_#111111]">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold">Room Code: <span className="text-[#CC0000]">{jamRoomCode}</span></h4>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setShowInviteModal(true)}
                            className="text-[9px] border border-[#C0C0C0] bg-white px-2 py-0.5 rounded font-bold"
                          >
                            QR Invite
                          </button>
                          <button 
                            onClick={exitJamRoom}
                            className="text-[9px] border border-red-300 text-red-600 bg-white px-2 py-0.5 rounded font-bold"
                          >
                            Exit
                          </button>
                        </div>
                      </div>

                      {/* Room streaming track */}
                      {jamRoomData?.currentSong ? (
                        <div className="bg-white border border-[#C0C0C0] p-2.5 rounded flex items-center gap-3">
                          <img src={jamRoomData.currentSong.image} className="w-10 h-10 album-art-grayscale object-cover flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-black truncate">{jamRoomData.currentSong.title}</p>
                            <p className="text-[10px] text-[#555555] truncate">{jamRoomData.currentSong.primaryArtists}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#555555] text-center">Waiting for target stream track...</p>
                      )}

                      {/* Room members */}
                      <div className="flex flex-col gap-1.5 border-t border-[#C0C0C0] pt-3">
                        <span className="text-[9px] font-bold text-[#555555] uppercase tracking-wider">Party Listeners:</span>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(jamRoomData?.participants || {}).map(([uid, p]) => (
                            <div key={uid} className="bg-white border border-[#C0C0C0] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
                              <span>{p?.displayName || 'Guest'}</span>
                              {jamRoomData.hostUid === uid && <span className="text-[8px] bg-red-100 text-red-700 px-1 rounded">Host</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* PROFILE & OFFLINE CONFIG DETAILS */
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-[#C0C0C0] pb-2">
                    <span className="text-xs font-bold uppercase">My Space Settings</span>
                  </div>

                  <div className="bg-[#E8E8E8] border border-[#C0C0C0] p-4 rounded flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border border-[#C0C0C0] overflow-hidden">
                        <img src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold">{currentUser?.displayName || 'Oji'}</p>
                        <p className="text-[9px] text-[#555555]">{currentUser?.email || 'guest@omusic.com'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleGoogleLogout}
                      className="bg-white border border-[#111111] text-[10px] font-bold py-1.5 rounded cursor-pointer"
                    >
                      LOGOUT PROFILE
                    </button>
                  </div>

                  {/* Playlist creator dashboard */}
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-[#555555]">Custom Playlists</span>
                      <button 
                        onClick={() => setShowCreatePlaylistModal(true)}
                        className="text-[10px] font-bold text-red-600 underline"
                      >
                        + Create
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {playlists.map(pl => (
                        <div key={pl.id} className="p-3 bg-[#E8E8E8] border border-[#C0C0C0] rounded">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold">{pl.name}</span>
                            <button onClick={(e) => handleDeletePlaylist(e, pl.id, pl.name)} className="text-[10px] text-red-600 hover:underline">Delete</button>
                          </div>
                          
                           {(!pl.songIds || !Array.isArray(pl.songIds) || pl.songIds.length === 0) ? (
                            <p className="text-[9px] text-[#555555] italic">No tracks in this playlist.</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {Array.isArray(pl.songIds) && pl.songIds.map(sid => (
                                <div key={sid} className="flex justify-between items-center text-[10px] bg-white p-1 rounded border border-[#C0C0C0]/50">
                                  <span className="truncate max-w-[180px] font-bold">{sid}</span>
                                  <button
                                    onClick={async () => {
                                      await UserDataService.removeSongFromPlaylist(currentUser.uid, pl.id, sid);
                                      const refreshed = await UserDataService.getPlaylists(currentUser.uid);
                                      setPlaylists(refreshed);
                                    }}
                                    className="text-red-500 font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Downloads list */}
                  <div className="flex flex-col gap-2 mt-4">
                    <span className="text-[10px] font-bold uppercase text-[#555555]">Offline Cached Files ({downloadedSongsList.length})</span>
                    <div className="flex flex-col gap-1.5">
                      {downloadedSongsList.map(song => (
                        <div 
                          key={song.id}
                          onClick={() => handlePlayDownloadedSong(song.id, song.title)}
                          className="flex justify-between items-center p-2 bg-[#E8E8E8] border border-[#C0C0C0] rounded cursor-pointer hover:bg-[#E2E2E2]"
                        >
                          <span className="text-xs font-bold">{song.title}</span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              await handleDeleteDownloadedSong(song.id, song.title);
                            }}
                            className="text-[10px] text-red-600 font-bold"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

          {/* CREATE PLAYLIST DIALOG */}
          {showCreatePlaylistModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#EBEBEB] border-2 border-[#111111] p-6 rounded w-full max-w-xs flex flex-col gap-4 shadow-[4px_4px_0px_#111111]">
                <h3 className="text-xs font-extrabold uppercase">Create Custom Playlist</h3>
                <input
                  type="text"
                  placeholder="PLAYLIST NAME"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="bg-white border border-[#C0C0C0] font-bold text-xs rounded px-3 py-2 focus:outline-none focus:border-[#111111]"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setShowCreatePlaylistModal(false)}
                    className="text-[10px] font-bold px-3 py-1.5 border border-[#C0C0C0] rounded bg-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreatePlaylist}
                    className="bg-[#111111] text-white text-[10px] font-bold px-4 py-1.5 rounded border border-[#111111] cursor-pointer"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JAM ROOM INVITE DIALOG */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[#EBEBEB] border-2 border-[#111111] p-6 rounded w-full max-w-xs flex flex-col items-center gap-4 text-center shadow-[4px_4px_0px_#111111]">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-extrabold uppercase">Invite Friends</h3>
                  <p className="text-[10px] text-[#555555]">Scan QR or copy code to sync listening.</p>
                </div>

                <div className="p-2 bg-white border border-[#C0C0C0] rounded">
                  <QRCodeSVG 
                    value={`https://carvaan.vercel.app/jam?code=${jamRoomCode}`} 
                    size={140} 
                    level="M"
                  />
                </div>

                <div className="flex justify-between items-center bg-white border border-[#C0C0C0] px-3 py-1.5 w-full rounded font-bold">
                  <span className="text-sm select-all">{jamRoomCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(jamRoomCode);
                      setCopiedCode(true);
                      addToast("Invite code copied!", "success");
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="text-xs text-red-600 underline font-bold"
                  >
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full bg-[#111111] text-white text-xs font-bold py-2 rounded cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* TOAST SYSTEM */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
            {toasts.map(t => (
              <div
                key={t.id}
                className="px-4 py-2 bg-[#111111] text-[#E8E8E8] border border-[#111111] text-xs font-bold shadow-lg pointer-events-auto rounded-[2px]"
              >
                <span>{t.message}</span>
              </div>
            ))}
          </div>

          {/* MOBILE MINI PLAYER */}
          {currentSong && selectedNav !== 'Home' && (
            <div 
              onClick={() => setSelectedNav('Home')}
              className="md:hidden fixed bottom-20 left-4 right-4 bg-[#EBEBEB] border-2 border-[#111111] p-3 rounded shadow-[4px_4px_0px_#111111] z-40 flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img 
                  src={currentSong.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=50'} 
                  className="w-10 h-10 album-art-grayscale object-cover border border-[#111111]"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-[#111111] truncate">{currentSong.name}</p>
                  <p className="text-[9px] text-[#555555] truncate">{currentSong.artist}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={handlePrev} 
                  className="text-xs font-bold bg-[#E8E8E8] border border-[#111111] px-2 py-1 active:bg-[#C0C0C0] rounded"
                >
                  ⏮
                </button>
                <button 
                  onClick={togglePlay} 
                  className="text-xs font-bold bg-[#E8E8E8] border border-[#111111] px-3 py-1 active:bg-[#C0C0C0] rounded"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <button 
                  onClick={handleNext} 
                  className="text-xs font-bold bg-[#E8E8E8] border border-[#111111] px-2 py-1 active:bg-[#C0C0C0] rounded"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}

          {/* MOBILE BOTTOM NAVIGATION BAR */}
          <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#EBEBEB] border-t-2 border-[#111111] items-center justify-around z-40 px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
            <button onClick={() => setSelectedNav('Home')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'Home' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">💿</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Home</span>
            </button>
            <button onClick={() => setSelectedNav('Search')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'Search' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">⌕</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Search</span>
            </button>
            <button onClick={() => setSelectedNav('Favorites')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'Favorites' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">♡</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Likes</span>
            </button>
            <button onClick={() => setSelectedNav('Songs')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'Songs' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">♫</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Queue</span>
            </button>
            <button onClick={() => setSelectedNav('JamRoom')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'JamRoom' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">👥</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Jam</span>
            </button>
            <button onClick={() => setSelectedNav('Profile')} className={`flex flex-col items-center justify-center w-12 h-12 rounded cursor-pointer ${selectedNav === 'Profile' ? 'text-black font-bold bg-black/5' : 'text-[#555555]'}`}>
              <span className="text-lg">⚙</span>
              <span className="text-[8px] font-bold uppercase tracking-tighter">Space</span>
            </button>
          </div>

          <SpeedInsights />
        </div>
      )}
    </div>
  );
}
