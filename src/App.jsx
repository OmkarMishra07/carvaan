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

const FALLBACK_ARTISTS = [
  {
    id: "10630279",
    name: "Arijit Singh",
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=60" }
    ],
    albumsCount: 54
  },
  {
    id: "10630288",
    name: "Sachin-Jigar",
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=60" }
    ],
    albumsCount: 32
  }
];

export default function App() {
  // Navigation states
  const [selectedNav, setSelectedNav] = useState('Home');
  const [profileTab, setProfileTab] = useState('liked'); // 'liked' | 'playlists' | 'downloads'

  // Search states
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Authentication states
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Network Offline sync state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Playlist & Liked states
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

  // Playback queue & indexing
  const [queue, setQueue] = useState(FALLBACK_SONGS);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Audio configuration settings
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'one' | 'all'
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

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
  const [instrumentalCache, setInstrumentalCache] = useState({}); // songId -> url string

  // Timed Lyrics states
  const [showLyrics, setShowLyrics] = useState(false);
  const [lyricsLines, setLyricsLines] = useState([]);
  const [lyricsSynced, setLyricsSynced] = useState(false);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsActiveIndex, setLyricsActiveIndex] = useState(-1);

  // Downloads states
  const [downloadingSongs, setDownloadingSongs] = useState({}); // songId -> boolean
  const [downloadedSongsList, setDownloadedSongsList] = useState([]);

  // Mock UI state (artists and fallback counts)
  const [topArtists, setTopArtists] = useState(FALLBACK_ARTISTS);
  const [likeCounts, setLikeCounts] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeMenuSongId, setActiveMenuSongId] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(isMockFirebase);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);
  const vocalRemoverRef = useRef(null);

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
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
      addToast("Network connection restored!", "success");
      syncOfflineData();
    };
    const goOffline = () => {
      setIsOffline(true);
      addToast("Network lost. Running in offline cache mode.", "warning");
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
      // Fetch latest states from localStorage written during offline
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
      
      // Hydrate from Firestore once synched
      const likes = await UserDataService.getLikedSongs(currentUser.uid);
      const playlistList = await UserDataService.getPlaylists(currentUser.uid);
      setLikedSongs(new Set(likes.map(s => s.id)));
      setLikedSongsData(likes);
      setPlaylists(playlistList);
      
      addToast("Successfully synchronized offline data with Cloud Firestore!", "success");
    } catch (e) {
      console.warn("Failed syncing offline data:", e);
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
          const likes = await UserDataService.getLikedSongs(user.uid);
          const playlistList = await UserDataService.getPlaylists(user.uid);
          const downloads = await UserDataService.getDownloadedSongs(user.uid);
          
          setLikedSongs(new Set(likes.map(s => s.id)));
          setLikedSongsData(likes);
          setPlaylists(playlistList);
          setDownloadedSongsList(downloads);
        } catch (err) {
          console.error("Failed to hydrate user data:", err);
          addToast("Error loading cloud library. Using local defaults.", "warning");
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
  // VOCAL REMOVER LAZY INITIALIZER
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
  // API SEARCH & INITIAL FETCH
  // ----------------------------------------------------
  useEffect(() => {
    const fetchArtists = async () => {
      setArtistsLoading(true);
      try {
        const res = await fetch('https://jiosavnapi-production.up.railway.app/api/search/artists?query=popular&limit=4');
        const data = await res.json();
        if (data.success && data.data && data.data.results) {
          setTopArtists(data.data.results.map((artist, idx) => ({
            id: artist.id,
            name: artist.name,
            image: artist.image,
            albumsCount: (idx + 1) * 14 + 8
          })));
        }
      } catch (err) {
        console.warn("Using fallback artists due to API offline/error:", err);
      } finally {
        setArtistsLoading(false);
      }
    };
    fetchArtists();
  }, []);

  useEffect(() => {
    const term = searchQuery.trim() || 'trending';
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
          setIsDemoMode(isMockFirebase);

          const newCounts = { ...likeCounts };
          apiSongs.forEach(song => {
            if (!newCounts[song.id]) {
              newCounts[song.id] = Math.floor(Math.random() * 2000) + 150;
            }
          });
          setLikeCounts(newCounts);

          if (!currentSong && !isInJamRoom) {
            loadSongAtIndex(apiSongs, 0, false);
          }
        } else {
          if (searchQuery.trim() !== '') {
            addToast(`No results found for "${searchQuery}". Showing featured songs.`, 'warning');
          }
          setSongs(FALLBACK_SONGS);
          setQueue(FALLBACK_SONGS);
        }
      } catch (err) {
        console.warn("Using fallback songs due to API error:", err);
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
  }, [searchQuery]);

  // ----------------------------------------------------
  // AUDIO CONTROLS & STATE SYNC
  // ----------------------------------------------------
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio playback prevented by browser restrictions:", err);
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong?.audioUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

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
        
        const res = await lyricsService.fetchLyrics(
          currentSong.id,
          currentSong.name,
          currentSong.artist,
          dur
        );

        if (res.error) {
          setLyricsLines([]);
          setLyricsSynced(false);
        } else {
          setLyricsLines(res.lines);
          setLyricsSynced(res.synced);
        }
      } catch (err) {
        console.error("Lyrics load error:", err);
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
        // Room ended
        addToast("Jam Room ended by host", "info");
        exitJamRoom();
        return;
      }

      setJamRoomData(room);

      if (!isHost) {
        // Participant state synchronization
        if (room.currentSong) {
          const song = room.currentSong;
          if (currentSong?.id !== song.id) {
            setCurrentSong({
              id: song.id,
              name: song.title,
              artist: song.primaryArtists,
              image: song.image,
              audioUrl: song.downloadUrl
            });
            // Reset local separation status when host changes song
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
              console.log(`[Jam Room] Latency offset: ${offset.toFixed(2)}s. Seeking...`);
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
    }, 5000); // Sync positions every 5s

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
  const loadSongAtIndex = (songList, index, autoPlay = true) => {
    if (!songList || songList.length === 0) return;
    const targetIdx = (index + songList.length) % songList.length;
    const song = songList[targetIdx];
    
    // Disable active Tune Mode filter chain when swapping songs
    if (tuneModeActive) {
      if (vocalRemoverRef.current) {
        vocalRemoverRef.current.setTuneMode(false);
      }
      setTuneModeActive(false);
    }
    
    setCurrentSong({
      id: song.id,
      name: song.name,
      artist: song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist',
      image: song.image?.[2]?.url || song.image?.[1]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
      audioUrl: song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || song.audioUrl || ''
    });
    
    setCurrentIndex(targetIdx);
    setIsPlaying(autoPlay);
  };

  const handlePlaySong = async (song, idx) => {
    // Gating for Jam Room participants
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can change tracks in a Jam Room", "warning");
        return;
      } else {
        addToast("Syncing track to Jam Room...", "info");
        try {
          // Resolve 320kbps URL first
          const res = await fetch(`https://jiosavnapi-production.up.railway.app/api/songs/${song.id}`);
          const json = await res.json();
          const targetSong = json.data?.[0] || json.data?.results?.[0] || song;
          const downloadUrl = targetSong.downloadUrl?.[4]?.url || targetSong.downloadUrl?.[0]?.url || song.audioUrl || '';
          
          const payload = {
            id: song.id,
            name: song.name,
            artist: song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist',
            image: song.image?.[2]?.url || song.image?.[1]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500',
            audioUrl: downloadUrl
          };
          
          await JamRoomService.updateSong(jamRoomCode, payload);
          // Set host local song
          setCurrentSong(payload);
          setIsPlaying(true);
        } catch (e) {
          console.warn("Failed resolving track, playing standard:", e);
          await JamRoomService.updateSong(jamRoomCode, song);
          loadSongAtIndex(songs, idx, true);
        }
        return;
      }
    }

    setQueue(songs);
    loadSongAtIndex(songs, idx, true);
    addToast(`Now playing: ${song.name}`, 'success');
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

  const handleAudioEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
        handleHostPlaybackUpdate(true, 0);
      }
    } else if (repeat === 'all' || currentIndex < queue.length - 1) {
      handleNext();
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
      handleHostPlaybackUpdate(false, 0);
    }
  };

  const handleScrubberChange = (e) => {
    if (isInJamRoom && jamRoomData && currentUser) {
      const isHost = jamRoomData.hostUid === currentUser.uid;
      if (!isHost) {
        addToast("Only the host can seek tracks", "warning");
        return;
      }
    }

    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      handleHostPlaybackUpdate(isPlaying, newTime);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ----------------------------------------------------
  // FIREBASE USER DATA OPERATIONS
  // ----------------------------------------------------
  const toggleLikeSong = async (songId, songName) => {
    if (!currentUser) {
      addToast("Please log in to like songs and save playlists!", "warning");
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
        setLikeCounts(prev => ({ ...prev, [songId]: Math.max(0, (prev[songId] || 1) - 1) }));
        addToast(`Removed "${songName}" from Favorites`, 'trash');
      } else {
        // Get target song object
        const fullSong = songs.find(s => s.id === songId) || queue.find(s => s.id === songId) || currentSong;
        const saved = await UserDataService.addLikedSong(currentUser.uid, fullSong);
        setLikedSongs(prev => {
          const next = new Set(prev);
          next.add(songId);
          return next;
        });
        setLikedSongsData(prev => [...prev, saved]);
        setLikeCounts(prev => ({ ...prev, [songId]: (prev[songId] || 0) + 1 }));
        addToast(`Added "${songName}" to Favorites`, 'heart');
      }
    } catch (e) {
      addToast("Sync error liking track.", "warning");
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
      if (selectedNav === playlistName) setSelectedNav('Home');
    } catch (err) {
      addToast("Failed to delete playlist", "warning");
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId, songName) => {
    if (!currentUser) return;
    try {
      await UserDataService.addSongToPlaylist(currentUser.uid, playlistId, songId);
      // Hydrate state updates
      const updated = await UserDataService.getPlaylists(currentUser.uid);
      setPlaylists(updated);
      addToast(`Added "${songName}" to playlist!`, 'success');
      setActiveMenuSongId(null);
    } catch (err) {
      addToast("Failed to add track to playlist", "warning");
    }
  };

  // ----------------------------------------------------
  // DOWNLOAD MANAGER (IndexedDB Cache + UserData Sync)
  // ----------------------------------------------------
  const handleDownloadTrack = async (song) => {
    if (!currentUser) {
      addToast("Please login to download tracks for offline listening!", "warning");
      return;
    }

    const songId = song.id;
    const downloadUrl = song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || song.audioUrl;

    if (!downloadUrl) {
      addToast("No high-quality playback stream available to download.", "warning");
      return;
    }

    setDownloadingSongs(prev => ({ ...prev, [songId]: true }));
    addToast(`Starting download: "${song.name}"...`, "info");

    try {
      await localCache.cacheSong(songId, downloadUrl);
      const virtualPath = `indexeddb://songs/${songId}`;
      const saved = await UserDataService.addDownloadedSong(currentUser.uid, songId, song.name, virtualPath);
      
      // Hydrate downloads list
      const downloads = await UserDataService.getDownloadedSongs(currentUser.uid);
      setDownloadedSongsList(downloads);
      
      addToast(`Downloaded "${song.name}" successfully! Available offline.`, "success");
    } catch (err) {
      console.error(err);
      addToast("Failed to download track locally.", "warning");
    } finally {
      setDownloadingSongs(prev => ({ ...prev, [songId]: false }));
      setActiveMenuSongId(null);
    }
  };

  const handlePlayDownloadedSong = async (songId, title) => {
    try {
      const cachedUrl = await localCache.getCachedUrl(songId);
      
      // Swap song to local object URL source
      setCurrentSong({
        id: songId,
        name: title,
        artist: 'Offline Download',
        image: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=200',
        audioUrl: cachedUrl
      });
      
      setIsPlaying(true);
      addToast(`Playing locally cached track: ${title}`, "success");
    } catch (err) {
      console.error(err);
      addToast("Cached file corrupted or missing from browser storage.", "warning");
    }
  };

  const handleDeleteDownloadedSong = async (songId, title) => {
    if (!currentUser) return;
    try {
      await localCache.deleteSong(songId);
      await UserDataService.removeDownloadedSong(currentUser.uid, songId);
      
      // Hydrate
      const downloads = await UserDataService.getDownloadedSongs(currentUser.uid);
      setDownloadedSongsList(downloads);
      
      addToast(`Removed "${title}" local files.`, "trash");
    } catch (err) {
      addToast("Error deleting local files", "warning");
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
      // Deactivate Tune Mode
      setTuneModeActive(false);
      if (vocalRemoverRef.current) {
        vocalRemoverRef.current.setTuneMode(false);
      }
      
      // Fetch original URL
      const songDetails = queue.find(s => s.id === songId) || currentSong;
      const originalUrl = songDetails.downloadUrl?.[4]?.url || songDetails.downloadUrl?.[0]?.url || songDetails.audioUrl || '';
      
      const wasPlaying = isPlaying;
      const time = audioRef.current?.currentTime || 0;
      
      setCurrentSong(prev => ({ ...prev, audioUrl: originalUrl }));
      
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (wasPlaying) audioRef.current.play();
        }
      }, 100);
      
      addToast("Tune Mode disabled. Vocals restored.", "info");
    } else {
      // Activate Tune Mode
      setTuneModeLoading(true);
      
      // 1. Check client state cache first
      if (instrumentalCache[songId]) {
        applyInstrumental(instrumentalCache[songId]);
        setTuneModeLoading(false);
        setTuneModeActive(true);
        addToast("Tune Mode active (cached instrumental loaded)", "success");
        return;
      }

      // 2. Query AI Separation Backend
      try {
        const payloadUrl = queue.find(s => s.id === songId)?.downloadUrl?.[4]?.url || currentSong.audioUrl;
        
        const response = await fetch(`${backendUrl}/api/separate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            songId,
            songUrl: payloadUrl
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.instrumentalUrl) {
            const instUrl = data.instrumentalUrl;
            
            // Cache instrumental
            setInstrumentalCache(prev => ({ ...prev, [songId]: instUrl }));
            applyInstrumental(instUrl);
            setTuneModeActive(true);
            addToast("Tune Mode active (vocals removed)", "success");
            return;
          }
        }
        throw new Error("Vocal separator backend failed");
      } catch (err) {
        console.warn("Vocal separation backend error. Falling back to client biquad filters:", err);
        addToast("Vocal separation server offline. Using client filter fallback.", "warning");
        
        // 3. Fallback to web audio center cancellation
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
      addToast("Log in first to host a Jam session!", "warning");
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
      addToast("Log in first to join a Jam session!", "warning");
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
  // GOOGLE LOGIN HANDLER
  // ----------------------------------------------------
  const handleGoogleLogin = async () => {
    try {
      await AuthService.signInWithGoogle();
      addToast("Successfully logged in with Google!", "success");
    } catch (err) {
      console.error(err);
      addToast("Google Sign-in failed.", "warning");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await AuthService.signOut();
      setSelectedNav('Home');
      addToast("Signed out. Local files preserved.", "info");
    } catch (e) {
      addToast("Logout failed.", "warning");
    }
  };

  return (
    <div className="flex h-screen w-screen bg-brand-near-black text-brand-text-primary overflow-hidden font-inter select-none antialiased">
      
      {/* HTML5 Audio Element (Always mounted for node caching) */}
      <audio
        ref={audioRef}
        src={currentSong?.audioUrl || ''}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleAudioEnded}
      />

      {/* FIREBASE AUTH SCREEN (FORCED LOGIN WITH GUEST OPTION) */}
      {isAuthLoading ? (
        <div className="flex-1 h-full bg-brand-near-black flex flex-col items-center justify-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-accent-start to-brand-accent-end flex items-center justify-center animate-pulse">
            <Music className="w-9 h-9 text-white animate-bounce" />
          </div>
          <div className="flex items-center gap-2 text-brand-text-secondary text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-brand-accent-end" />
            Initializing Premium Environment...
          </div>
        </div>
      ) : !currentUser ? (
        <div className="flex-1 h-full bg-brand-near-black flex items-center justify-center p-6 relative overflow-hidden">
          {/* Decorative Backdrops */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent-start/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-accent-end/10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3 pointer-events-none" />
          
          <div className="bg-brand-panel border border-brand-border/60 p-10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col items-center text-center relative z-10 backdrop-blur-md">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-brand-accent-start to-brand-accent-end flex items-center justify-center mb-6 shadow-lg shadow-brand-accent-start/20">
              <Music className="w-7 h-7 text-white" />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">OMusic</h1>
            <p className="text-brand-text-secondary text-sm mb-8 leading-relaxed">
              Experience ultra-high-definition audio separation, timely synced lyrics, and synchronized party Jam Rooms.
            </p>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleGoogleLogin}
                className="w-full bg-white hover:bg-neutral-100 text-black font-bold text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all transform active:scale-98 duration-100 shadow-md cursor-pointer"
              >
                {/* Google Icon SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                onClick={async () => {
                  setIsDemoMode(true);
                  // Setup mock user
                  const mock = await AuthService.signInWithGoogle();
                  addToast("Entered as Demo Guest", "info");
                }}
                className="w-full bg-transparent hover:bg-white/5 text-brand-text-secondary hover:text-white border border-brand-border/80 font-bold text-sm py-3.5 px-4 rounded-xl transition-all transform active:scale-98 cursor-pointer"
              >
                Try as Demo Guest
              </button>
            </div>
            
            <p className="text-[10px] text-brand-text-tertiary mt-8">
              Secured by Firebase Web SDK modular encryption.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* LEFT SIDEBAR (220px fixed) */}
          <aside className="w-[220px] h-full flex-shrink-0 bg-brand-panel border-r border-brand-border flex flex-col justify-between py-6">
            <div className="flex flex-col gap-6 px-4 flex-1 overflow-y-auto">
              
              {/* App Logo */}
              <div className="flex items-center gap-2 px-2 py-1">
                <div className="h-8 w-8 rounded-brand-btn bg-gradient-to-br from-brand-accent-start to-brand-accent-end flex items-center justify-center shadow-lg shadow-brand-accent-start/15">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
                  OMusic
                  {isDemoMode && (
                    <span className="text-[8px] font-bold bg-yellow-500/10 text-yellow-400 px-1 py-0.5 rounded uppercase tracking-widest border border-yellow-500/10">Demo</span>
                  )}
                </span>
              </div>

              {/* Search input in sidebar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search songs..."
                  value={searchVal}
                  onChange={(e) => {
                    setSearchVal(e.target.value);
                    if (selectedNav !== 'Home' && selectedNav !== 'Discover') setSelectedNav('Home');
                  }}
                  className="w-full bg-brand-card text-sm text-white placeholder-brand-text-tertiary pl-9 pr-4 py-2 rounded-brand-btn border border-brand-border focus:border-brand-accent-start focus:outline-none transition-colors"
                />
                {searchVal && (
                  <button 
                    onClick={() => setSearchVal('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-white text-xs font-semibold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Nav Sections: MENU */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-brand-text-tertiary tracking-wider uppercase px-2 mb-1">Menu</p>
                {[
                  { name: 'Home', icon: Home },
                  { name: 'Jam Room 👥', icon: Users, id: 'JamRoom' },
                  { name: 'Discover', icon: Compass },
                  { name: 'Radio', icon: Radio }
                ].map(item => {
                  const Icon = item.icon;
                  const targetName = item.id || item.name;
                  const isActive = selectedNav === targetName;
                  return (
                    <button
                      key={targetName}
                      onClick={() => {
                        setSelectedNav(targetName);
                        // Reset search context if switching tabs
                        if (targetName !== 'Home') {
                          setSearchVal('');
                          setSearchQuery('');
                        }
                      }}
                      className={`relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-brand-btn transition-colors w-full text-left group ${
                        isActive 
                          ? 'bg-white/5 text-white font-semibold' 
                          : 'text-brand-text-secondary hover:text-white hover:bg-white/2'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r" />
                      )}
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-brand-text-secondary group-hover:text-white'}`} />
                      {item.name}
                    </button>
                  );
                })}
              </div>

              {/* Nav Sections: LIBRARY */}
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold text-brand-text-tertiary tracking-wider uppercase px-2 mb-1">Library</p>
                {[
                  { name: 'My Space', icon: User, id: 'Profile' }
                ].map(item => {
                  const Icon = item.icon;
                  const targetName = item.id || item.name;
                  const isActive = selectedNav === targetName;
                  return (
                    <button
                      key={targetName}
                      onClick={() => setSelectedNav(targetName)}
                      className={`relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-brand-btn transition-colors w-full text-left group ${
                        isActive 
                          ? 'bg-white/5 text-white font-semibold' 
                          : 'text-brand-text-secondary hover:text-white hover:bg-white/2'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-r" />
                      )}
                      <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-white' : 'text-brand-text-secondary group-hover:text-white'}`} />
                      {item.name}
                    </button>
                  );
                })}
              </div>

              {/* PLAYLIST Section */}
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center justify-between px-2 mb-1">
                  <p className="text-[10px] font-bold text-brand-text-tertiary tracking-wider uppercase">Playlist</p>
                  <button 
                    onClick={() => {
                      if (!currentUser) {
                        addToast("Login first to build playlists!", "warning");
                        return;
                      }
                      setShowCreatePlaylistModal(true);
                    }}
                    className="text-[10px] font-bold text-brand-accent-end hover:underline"
                  >
                    + New
                  </button>
                </div>
                
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                  {playlists.length === 0 ? (
                    <div className="text-center py-4 px-2 border border-dashed border-brand-border rounded-brand-card">
                      <p className="text-xs text-brand-text-tertiary">No playlists</p>
                    </div>
                  ) : (
                    playlists.map(pl => (
                      <div
                        key={pl.id}
                        onClick={() => {
                          setSelectedNav('Profile');
                          setProfileTab('playlists');
                          addToast(`Viewing playlist: ${pl.name}`, 'info');
                        }}
                        className={`flex items-center justify-between p-1.5 rounded-brand-btn transition-all cursor-pointer group ${
                          selectedNav === 'Profile' && profileTab === 'playlists'
                            ? 'bg-white/5 text-white' 
                            : 'hover:bg-white/2 text-brand-text-secondary hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded bg-brand-card border border-brand-border flex items-center justify-center flex-shrink-0 text-brand-text-secondary">
                            <ListMusic className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate leading-tight">{pl.name}</p>
                            <p className="text-[10px] text-brand-text-tertiary leading-none mt-0.5">{pl.songIds?.length || 0} songs</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => handleDeletePlaylist(e, pl.id, pl.name)}
                          className="p-1 rounded text-brand-text-tertiary hover:text-[#EF4444] hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                          title="Delete playlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Offline sync status footer */}
            <div className="px-4 pt-4 border-t border-brand-border flex flex-col gap-2">
              {isOffline && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-2 rounded-brand-btn text-[10px]">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                  <span>Offline Sync Mode Active</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-brand-text-tertiary">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-yellow-500' : 'bg-emerald-500'} animate-pulse`} />
                  <span>{isOffline ? "Offline Cache" : "Cloud Online"}</span>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="text-[10px] text-brand-text-secondary hover:text-white flex items-center gap-1 transition-colors hover:underline cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3 h-3" />
                  Logout
                </button>
              </div>
            </div>
          </aside>

          {/* CENTER MAIN (flex-1) */}
          <main className="flex-1 h-full overflow-y-auto bg-brand-near-black flex flex-col relative">
            
            {/* Header toolbar */}
            <header className="flex items-center justify-between px-8 py-5 border-b border-brand-border bg-brand-near-black/50 backdrop-blur sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedNav('Home')}
                  className="w-8 h-8 rounded-full border border-brand-border bg-brand-card flex items-center justify-center text-brand-text-secondary hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-brand-text-tertiary font-medium">
                  {selectedNav === 'Home' ? 'Browsing featured records' : `Navigating: ${selectedNav}`}
                </span>
              </div>

              {/* Offline indicator top right */}
              <div className="flex items-center gap-4">
                {isInJamRoom && (
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    Jam Room active
                  </span>
                )}
                <span className="text-xs text-brand-text-tertiary">
                  Vocal Separator URL: <span className="font-semibold text-brand-text-secondary">Express Server</span>
                </span>
              </div>
            </header>

            {/* View Dispatcher */}
            <div className="p-8 flex flex-col gap-8 flex-1">
              
              {/* PROFILE SCREEN VIEW */}
              {selectedNav === 'Profile' && (
                <div className="flex flex-col gap-6">
                  {/* Profile Header */}
                  <div className="bg-brand-panel border border-brand-border rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border-2 border-brand-accent-start/40 p-0.5 overflow-hidden">
                        <img
                          src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}
                          alt={currentUser?.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white leading-tight">{currentUser?.displayName || 'Demo User'}</h2>
                        <p className="text-xs text-brand-text-secondary mt-0.5">{currentUser?.email || 'guest@omusic.com'}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleGoogleLogout}
                      className="bg-brand-card hover:bg-white/5 border border-brand-border text-brand-text-secondary hover:text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>

                  {/* Profile Tabs */}
                  <div className="flex border-b border-brand-border/60">
                    {[
                      { id: 'liked', label: `Favorites (${likedSongsData.length})` },
                      { id: 'playlists', label: `Playlists (${playlists.length})` },
                      { id: 'downloads', label: `Downloaded Files (${downloadedSongsList.length})` }
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => setProfileTab(t.id)}
                        className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                          profileTab === t.id 
                            ? 'border-brand-accent-end text-white' 
                            : 'border-transparent text-brand-text-secondary hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Tab Contents */}
                  <div className="mt-2">
                    
                    {profileTab === 'liked' && (
                      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                        {likedSongsData.length === 0 ? (
                          <div className="p-12 text-center text-brand-text-secondary text-sm">
                            No favorite songs added yet. Click ❤️ on any track!
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-brand-border text-[10px] font-bold text-brand-text-tertiary uppercase tracking-wider">
                                <th className="py-4 px-6 text-center w-12">#</th>
                                <th className="py-4 px-4">Title</th>
                                <th className="py-4 px-4">Artist</th>
                                <th className="py-4 px-6 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {likedSongsData.map((song, idx) => (
                                <tr
                                  key={song.id}
                                  onClick={() => handlePlaySong({ ...song, name: song.title, artist: song.primaryArtists }, idx)}
                                  className="group border-b border-brand-border/40 hover:bg-white/2 transition-colors cursor-pointer"
                                >
                                  <td className="py-3 px-6 text-center font-medium text-brand-text-secondary">{idx + 1}</td>
                                  <td className="py-3 px-4 font-semibold text-white">
                                    <div className="flex items-center gap-3">
                                      <img src={song.image} className="w-10 h-10 rounded object-cover" />
                                      <span>{song.title}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-brand-text-secondary">{song.primaryArtists}</td>
                                  <td className="py-3 px-6 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLikeSong(song.id, song.title);
                                      }}
                                      className="text-brand-accent-end hover:text-white"
                                    >
                                      <Heart className="w-4 h-4 fill-brand-accent-end" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}

                    {profileTab === 'playlists' && (
                      <div className="flex flex-col gap-6">
                        {playlists.map(pl => (
                          <div key={pl.id} className="bg-brand-card border border-brand-border rounded-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ListMusic className="w-5 h-5 text-brand-accent-start" />
                                {pl.name}
                              </h3>
                              <button
                                onClick={(e) => handleDeletePlaylist(e, pl.id, pl.name)}
                                className="text-brand-text-secondary hover:text-[#EF4444] text-xs font-semibold flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete Playlist
                              </button>
                            </div>

                            {/* Songs in Playlist */}
                            {(!pl.songIds || pl.songIds.length === 0) ? (
                              <p className="text-xs text-brand-text-tertiary">No tracks in this playlist yet.</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {pl.songIds.map((sid, sidx) => {
                                  return (
                                    <div 
                                      key={sid}
                                      onClick={() => {
                                        // Seek and play if resolved
                                        const found = songs.find(s => s.id === sid);
                                        if (found) {
                                          handlePlaySong(found, sidx);
                                        } else {
                                          addToast("Playing track...", "info");
                                          handlePlaySong({ id: sid, name: "Playlist Song", artist: "Library" }, sidx);
                                        }
                                      }}
                                      className="flex items-center justify-between p-2 rounded-lg hover:bg-white/2 cursor-pointer transition-all"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-brand-text-tertiary">{(sidx+1).toString().padStart(2, '0')}</span>
                                        <p className="text-xs font-semibold text-white">{sid}</p>
                                      </div>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await UserDataService.removeSongFromPlaylist(currentUser.uid, pl.id, sid);
                                          const refreshed = await UserDataService.getPlaylists(currentUser.uid);
                                          setPlaylists(refreshed);
                                          addToast("Track removed from playlist", "info");
                                        }}
                                        className="text-brand-text-tertiary hover:text-[#EF4444]"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {profileTab === 'downloads' && (
                      <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                        {downloadedSongsList.length === 0 ? (
                          <div className="p-12 text-center text-brand-text-secondary text-sm">
                            No offline songs cached. Click download button in context menus!
                          </div>
                        ) : (
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="border-b border-brand-border text-[10px] font-bold text-brand-text-tertiary uppercase tracking-wider">
                                <th className="py-4 px-6 text-center w-12">#</th>
                                <th className="py-4 px-4">Title</th>
                                <th className="py-4 px-4">Storage URL</th>
                                <th className="py-4 px-6 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {downloadedSongsList.map((song, idx) => (
                                <tr
                                  key={song.id}
                                  onClick={() => handlePlayDownloadedSong(song.id, song.title)}
                                  className="group border-b border-brand-border/40 hover:bg-white/2 transition-colors cursor-pointer"
                                >
                                  <td className="py-3 px-6 text-center font-medium text-brand-text-secondary">{idx + 1}</td>
                                  <td className="py-3 px-4 font-semibold text-white">{song.title}</td>
                                  <td className="py-3 px-4 text-brand-text-tertiary text-xs truncate max-w-xs">{song.localPath}</td>
                                  <td className="py-3 px-6 text-center">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteDownloadedSong(song.id, song.title);
                                      }}
                                      className="text-brand-text-tertiary hover:text-red-500 transition-colors p-1"
                                      title="Delete Cache"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* JAM ROOM TAB VIEW */}
              {selectedNav === 'JamRoom' && (
                <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
                  {!isInJamRoom ? (
                    // Join / Create Room UI
                    <div className="bg-brand-panel border border-brand-border p-8 rounded-2xl flex flex-col gap-6 shadow-xl">
                      <div className="flex flex-col gap-2">
                        <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                          <Users className="w-6 h-6 text-brand-accent-start" />
                          Jam Room Synchronization
                        </h2>
                        <p className="text-brand-text-secondary text-sm leading-relaxed">
                          Listen in synchrony with other listeners under 300ms latency. The host controls playback and selects music in real-time.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-brand-border/50">
                        {/* Start Jam Room */}
                        <div className="flex flex-col gap-3">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Host a Session</h3>
                          <p className="text-xs text-brand-text-tertiary">
                            Create a private room. You'll generate a code and retain controls to skip/play tracks.
                          </p>
                          <button
                            onClick={startJamRoom}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-brand-accent-start to-brand-accent-end hover:opacity-95 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                          >
                            {isLoading ? 'Creating Room...' : 'Start a Jam'}
                          </button>
                        </div>

                        {/* Join Jam Room */}
                        <div className="flex flex-col gap-3 border-t md:border-t-0 md:border-l border-brand-border/50 pt-6 md:pt-0 md:pl-6">
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Join a Jam</h3>
                          <p className="text-xs text-brand-text-tertiary">
                            Enter the 6-character room code shared by your friend to sync your playback.
                          </p>
                          
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="e.g. ABC123"
                              maxLength={6}
                              value={jamJoinCode}
                              onChange={(e) => setJamJoinCode(e.target.value.toUpperCase())}
                              className="bg-brand-card text-white text-sm font-semibold tracking-wider text-center uppercase placeholder-brand-text-tertiary px-4 py-3 rounded-xl border border-brand-border focus:border-brand-accent-start focus:outline-none flex-1"
                            />
                            <button
                              onClick={joinJamRoom}
                              disabled={isLoading}
                              className="bg-white hover:bg-neutral-100 text-black font-bold text-sm px-6 rounded-xl transition-all active:scale-98 cursor-pointer disabled:opacity-50"
                            >
                              Join
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Active Jam Room view
                    <div className="bg-brand-panel border border-brand-border p-8 rounded-2xl flex flex-col gap-6 shadow-xl relative">
                      {/* Jam Room Header */}
                      <div className="flex items-center justify-between border-b border-brand-border/60 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                          <div>
                            <span className="text-[10px] font-bold text-brand-text-tertiary uppercase tracking-widest">Active Party Session</span>
                            <h2 className="text-xl font-bold text-white">Room: <span className="text-brand-accent-end tracking-wider">{jamRoomCode}</span></h2>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="bg-brand-card hover:bg-white/5 border border-brand-border text-xs text-white font-semibold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                          >
                            Invite code
                          </button>
                          <button
                            onClick={exitJamRoom}
                            className="bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/20 text-[#EF4444] text-xs font-semibold py-2 px-4 rounded-xl transition-colors cursor-pointer"
                          >
                            Leave Room
                          </button>
                        </div>
                      </div>

                      {/* Display active song inside room */}
                      {jamRoomData?.currentSong ? (
                        <div className="bg-brand-card border border-brand-border/50 p-4 rounded-xl flex items-center gap-4">
                          <img 
                            src={jamRoomData.currentSong.image} 
                            alt={jamRoomData.currentSong.title}
                            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold text-brand-accent-start uppercase tracking-wider">Sync Streaming URL</span>
                            <h3 className="text-sm font-bold text-white truncate">{jamRoomData.currentSong.title}</h3>
                            <p className="text-xs text-brand-text-secondary truncate mt-0.5">{jamRoomData.currentSong.primaryArtists}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-brand-text-secondary text-xs">
                          Waiting for host to play a track...
                        </div>
                      )}

                      {/* Participants Row */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-brand-text-tertiary uppercase tracking-widest">Participants</span>
                        <div className="flex flex-wrap gap-3">
                          {Object.entries(jamRoomData?.participants || {}).map(([uid, p]) => {
                            const isUserHost = jamRoomData.hostUid === uid;
                            return (
                              <div 
                                key={uid}
                                className="flex items-center gap-2 bg-brand-card border border-brand-border/60 py-1.5 px-3 rounded-full"
                              >
                                <img src={p.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'} className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-xs font-semibold text-white">{p.displayName}</span>
                                {isUserHost && (
                                  <span className="text-[8px] font-bold uppercase bg-brand-accent-end/10 text-brand-accent-end px-1.5 py-0.5 rounded border border-brand-accent-end/10 ml-1">Host</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Host search control */}
                      {jamRoomData && currentUser && jamRoomData.hostUid === currentUser.uid && (
                        <div className="border-t border-brand-border/50 pt-4 flex flex-col gap-3">
                          <span className="text-[10px] font-bold text-brand-text-tertiary uppercase tracking-widest">Host Controls: Change Song</span>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
                            <input
                              type="text"
                              placeholder="Search songs to stream to party..."
                              value={searchVal}
                              onChange={(e) => setSearchVal(e.target.value)}
                              className="w-full bg-brand-card text-sm text-white placeholder-brand-text-tertiary pl-9 pr-4 py-2.5 rounded-xl border border-brand-border focus:border-brand-accent-start focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* HOME/DISCOVER MUSIC CONTENT PANELS */}
              {selectedNav !== 'Profile' && selectedNav !== 'JamRoom' && (
                <>
                  {/* Top Trending Section */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Flame className="w-5 h-5 text-[#EC4899] fill-[#EC4899]" />
                        Top Trending
                      </h2>
                      <button 
                        onClick={() => {
                          setSearchVal('');
                          setSearchQuery('');
                          addToast("Resetting to global trending...", 'info');
                        }} 
                        className="text-xs font-semibold text-brand-text-secondary hover:text-white hover:underline transition-colors cursor-pointer"
                      >
                        Reset Search
                      </button>
                    </div>

                    {/* Featured Hero Card */}
                    <div className="w-full bg-gradient-to-r from-brand-accent-start to-brand-accent-end rounded-brand-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                      
                      <div className="flex flex-col gap-2 z-10 max-w-lg">
                        <span className="w-fit text-[10px] font-bold uppercase tracking-widest text-white/80 bg-white/15 px-3 py-1 rounded-full border border-white/20">
                          Featured Playlist
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white mt-2 leading-tight">
                          Top Song Of The Week
                        </h1>
                        
                        {songs.length > 0 ? (
                          <div className="flex items-center gap-3 mt-1 bg-black/10 p-2 rounded-brand-btn w-fit border border-white/5">
                            <img 
                              src={songs[0].image?.[2]?.url || songs[0].image?.[0]?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100'} 
                              alt="" 
                              className="w-10 h-10 rounded object-cover"
                            />
                            <div>
                              <p className="text-sm font-bold text-white line-clamp-1">{songs[0].name}</p>
                              <p className="text-xs text-white/70 truncate">{songs[0].artists?.primary?.[0]?.name || 'Unknown Artist'}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-white/80">Loading weekly hits...</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 z-10 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (songs.length > 0) {
                              handlePlaySong(songs[0], 0);
                            }
                          }}
                          className="bg-white hover:bg-neutral-100 text-black font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
                        >
                          {isPlaying && currentSong?.id === songs[0]?.id ? (
                            <>
                              <Pause className="w-4 h-4 fill-black text-black" />
                              <span>Pause Now</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 fill-black text-black" />
                              <span>Play Track</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Global Top 50 Section */}
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Globe className="w-5 h-5 text-brand-accent-start" />
                        Global Top Songs
                      </h2>
                    </div>

                    {/* Songs Table Container */}
                    <div className="bg-brand-card border border-brand-border rounded-brand-card overflow-hidden">
                      {isLoading ? (
                        <div className="p-6 flex flex-col gap-4">
                          {[...Array(6)].map((_, idx) => (
                            <div key={idx} className="flex items-center justify-between animate-pulse">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-4 h-4 bg-brand-border rounded" />
                                <div className="w-10 h-10 bg-brand-border rounded" />
                                <div className="flex flex-col gap-2">
                                  <div className="w-32 h-3.5 bg-brand-border rounded" />
                                  <div className="w-20 h-2 bg-brand-border rounded" />
                                </div>
                              </div>
                              <div className="w-24 h-3 bg-brand-border rounded mr-6" />
                              <div className="w-12 h-3 bg-brand-border rounded" />
                            </div>
                          ))}
                        </div>
                      ) : songs.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                          <p className="text-brand-text-secondary text-sm">No songs available.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-brand-border text-[10px] font-bold text-brand-text-tertiary uppercase tracking-wider">
                                <th className="py-4 px-6 text-center w-12">#</th>
                                <th className="py-4 px-4">Title</th>
                                <th className="py-4 px-4">Artist</th>
                                <th className="py-4 px-4 text-center w-16">Like</th>
                                <th className="py-4 px-4 text-center w-20">Time</th>
                                <th className="py-4 px-6 text-center w-12"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {songs.map((song, idx) => {
                                const isCurrent = currentSong?.id === song.id;
                                const isLiked = likedSongs.has(song.id);
                                const artistName = song.artists?.primary?.[0]?.name || song.artist || 'Unknown Artist';
                                const songImage = song.image?.[2]?.url || song.image?.[0]?.url || song.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100';
                                const displayIdx = (idx + 1).toString().padStart(2, '0');
                                const isDownloading = downloadingSongs[song.id];

                                return (
                                  <tr
                                    key={song.id}
                                    onClick={() => handlePlaySong(song, idx)}
                                    className={`group border-b border-brand-border/40 hover:bg-white/2 transition-colors cursor-pointer text-sm ${
                                      isCurrent ? 'bg-white/3' : ''
                                    }`}
                                  >
                                    <td className="py-3 px-6 text-center font-medium text-brand-text-secondary">
                                      <div className="flex items-center justify-center">
                                        {isCurrent && isPlaying ? (
                                          <div className="flex items-end gap-[2px] h-3 w-3 justify-center">
                                            <span className="w-[2px] bg-brand-accent-start rounded-[1px] animate-bounce-bar-1" />
                                            <span className="w-[2px] bg-brand-accent-end rounded-[1px] animate-bounce-bar-2" style={{ animationDelay: '0.15s' }} />
                                            <span className="w-[2px] bg-brand-accent-start rounded-[1px] animate-bounce-bar-3" style={{ animationDelay: '0.3s' }} />
                                          </div>
                                        ) : (
                                          <span className={`group-hover:hidden ${isCurrent ? 'text-brand-accent-end' : ''}`}>
                                            {displayIdx}
                                          </span>
                                        )}
                                        <Play className={`w-3.5 h-3.5 fill-white text-white hidden group-hover:block ${isCurrent && isPlaying ? 'hidden group-hover:hidden' : ''}`} />
                                      </div>
                                    </td>

                                    <td className="py-3 px-4 font-semibold text-white">
                                      <div className="flex items-center gap-3">
                                        <img src={songImage} alt={song.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                        <span className={`truncate max-w-[200px] ${isCurrent ? 'text-brand-accent-end' : 'text-white'}`}>
                                          {song.name}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="py-3 px-4 text-brand-text-secondary font-medium">
                                      <span className="truncate max-w-[150px] block">{artistName}</span>
                                    </td>

                                    <td className="py-3 px-4 text-center">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleLikeSong(song.id, song.name);
                                        }}
                                        className="inline-flex items-center gap-1.5 text-brand-text-secondary hover:text-brand-accent-end transition-colors py-1 px-2 rounded-full hover:bg-white/5"
                                      >
                                        <Heart className={`w-4 h-4 transition-transform hover:scale-110 active:scale-90 ${isLiked ? 'fill-brand-accent-end text-brand-accent-end' : 'text-brand-text-tertiary'}`} />
                                      </button>
                                    </td>

                                    <td className="py-3 px-4 text-center text-brand-text-secondary font-medium">
                                      {formatTime(song.duration)}
                                    </td>

                                    <td className="py-3 px-6 text-center relative">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id);
                                        }}
                                        className="p-1 rounded text-brand-text-tertiary hover:text-white hover:bg-white/5 transition-colors"
                                      >
                                        <MoreHorizontal className="w-4 h-4" />
                                      </button>

                                      {activeMenuSongId === song.id && (
                                        <div 
                                          ref={menuRef}
                                          className="absolute right-6 top-10 bg-brand-panel border border-brand-border rounded-brand-card w-44 py-1.5 z-20"
                                        >
                                          {playlists.map(pl => (
                                            <button
                                              key={pl.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddSongToPlaylist(pl.id, song.id, song.name);
                                              }}
                                              className="w-full text-left px-3 py-1.5 text-[11px] text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 truncate"
                                            >
                                              <ListMusic className="w-3.5 h-3.5 flex-shrink-0" />
                                              Add to: {pl.name}
                                            </button>
                                          ))}
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(song.downloadUrl?.[4]?.url || song.audioUrl || window.location.href);
                                              addToast(`Copied streaming link!`, 'info');
                                              setActiveMenuSongId(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 text-[11px] text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-brand-border/40 mt-1 pt-1"
                                          >
                                            <Share2 className="w-3.5 h-3.5" />
                                            Copy Audio Link
                                          </button>
                                          
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadTrack(song);
                                            }}
                                            disabled={isDownloading}
                                            className="w-full text-left px-3 py-1.5 text-[11px] text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 disabled:opacity-50"
                                          >
                                            {isDownloading ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-accent-end" />
                                            ) : (
                                              <Download className="w-3.5 h-3.5" />
                                            )}
                                            Download 320kbps
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </main>

          {/* RIGHT SIDEBAR (280px fixed) */}
          <aside className="w-[280px] h-full flex-shrink-0 bg-brand-panel border-l border-brand-border flex flex-col justify-between py-6">
            
            {/* Top Area conditional renderer for Scrolling Lyrics OR User details */}
            <div className="px-6 flex flex-col gap-6 flex-1 overflow-y-auto min-h-0">
              {showLyrics && currentSong ? (
                // SYNCED LYRICS PANEL OVERLAY
                <div className="flex flex-col h-full gap-4 relative min-h-0">
                  {/* Lyrics Panel Header */}
                  <div className="flex items-center justify-between border-b border-brand-border/40 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Mic className="w-3.5 h-3.5 text-brand-accent-end" />
                      Live Lyrics
                    </span>
                    <button 
                      onClick={() => setShowLyrics(false)}
                      className="text-[10px] font-bold text-brand-text-secondary hover:text-white hover:underline cursor-pointer"
                    >
                      Hide
                    </button>
                  </div>

                  {/* Tune Mode active warning banner */}
                  {tuneModeActive && (
                    <div className="flex items-center gap-1.5 bg-brand-accent-start/20 border border-brand-accent-start/30 text-white p-2 rounded-lg text-[9px] font-semibold animate-pulse">
                      <Sparkles className="w-3 h-3 text-brand-accent-end flex-shrink-0" />
                      <span>🎵 Listening in Tune Mode — vocals removed</span>
                    </div>
                  )}

                  {/* Scrolling lyrics area */}
                  <div className="flex-1 overflow-y-auto py-4 pr-1 flex flex-col gap-3 min-h-0 relative scroll-smooth">
                    {lyricsLoading ? (
                      <div className="flex flex-col items-center justify-center h-48 gap-2 text-brand-text-tertiary">
                        <Loader2 className="w-5 h-5 animate-spin text-brand-accent-end" />
                        <span className="text-[10px]">Fetching syncing lyrics...</span>
                      </div>
                    ) : lyricsLines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center gap-1 text-brand-text-tertiary">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-xs font-semibold text-brand-text-secondary">Lyrics not available for this track</span>
                        <p className="text-[9px] max-w-[180px]">No matches found on JioSaavn or LRClib.</p>
                      </div>
                    ) : (
                      lyricsLines.map((line, lidx) => {
                        const isLineActive = lyricsSynced && lidx === lyricsActiveIndex;
                        return (
                          <p
                            key={lidx}
                            id={`lyric-line-${lidx}`}
                            className={`text-xs leading-relaxed font-semibold transition-all duration-300 ${
                              isLineActive 
                                ? 'text-brand-accent-end scale-105 font-bold text-sm bg-white/2 py-1.5 px-2 rounded-lg' 
                                : 'text-brand-text-secondary'
                            }`}
                          >
                            {line.text}
                          </p>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                // STANDARD USER INFO & ARTISTS LIST PANEL
                <>
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-brand-accent-start/40 p-0.5 overflow-hidden flex-shrink-0">
                        <img
                          src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={currentUser?.displayName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">{currentUser?.displayName || 'Oji Ganteng'}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-accent-start/15 text-brand-accent-end border border-brand-accent-start/10 uppercase tracking-widest">
                            Premium
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative">
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="w-8 h-8 rounded-full border border-brand-border hover:border-white text-brand-text-secondary hover:text-white transition-all flex items-center justify-center bg-brand-card"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      
                      {showNotifications && (
                        <div className="absolute right-0 top-10 bg-brand-card border border-brand-border rounded-brand-card w-56 p-3 z-30">
                          <p className="text-[10px] font-bold uppercase text-brand-text-tertiary tracking-wider border-b border-brand-border pb-1.5 mb-2">Notifications</p>
                          <div className="flex flex-col gap-2">
                            <div className="text-[11px] text-brand-text-secondary">
                              <p className="font-semibold text-white leading-tight">Vocal Separator Active</p>
                              <p className="text-brand-text-tertiary text-[9px]">Spleeter & Demucs server live on port 3001.</p>
                            </div>
                            <div className="text-[11px] text-brand-text-secondary border-t border-brand-border/40 pt-1.5">
                              <p className="font-semibold text-white leading-tight">Jam Rooms enabled</p>
                              <p className="text-brand-text-tertiary text-[9px]">Sync party queues with friends.</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Artists Row */}
                  <div className="flex flex-col gap-4 mt-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-brand-accent-end" />
                        Top Artists
                      </h2>
                    </div>

                    <div className="flex flex-col gap-3">
                      {artistsLoading ? (
                        [...Array(3)].map((_, idx) => (
                          <div key={idx} className="flex items-center gap-3 animate-pulse">
                            <div className="w-8 h-8 rounded-full bg-brand-border" />
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="w-24 h-2.5 bg-brand-border rounded" />
                              <div className="w-16 h-2 bg-brand-border rounded" />
                            </div>
                          </div>
                        ))
                      ) : (
                        topArtists.slice(0, 3).map((artist, idx) => {
                          const artistImg = artist.image?.[2]?.url || artist.image?.[1]?.url || artist.image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                          return (
                            <div 
                              key={artist.id}
                              onClick={() => {
                                setSearchVal(artist.name);
                                addToast(`Searching for "${artist.name}"...`, 'info');
                              }}
                              className="flex items-center gap-3 group/art cursor-pointer py-1 px-1.5 rounded-brand-btn hover:bg-white/2 transition-colors"
                            >
                              <img src={artistImg} alt={artist.name} className="w-9 h-9 rounded-full object-cover border border-brand-border/40 group-hover/art:border-brand-accent-start/40 flex-shrink-0 transition-colors" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white group-hover/art:text-brand-accent-end truncate transition-colors">{artist.name}</p>
                                <p className="text-[10px] text-brand-text-tertiary truncate leading-none mt-0.5">{artist.albumsCount} Albums</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom: Music Player Card */}
            <div className="px-4 mt-auto">
              <div className="bg-brand-card border border-brand-border rounded-brand-card p-4 flex flex-col gap-4">
                
                {/* Album art + Song details */}
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 flex-shrink-0">
                    <img
                      src={currentSong?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200'}
                      alt={currentSong?.name || 'OMusic'}
                      className={`w-full h-full rounded-[10px] object-cover ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`}
                    />
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate marquee-container">
                      <span className="marquee-text block">{currentSong?.name || 'No song selected'}</span>
                    </p>
                    <p className="text-[10px] text-brand-text-secondary truncate mt-0.5">{currentSong?.artist || 'Select a song to start'}</p>
                  </div>

                  {currentSong && (
                    <button
                      onClick={() => toggleLikeSong(currentSong.id, currentSong.name)}
                      className="p-1 rounded text-brand-text-secondary hover:text-brand-accent-end transition-colors cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${likedSongs.has(currentSong.id) ? 'fill-brand-accent-end text-brand-accent-end' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Scrubber slider + Time display */}
                <div className="flex flex-col gap-1.5">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleScrubberChange}
                    className="w-full cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[9px] font-bold text-brand-text-tertiary">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Player Toolbar: Lyrics, Tune Mode */}
                <div className="flex items-center justify-between px-1 border-b border-brand-border/40 pb-2.5">
                  {/* Lyrics Panel Toggle */}
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    disabled={!currentSong}
                    className={`flex items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-full border transition-all cursor-pointer disabled:opacity-40 ${
                      showLyrics 
                        ? 'border-brand-accent-end text-brand-accent-end bg-brand-accent-end/10' 
                        : 'border-brand-border text-brand-text-secondary hover:text-white hover:border-white'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    Lyrics
                  </button>

                  {/* AI Tune Mode (Vocal separation) Toggle */}
                  <button
                    onClick={handleTuneModeToggle}
                    disabled={!currentSong || tuneModeLoading}
                    className={`flex items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-full border transition-all cursor-pointer disabled:opacity-40 ${
                      tuneModeActive 
                        ? 'border-brand-accent-start text-brand-accent-start bg-brand-accent-start/15' 
                        : 'border-brand-border text-brand-text-secondary hover:text-white hover:border-white'
                    }`}
                    title="Vocal Separator Filter"
                  >
                    {tuneModeLoading ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-brand-accent-start" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-brand-accent-start" />
                        Tune Mode 🎵
                      </>
                    )}
                  </button>
                </div>

                {/* Playback Control Actions */}
                <div className="flex items-center justify-between px-2">
                  <button
                    onClick={() => {
                      setShuffle(!shuffle);
                      addToast(shuffle ? "Shuffle OFF" : "Shuffle ON", 'info');
                    }}
                    className={`p-1.5 rounded transition-all hover:bg-white/5 cursor-pointer ${shuffle ? 'text-brand-accent-end' : 'text-brand-text-tertiary'}`}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handlePrev}
                    disabled={!currentSong}
                    className="p-1.5 rounded text-brand-text-secondary hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <SkipBack className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 duration-100 hover:bg-neutral-100 cursor-pointer animate-[fadeIn_0.1s]"
                  >
                    {isPlaying ? (
                      <Pause className="w-4.5 h-4.5 fill-black text-black" />
                    ) : (
                      <Play className="w-4.5 h-4.5 fill-black text-black translate-x-[1px]" />
                    )}
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={!currentSong}
                    className="p-1.5 rounded text-brand-text-secondary hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4 fill-current" />
                  </button>

                  <button
                    onClick={() => {
                      const next = repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none';
                      setRepeat(next);
                      addToast(next === 'all' ? "Repeat ALL" : next === 'one' ? "Repeat THIS track" : "Repeat OFF", 'info');
                    }}
                    className={`p-1.5 rounded transition-all hover:bg-white/5 relative cursor-pointer ${repeat !== 'none' ? 'text-brand-accent-end' : 'text-brand-text-tertiary'}`}
                  >
                    <Repeat className="w-4 h-4" />
                    {repeat === 'one' && (
                      <span className="absolute bottom-[2px] right-[2px] bg-brand-accent-end text-black text-[7px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center scale-90 border border-brand-card">1</span>
                    )}
                  </button>
                </div>

                {/* Extra Volume Control */}
                <div className="flex items-center gap-2 border-t border-brand-border/40 pt-3 px-1">
                  <button onClick={() => setIsMuted(!isMuted)} className="text-brand-text-secondary hover:text-white cursor-pointer">
                    {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value));
                      if (isMuted) setIsMuted(false);
                    }}
                    className="w-full cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                  />
                </div>

                {/* Disclaimer for Tune Mode Biquad cancellation */}
                {tuneModeActive && !instrumentalCache[currentSong?.id] && (
                  <span className="text-[8px] text-brand-text-tertiary leading-tight block text-center px-2">
                    * Tune Mode uses local Web Audio filters; results vary by track format.
                  </span>
                )}

              </div>
            </div>

          </aside>

          {/* CREATE PLAYLIST MODAL */}
          {showCreatePlaylistModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-brand-panel border border-brand-border p-6 rounded-2xl w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-[fadeIn_0.15s_ease-out]">
                <h3 className="text-lg font-bold text-white">Create Custom Playlist</h3>
                <input
                  type="text"
                  placeholder="e.g. My Workout Playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  className="bg-brand-card border border-brand-border text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-brand-accent-start"
                />
                <div className="flex gap-2 justify-end">
                  <button 
                    onClick={() => setShowCreatePlaylistModal(false)}
                    className="text-xs text-brand-text-secondary hover:text-white font-semibold py-2 px-4 rounded-xl border border-brand-border hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleCreatePlaylist}
                    className="bg-gradient-to-r from-brand-accent-start to-brand-accent-end text-white text-xs font-bold py-2 px-5 rounded-xl shadow-md"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* JAM ROOM INVITE MODAL */}
          {showInviteModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-brand-panel border border-brand-border p-6 rounded-2xl w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl text-center">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-bold text-white">Invite Friends to Jam</h3>
                  <p className="text-xs text-brand-text-secondary">Scan QR code or enter code below to join in real-time synchrony.</p>
                </div>

                {/* QR Code */}
                <div className="p-3 bg-white rounded-xl shadow-inner">
                  <QRCodeSVG 
                    value={`https://omusic.web.app/jam?code=${jamRoomCode}`} 
                    size={160} 
                    level="M"
                  />
                </div>

                <div className="flex items-center gap-2 bg-brand-card border border-brand-border/60 py-2 px-4 rounded-xl w-full justify-between">
                  <span className="text-lg font-extrabold text-white tracking-widest select-all">{jamRoomCode}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(jamRoomCode);
                      setCopiedCode(true);
                      addToast("Invite code copied!", "success");
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="text-brand-text-secondary hover:text-white p-1"
                  >
                    {copiedCode ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowInviteModal(false)}
                  className="w-full bg-white hover:bg-neutral-100 text-black font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* TOAST NOTIFIER */}
          <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
            {toasts.map(t => (
              <div
                key={t.id}
                className="px-4 py-2.5 rounded-brand-btn text-xs font-semibold text-white bg-brand-card border border-brand-border shadow-xl flex items-center gap-2 pointer-events-auto transform translate-y-0 transition-transform duration-300 animate-[fadeIn_0.2s_ease-out]"
              >
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {t.type === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-500" />}
                {t.type === 'heart' && <Heart className="w-4 h-4 text-[#EC4899] fill-[#EC4899]" />}
                {t.type === 'trash' && <Trash2 className="w-4 h-4 text-red-500" />}
                {t.type === 'info' && <Sparkles className="w-4 h-4 text-brand-accent-start" />}
                <span>{t.message}</span>
              </div>
            ))}
          </div>

          <SpeedInsights />
        </>
      )}
    </div>
  );
}
