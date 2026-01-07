import React, { useState, useEffect, useCallback } from 'react';

type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  uri: string;
  album: { images: { url: string }[] };
};

type TrackSearchProps = {
  accessToken: string;
  onSelectTrack?: (track: Track) => void;
};

export function TrackSearchComponent({ accessToken, onSelectTrack }: TrackSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const searchTracks = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!resp.ok) {
        console.error('Search failed', resp.status);
        setResults([]);
        return;
      }

      const data = await resp.json();
      setResults(data.tracks?.items || []);
    } catch (e) {
      console.error('Search error', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTracks(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchTracks]);

  const handleSelect = (track: Track) => {
    setSelectedTrack(track);
    if (onSelectTrack) onSelectTrack(track);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="track-search">
      <h3>🔍 Search Tracks</h3>
      
      {selectedTrack && (
        <div className="selected-track">
          <img src={selectedTrack.album.images[2]?.url} alt={selectedTrack.name} />
          <div>
            <div className="track-name">{selectedTrack.name}</div>
            <div className="track-artist">
              {selectedTrack.artists.map(a => a.name).join(', ')}
            </div>
            <div className="track-uri">{selectedTrack.uri}</div>
          </div>
          <button onClick={() => setSelectedTrack(null)}>×</button>
        </div>
      )}

      <div className="search-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a track..."
        />
        {loading && <span className="loading-spinner">⏳</span>}
      </div>

      {results.length > 0 && (
        <div className="search-results">
          {results.map((track) => (
            <div
              key={track.id}
              className="result-item"
              onClick={() => handleSelect(track)}
            >
              <img src={track.album.images[2]?.url} alt={track.name} />
              <div className="result-info">
                <div className="result-name">{track.name}</div>
                <div className="result-artist">
                  {track.artists.map(a => a.name).join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
