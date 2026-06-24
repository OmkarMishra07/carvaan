import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Search, Heart, 
  MoreHorizontal, Bell, Home, Compass, Radio, Mic, Music, User, 
  Trash2, Volume2, VolumeX, ChevronLeft, ChevronRight, Share2, 
  Download, ListMusic, Flame, Award, Globe, Sparkles, CheckCircle2,
  FolderOpen
} from 'lucide-react';

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
  },
  {
    id: "ocean_breeze",
    name: "Ocean Breeze",
    artists: { primary: [{ name: "Nature Acoustic" }] },
    duration: 240,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
    ]
  },
  {
    id: "cyberpunk_city",
    name: "Cyberpunk City",
    artists: { primary: [{ name: "Synth Runner" }] },
    duration: 310,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1515462277126-270d878326e5?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" }
    ]
  },
  {
    id: "acoustic_sunset",
    name: "Acoustic Sunset",
    artists: { primary: [{ name: "Taylor Strings" }] },
    duration: 270,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" }
    ]
  },
  {
    id: "retrowave_night",
    name: "Retrowave Night",
    artists: { primary: [{ name: "Neon Rider" }] },
    duration: 290,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3" }
    ]
  },
  {
    id: "piano_serenade",
    name: "Piano Serenade",
    artists: { primary: [{ name: "Classical Keys" }] },
    duration: 350,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3" }
    ]
  },
  {
    id: "neon_horizon",
    name: "Neon Horizon",
    artists: { primary: [{ name: "Future Retro" }] },
    duration: 330,
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=500&auto=format&fit=crop&q=60" }
    ],
    downloadUrl: [
      {}, {}, {}, {},
      { url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3" }
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
  },
  {
    id: "10630294",
    name: "Lofi Collective",
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=60" }
    ],
    albumsCount: 18
  },
  {
    id: "10635388",
    name: "Synth Runner",
    image: [
      {}, {},
      { url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=60" }
    ],
    albumsCount: 25
  }
];

const INITIAL_PLAYLISTS = [
  {
    id: "pl1",
    name: "Chill Lofi Vibes",
    image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=100&auto=format&fit=crop&q=60",
    songsCount: 12
  },
  {
    id: "pl2",
    name: "Workout Boost",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=100&auto=format&fit=crop&q=60",
    songsCount: 8
  },
  {
    id: "pl3",
    name: "Coding Flow",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=100&auto=format&fit=crop&q=60",
    songsCount: 16
  },
  {
    id: "pl4",
    name: "Late Night Sax",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=100&auto=format&fit=crop&q=60",
    songsCount: 10
  }
];

