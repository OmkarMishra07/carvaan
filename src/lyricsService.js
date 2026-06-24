const JIOSAAVN_BASE = 'https://jiosavnapi-production.up.railway.app';

export const lyricsService = {
  // Fetch lyrics with failover options
  async fetchLyrics(songId, title, artist, durationSeconds) {
    // 1. Try JioSaavn API
    try {
      console.log(`Fetching lyrics from JioSaavn for ID: ${songId}`);
      const response = await fetch(`${JIOSAAVN_BASE}/api/songs/${songId}/lyrics`);
      if (response.ok) {
        const json = await response.json();
        
        // Handle various response schemas
        const lyricsText = json.lyrics || json.data?.lyrics || (json.success && json.data && json.data.lyrics);
        
        if (lyricsText && lyricsText.trim()) {
          console.log('JioSaavn plain lyrics fetched successfully.');
          return {
            synced: false,
            lines: lyricsText.split('\n').map(text => ({ text: text.trim() })).filter(l => l.text)
          };
        }
      }
    } catch (err) {
      console.warn('JioSaavn lyrics fetch failed, falling back to LRClib:', err);
    }

    // 2. Try LRClib API
    try {
      // Clean artist and track names to increase match probability
      const cleanArtist = artist.replace(/\(.*\)/g, '').replace(/feat\..*/gi, '').trim();
      const cleanTitle = title.replace(/\(.*\)/g, '').replace(/feat\..*/gi, '').trim();
      const duration = durationSeconds ? Math.round(durationSeconds) : '';

      console.log(`Fetching from LRClib for: ${cleanTitle} - ${cleanArtist} (${duration}s)`);
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(cleanArtist)}&track_name=${encodeURIComponent(cleanTitle)}${duration ? `&duration=${duration}` : ''}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const json = await response.json();

        // 2a. Synced lyrics (LRC timed format)
        if (json.syncedLyrics && json.syncedLyrics.trim()) {
          const parsed = this.parseLrc(json.syncedLyrics);
          if (parsed && parsed.length > 0) {
            console.log('LRClib synced lyrics parsed successfully.');
            return {
              synced: true,
              lines: parsed
            };
          }
        }

        // 2b. Fallback to Plain lyrics from LRClib
        if (json.plainLyrics && json.plainLyrics.trim()) {
          console.log('LRClib plain lyrics fetched.');
          return {
            synced: false,
            lines: json.plainLyrics.split('\n').map(text => ({ text: text.trim() })).filter(l => l.text)
          };
        }
      }
    } catch (err) {
      console.warn('LRClib lyrics fetch failed:', err);
    }

    return {
      synced: false,
      lines: [],
      error: 'Lyrics not available for this track'
    };
  },

  // Parse [mm:ss.xx] lines into { timeMs, text }
  parseLrc(lrcContent) {
    if (!lrcContent) return [];
    
    const lines = lrcContent.split('\n');
    const result = [];
    // Matches [minutes:seconds.hundredths] or [minutes:seconds:milliseconds]
    const timestampRegex = /\[(\d{2,3}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const line of lines) {
      timestampRegex.lastIndex = 0;
      const match = timestampRegex.exec(line);
      
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const msPart = match[3] || '00';
        
        // Convert hundredths to milliseconds, e.g. "34" -> 340ms, "345" -> 345ms
        const msMultiplier = msPart.length === 2 ? 10 : 1;
        const milliseconds = parseInt(msPart, 10) * msMultiplier;
        
        const timeMs = (minutes * 60 + seconds) * 1000 + milliseconds;
        const text = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();

        // Skip structural metadata (e.g. [ar: Artist])
        if (text || !line.includes(':')) {
          result.push({ timeMs, text });
        }
      }
    }

    return result.sort((a, b) => a.timeMs - b.timeMs);
  }
};