export default function App() {
  // Navigation states
  const [selectedNav, setSelectedNav] = useState('Home');

  // Search states
  const [searchVal, setSearchVal] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio Playback states
  const [songs, setSongs] = useState(FALLBACK_SONGS);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Playback queue & indexing
  const [queue, setQueue] = useState(FALLBACK_SONGS);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Additional settings
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // 'none' | 'one' | 'all'
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);

  // Lists & data states
  const [topArtists, setTopArtists] = useState(FALLBACK_ARTISTS);
  const [playlists, setPlaylists] = useState(INITIAL_PLAYLISTS);
  const [likedSongs, setLikedSongs] = useState(new Set(["apna_bana_le", "summer_chill"]));
  const [likeCounts, setLikeCounts] = useState({
    "apna_bana_le": 1420,
    "midnight_vibes": 982,
    "summer_chill": 435,
    "focus_drive": 321,
    "ocean_breeze": 204,
    "cyberpunk_city": 612,
    "acoustic_sunset": 115,
    "retrowave_night": 277,
    "piano_serenade": 89,
    "neon_horizon": 54
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeMenuSongId, setActiveMenuSongId] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const searchInputRef = useRef(null);
  const menuRef = useRef(null);

  // Custom Toast helper
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Debouncing logic for Search (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 400);

    return () => clearTimeout(handler);
  }, [searchVal]);

  // Click outside to close options menu
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuSongId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Fetch top artists on component mount
  useEffect(() => {
    const fetchArtists = async () => {
      setArtistsLoading(true);
      try {
        const url = 'https://jiosavnapi-production.up.railway.app/api/search/artists?query=popular&limit=4';
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success && data.data && data.data.results && data.data.results.length > 0) {
          const formatted = data.data.results.map((artist, idx) => ({
            id: artist.id,
            name: artist.name,
            image: artist.image,
            albumsCount: (idx + 1) * 14 + 8 // Mock albums count for visual polish
          }));
          setTopArtists(formatted);
        } else {
          setTopArtists(FALLBACK_ARTISTS);
        }
      } catch (err) {
        console.warn("Using fallback artists due to API error:", err);
        setTopArtists(FALLBACK_ARTISTS);
      } finally {
        setArtistsLoading(false);
      }
    };

    fetchArtists();
  }, []);

  // Fetch songs based on debounced searchQuery
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
          setIsDemoMode(false);

          // Update like counts for new songs dynamically to look organic
          const newCounts = { ...likeCounts };
          apiSongs.forEach(song => {
            if (!newCounts[song.id]) {
              newCounts[song.id] = Math.floor(Math.random() * 2000) + 150;
            }
          });
          setLikeCounts(newCounts);

          // Auto-select first song if none is loaded
          if (!currentSong) {
            loadSongAtIndex(apiSongs, 0, false);
          }
        } else {
          // If query returned no results, default back to fallbacks
          if (searchQuery.trim() !== '') {
            addToast(`No results found for "${searchQuery}". Showing featured songs.`, 'warning');
          }
          setSongs(FALLBACK_SONGS);
          setQueue(FALLBACK_SONGS);
          setIsDemoMode(true);
        }
      } catch (err) {
        console.warn("Using fallback songs due to API error:", err);
        setSongs(FALLBACK_SONGS);
        setQueue(FALLBACK_SONGS);
        setIsDemoMode(true);
        if (!currentSong) {
          loadSongAtIndex(FALLBACK_SONGS, 0, false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, [searchQuery]);

  // Sync play/pause state with audio element
  useEffect(() => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn("Audio playback was prevented by browser restrictions:", err);
          setIsPlaying(false);
        });
      }
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, currentSong]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Load song at index inside a list
  const loadSongAtIndex = (songList, index, autoPlay = true) => {
    if (!songList || songList.length === 0) return;
    const targetIdx = (index + songList.length) % songList.length;
    const song = songList[targetIdx];
    
    setCurrentSong({
      id: song.id,
      name: song.name,
      artist: song.artists?.primary?.[0]?.name || 'Unknown Artist',
      image: song.image?.[2]?.url || song.image?.[1]?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=60',
      audioUrl: song.downloadUrl?.[4]?.url || song.downloadUrl?.[0]?.url || ''
    });
    
    setCurrentIndex(targetIdx);
    if (autoPlay) {
      setIsPlaying(true);
    }
  };

  // Play a selected song from the list
  const handlePlaySong = (song, idx) => {
    setQueue(songs);
    loadSongAtIndex(songs, idx, true);
    addToast(`Now playing: ${song.name}`, 'success');
  };

  // Toggle Play/Pause
  const togglePlay = () => {
    if (!currentSong && songs.length > 0) {
      loadSongAtIndex(songs, 0, true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Skip Next
  const handleNext = () => {
    if (queue.length === 0) return;
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      loadSongAtIndex(queue, randomIndex, true);
    } else {
      loadSongAtIndex(queue, currentIndex + 1, true);
    }
  };

  // Skip Previous
  const handlePrev = () => {
    if (queue.length === 0) return;
    // Restart song if played for more than 3 seconds
    if (currentTime > 3) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }
    } else {
      loadSongAtIndex(queue, currentIndex - 1, true);
    }
  };

  // Handle song ending
  const handleAudioEnded = () => {
    if (repeat === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeat === 'all' || currentIndex < queue.length - 1) {
      handleNext();
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  // Update Scrubber Position
  const handleScrubberChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Format seconds into MM:SS format
  const formatTime = (secs) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Toggle Like state
  const toggleLikeSong = (songId, songName) => {
    const updatedLikes = new Set(likedSongs);
    let isLiked = false;
    if (updatedLikes.has(songId)) {
      updatedLikes.delete(songId);
      setLikeCounts(prev => ({ ...prev, [songId]: Math.max(0, (prev[songId] || 1) - 1) }));
    } else {
      updatedLikes.add(songId);
      isLiked = true;
      setLikeCounts(prev => ({ ...prev, [songId]: (prev[songId] || 0) + 1 }));
    }
    setLikedSongs(updatedLikes);
    addToast(isLiked ? `Added "${songName}" to your Favorites` : `Removed "${songName}" from Favorites`, 'heart');
  };

  // Delete Playlist Item
  const handleDeletePlaylist = (e, playlistId, playlistName) => {
    e.stopPropagation(); // Avoid triggering playlist selection click
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    addToast(`Playlist "${playlistName}" removed`, 'trash');
  };

  // Custom action placeholders
  const handleViewPlaylist = () => {
    addToast("Viewing Top Song Playlist - 10 high-definition tracks loaded!", 'info');
  };

  const handleShareSong = (song) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(song.audioUrl || window.location.href);
      addToast(`Copied share link for "${song.name}"!`, 'info');
    } else {
      addToast(`Sharing: ${song.name}`, 'info');
    }
    setActiveMenuSongId(null);
  };

  const handleDownloadSong = (song) => {
    if (song.audioUrl) {
      window.open(song.audioUrl, '_blank');
      addToast(`Opening download link for "${song.name}"...`, 'success');
    } else {
      addToast(`No download URL available`, 'warning');
    }
    setActiveMenuSongId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-brand-near-black text-brand-text-primary overflow-hidden font-inter select-none antialiased">
      
      {/* Hidden HTML5 Audio Element */}
      {currentSong && (
        <audio
          ref={audioRef}
          src={currentSong.audioUrl}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
          onEnded={handleAudioEnded}
        />
      )}

      {/* LEFT SIDEBAR (220px fixed) */}
      <aside className="w-[220px] h-full flex-shrink-0 bg-brand-panel border-r border-brand-border flex flex-col justify-between py-6">
        <div className="flex flex-col gap-6 px-4 flex-1 overflow-y-auto">
          {/* App Logo */}
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="h-8 w-8 rounded-brand-btn bg-gradient-to-br from-brand-accent-start to-brand-accent-end flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              OMusic
              <span className="text-[9px] font-medium tracking-wider bg-white/10 text-brand-accent-end px-1.5 py-0.5 rounded uppercase">Beta</span>
            </span>
          </div>

          {/* Search bar inside left sidebar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search songs..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
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
              { name: 'Discover', icon: Compass },
              { name: 'Radio', icon: Radio },
              { name: 'Podcast', icon: Mic }
            ].map(item => {
              const Icon = item.icon;
              const isActive = selectedNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setSelectedNav(item.name)}
                  className={`relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-brand-btn transition-colors w-full text-left group ${
                    isActive 
                      ? 'bg-white/5 text-white' 
                      : 'text-brand-text-secondary hover:text-white hover:bg-white/2'
                  }`}
                >
                  {/* Left white bar indicator */}
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
              { name: 'Albums', icon: FolderOpen },
              { name: 'Song', icon: Music },
              { name: 'Artist', icon: User }
            ].map(item => {
              const Icon = item.icon;
              const isActive = selectedNav === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setSelectedNav(item.name)}
                  className={`relative flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-brand-btn transition-colors w-full text-left group ${
                    isActive 
                      ? 'bg-white/5 text-white' 
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
              <span className="text-[10px] font-medium text-brand-text-tertiary">{playlists.length} lists</span>
            </div>
            
            <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <div className="text-center py-4 px-2 border border-dashed border-brand-border rounded-brand-card">
                  <p className="text-xs text-brand-text-tertiary">No playlists left</p>
                </div>
              ) : (
                playlists.map(pl => (
                  <div
                    key={pl.id}
                    onClick={() => {
                      setSelectedNav(pl.name);
                      addToast(`Selected playlist: ${pl.name}`, 'info');
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-brand-btn transition-all cursor-pointer group ${
                      selectedNav === pl.name 
                        ? 'bg-white/5 text-white' 
                        : 'hover:bg-white/2 text-brand-text-secondary hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img 
                        src={pl.image} 
                        alt={pl.name}
                        className="w-7 h-7 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">{pl.name}</p>
                        <p className="text-[10px] text-brand-text-tertiary leading-none mt-0.5">{pl.songsCount} songs</p>
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

        {/* Demo status & footer */}
        <div className="px-4 pt-4 border-t border-brand-border flex flex-col gap-2">
          {isDemoMode && (
            <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-2 rounded-brand-btn text-[10px]">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
              <span>Offline/Demo mode active</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-brand-text-tertiary">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online</span>
          </div>
        </div>
      </aside>

      {/* CENTER MAIN (flex-1) */}
      <main className="flex-1 h-full overflow-y-auto bg-brand-near-black flex flex-col">
        {/* Header toolbar */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-brand-border bg-brand-near-black/50 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => addToast("Back navigation", "info")}
              className="w-8 h-8 rounded-full border border-brand-border bg-brand-card flex items-center justify-center text-brand-text-secondary hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => addToast("Forward navigation", "info")}
              className="w-8 h-8 rounded-full border border-brand-border bg-brand-card flex items-center justify-center text-brand-text-secondary hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {searchQuery && (
              <span className="text-xs text-brand-text-tertiary italic ml-2">
                Showing results for "{searchQuery}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Quick status message */}
            <span className="text-xs text-brand-text-tertiary">
              Local: <span className="font-semibold text-brand-text-secondary">2026</span>
            </span>
          </div>
        </header>

        {/* Content Panel */}
        <div className="p-8 flex flex-col gap-8 flex-1">
          
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
                  addToast("Resetting to global trending...", 'info');
                }} 
                className="text-xs font-semibold text-brand-text-secondary hover:text-white hover:underline transition-colors"
              >
                See all
              </button>
            </div>

            {/* Featured Hero Card (Full Width) */}
            <div className="w-full bg-gradient-to-r from-brand-accent-start to-brand-accent-end rounded-brand-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden group">
              {/* Artistic geometric glow overlay */}
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
                  className="bg-white hover:bg-neutral-100 text-black font-bold text-sm px-6 py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 active:scale-95 duration-200"
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
                
                <button
                  onClick={handleViewPlaylist}
                  className="bg-transparent border border-white/40 hover:border-white text-white hover:bg-white/10 font-bold text-sm px-6 py-3 rounded-full transition-all duration-200"
                >
                  View Playlist
                </button>
              </div>
            </div>
          </div>

          {/* Global Top 50 Section */}
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-accent-start" />
                Global Top 50
              </h2>
              <button 
                onClick={() => addToast("Showing first 10 search entries", "info")}
                className="text-xs font-semibold text-brand-text-secondary hover:text-white hover:underline transition-colors"
              >
                See all
              </button>
            </div>

            {/* Songs Table Container */}
            <div className="bg-brand-card border border-brand-border rounded-brand-card overflow-hidden">
              {isLoading ? (
                // Beautiful Skeleton Loader
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
                  <button 
                    onClick={() => {
                      setSearchVal('');
                      setSearchQuery('');
                    }}
                    className="text-xs text-brand-accent-end bg-brand-accent-start/10 hover:bg-brand-accent-start/20 px-3 py-1.5 rounded-brand-btn border border-brand-accent-start/20 transition-colors"
                  >
                    Reset Search
                  </button>
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
                        const artistName = song.artists?.primary?.[0]?.name || 'Unknown Artist';
                        const songImage = song.image?.[2]?.url || song.image?.[0]?.url || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100';
                        const displayIdx = (idx + 1).toString().padStart(2, '0');
                        
                        return (
                          <tr
                            key={song.id}
                            onClick={() => handlePlaySong(song, idx)}
                            className={`group border-b border-brand-border/40 hover:bg-white/2 transition-colors cursor-pointer text-sm ${
                              isCurrent ? 'bg-white/3' : ''
                            }`}
                          >
                            {/* Track number or Equalizer animation */}
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
                                
                                {/* Play icon on hover */}
                                <Play className={`w-3.5 h-3.5 fill-white text-white hidden group-hover:block ${isCurrent && isPlaying ? 'hidden group-hover:hidden' : ''}`} />
                              </div>
                            </td>

                            {/* Title with Thumbnail */}
                            <td className="py-3 px-4 font-semibold text-white">
                              <div className="flex items-center gap-3">
                                <img
                                  src={songImage}
                                  alt={song.name}
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                />
                                <span className={`truncate max-w-[200px] ${isCurrent ? 'text-brand-accent-end' : 'text-white'}`}>
                                  {song.name}
                                </span>
                              </div>
                            </td>

                            {/* Artist name */}
                            <td className="py-3 px-4 text-brand-text-secondary font-medium">
                              <span className="truncate max-w-[150px] block">
                                {artistName}
                              </span>
                            </td>

                            {/* Heart Like Toggler */}
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleLikeSong(song.id, song.name);
                                }}
                                className="inline-flex items-center gap-1.5 text-brand-text-secondary hover:text-brand-accent-end transition-colors py-1 px-2 rounded-full hover:bg-white/5"
                              >
                                <Heart 
                                  className={`w-4 h-4 transition-transform hover:scale-110 active:scale-90 ${
                                    isLiked 
                                      ? 'fill-brand-accent-end text-brand-accent-end' 
                                      : 'text-brand-text-tertiary group-hover:text-brand-text-secondary'
                                  }`} 
                                />
                                <span className="text-[11px] font-semibold">
                                  {likeCounts[song.id] || 0}
                                </span>
                              </button>
                            </td>

                            {/* Duration formatted */}
                            <td className="py-3 px-4 text-center text-brand-text-secondary font-medium">
                              {formatTime(song.duration)}
                            </td>

                            {/* Actions Dropdown Button */}
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

                              {/* Dropdown Menu */}
                              {activeMenuSongId === song.id && (
                                <div 
                                  ref={menuRef}
                                  className="absolute right-6 top-10 bg-brand-panel border border-brand-border rounded-brand-card w-40 py-1.5 z-20"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const updatedPls = [...playlists];
                                      if (updatedPls.length > 0) {
                                        updatedPls[0].songsCount += 1;
                                        setPlaylists(updatedPls);
                                        addToast(`Added "${song.name}" to playlist: ${updatedPls[0].name}`, 'success');
                                      } else {
                                        addToast("Create a playlist first!", 'warning');
                                      }
                                      setActiveMenuSongId(null);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                                  >
                                    <ListMusic className="w-3.5 h-3.5" />
                                    Add to playlist
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareSong(song);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
                                  >
                                    <Share2 className="w-3.5 h-3.5" />
                                    Copy Link
                                  </button>
                                  
                                  {song.downloadUrl?.[4]?.url && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadSong(song);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-brand-text-secondary hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 border-t border-brand-border/50 mt-1 pt-1"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Download 320kbps
                                    </button>
                                  )}
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
        </div>
      </main>

      {/* RIGHT SIDEBAR (280px fixed) */}
      <aside className="w-[280px] h-full flex-shrink-0 bg-brand-panel border-l border-brand-border flex flex-col justify-between py-6">
        
        {/* Top: User Profile */}
        <div className="px-6 flex flex-col gap-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-brand-accent-start/40 p-0.5 overflow-hidden flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                  alt="Oji Ganteng"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-tight">Oji Ganteng</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-brand-accent-start/10 text-brand-accent-end border border-brand-accent-start/10 uppercase tracking-wider">
                    Member
                  </span>
                </div>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setUnreadNotifications(0);
                }}
                className="w-8 h-8 rounded-full border border-brand-border hover:border-white text-brand-text-secondary hover:text-white transition-all flex items-center justify-center bg-brand-card"
              >
                <Bell className="w-4 h-4" />
              </button>
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-accent-end animate-ping" />
              )}
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand-accent-end" />
              )}

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-10 bg-brand-card border border-brand-border rounded-brand-card w-56 p-3 z-30">
                  <p className="text-[10px] font-bold uppercase text-brand-text-tertiary tracking-wider border-b border-brand-border pb-1.5 mb-2">Notifications</p>
                  <div className="flex flex-col gap-2">
                    <div className="text-[11px] text-brand-text-secondary">
                      <p className="font-semibold text-white leading-tight">Weekly chart updated!</p>
                      <p className="text-brand-text-tertiary">Check out Apna Bana Le at #1.</p>
                    </div>
                    <div className="text-[11px] text-brand-text-secondary border-t border-brand-border/40 pt-1.5">
                      <p className="font-semibold text-white leading-tight">Premium Activated</p>
                      <p className="text-brand-text-tertiary">Thank you for joining OMusic Premium.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Top Artists */}
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand-accent-end" />
                Top Artists
              </h2>
              <button 
                onClick={() => addToast("Showing popular artists", "info")}
                className="text-[10px] font-bold text-brand-text-secondary hover:text-white hover:underline uppercase transition-colors"
              >
                See all
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {artistsLoading ? (
                // Artists small loaders
                [...Array(4)].map((_, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-pulse">
                    <div className="w-5 text-center text-xs font-semibold text-brand-text-tertiary" />
                    <div className="w-8 h-8 rounded-full bg-brand-border" />
                    <div className="flex flex-col gap-1.5 flex-1">
                      <div className="w-20 h-2.5 bg-brand-border rounded" />
                      <div className="w-12 h-2 bg-brand-border rounded" />
                    </div>
                  </div>
                ))
              ) : (
                topArtists.slice(0, 4).map((artist, idx) => {
                  const rank = (idx + 1).toString().padStart(2, '0');
                  const artistImg = artist.image?.[2]?.url || artist.image?.[1]?.url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                  
                  return (
                    <div 
                      key={artist.id}
                      onClick={() => {
                        setSearchVal(artist.name);
                        addToast(`Searching for "${artist.name}"...`, 'info');
                      }}
                      className="flex items-center gap-3 group/art cursor-pointer py-1 px-1.5 rounded-brand-btn hover:bg-white/2 transition-colors"
                    >
                      <span className="w-5 text-center text-xs font-bold text-brand-text-tertiary group-hover/art:text-brand-accent-start transition-colors">
                        {rank}
                      </span>
                      <img
                        src={artistImg}
                        alt={artist.name}
                        className="w-9 h-9 rounded-full object-cover border border-brand-border/40 group-hover/art:border-brand-accent-start/40 flex-shrink-0 transition-colors"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white group-hover/art:text-brand-accent-end truncate transition-colors">
                          {artist.name}
                        </p>
                        <p className="text-[10px] text-brand-text-tertiary truncate leading-none mt-0.5">
                          {artist.albumsCount} Albums
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Music Player Card */}
        <div className="px-4 mt-auto">
          <div className="bg-brand-card border border-brand-border rounded-brand-card p-4 flex flex-col gap-4">
            
            {/* Album art + Song details */}
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0 group">
                <img
                  src={currentSong?.image || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200&auto=format&fit=crop&q=80'}
                  alt={currentSong?.name || 'OMusic'}
                  className={`w-full h-full rounded-[10px] object-cover transition-transform duration-500 ${
                    isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''
                  }`}
                />
                {!currentSong && (
                  <div className="absolute inset-0 bg-black/60 rounded-[10px] flex items-center justify-center">
                    <Music className="w-5 h-5 text-brand-text-tertiary" />
                  </div>
                )}
              </div>
              
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate marquee-container">
                  <span className="marquee-text block">
                    {currentSong?.name || 'No song selected'}
                  </span>
                </p>
                <p className="text-[10px] text-brand-text-secondary truncate mt-0.5">
                  {currentSong?.artist || 'Select a song to start'}
                </p>
              </div>

              {currentSong && (
                <button
                  onClick={() => toggleLikeSong(currentSong.id, currentSong.name)}
                  className="p-1 rounded text-brand-text-secondary hover:text-brand-accent-end transition-colors"
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

            {/* Playback Controls */}
            <div className="flex items-center justify-between px-2">
              {/* Shuffle button */}
              <button
                onClick={() => {
                  setShuffle(!shuffle);
                  addToast(shuffle ? "Shuffle OFF" : "Shuffle ON", 'info');
                }}
                className={`p-1.5 rounded transition-all hover:bg-white/5 ${
                  shuffle ? 'text-brand-accent-end scale-105' : 'text-brand-text-tertiary hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>

              {/* Prev button */}
              <button
                onClick={handlePrev}
                disabled={!currentSong}
                className="p-1.5 rounded text-brand-text-secondary hover:text-white transition-all hover:bg-white/5 disabled:opacity-30"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              {/* Play / Pause button */}
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center transition-all hover:scale-105 active:scale-95 duration-100 hover:bg-neutral-100"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4.5 h-4.5 fill-black text-black" />
                ) : (
                  <Play className="w-4.5 h-4.5 fill-black text-black translate-x-[1px]" />
                )}
              </button>

              {/* Next button */}
              <button
                onClick={handleNext}
                disabled={!currentSong}
                className="p-1.5 rounded text-brand-text-secondary hover:text-white transition-all hover:bg-white/5 disabled:opacity-30"
                title="Next track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              {/* Repeat button */}
              <button
                onClick={() => {
                  const nextRepeat = repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none';
                  setRepeat(nextRepeat);
                  addToast(
                    nextRepeat === 'all' ? "Repeat ALL tracks" : nextRepeat === 'one' ? "Repeat THIS track" : "Repeat OFF", 
                    'info'
                  );
                }}
                className={`p-1.5 rounded transition-all hover:bg-white/5 relative ${
                  repeat !== 'none' ? 'text-brand-accent-end scale-105' : 'text-brand-text-tertiary hover:text-white'
                }`}
                title={`Repeat: ${repeat}`}
              >
                <Repeat className="w-4 h-4" />
                {repeat === 'one' && (
                  <span className="absolute bottom-[2px] right-[2px] bg-brand-accent-end text-black text-[7px] font-extrabold w-3 h-3 rounded-full flex items-center justify-center scale-90 border border-brand-card">1</span>
                )}
              </button>
            </div>

            {/* Extra Volume Control for Premium Audio Setup */}
            <div className="flex items-center gap-2 border-t border-brand-border/40 pt-3 px-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-brand-text-secondary hover:text-white transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
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
              <span className="text-[9px] font-bold text-brand-text-tertiary w-6 text-right">
                {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>

          </div>
        </div>

      </aside>

      {/* TOAST SYSTEM (Bottom Right Overlay) */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-brand-btn text-xs font-semibold text-white bg-brand-card border border-brand-border shadow-xl flex items-center gap-2 pointer-events-auto transform translate-y-0 transition-transform duration-300 animate-[fadeIn_0.2s_ease-out]`}
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

    </div>
  );
}
