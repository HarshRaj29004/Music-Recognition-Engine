import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import './App.css';
import Navbar from './utils/Navbar';
import { API_URL } from './utils/helpers';
import Library from './components/Library';
import IdentifyMusic from './components/IdentifyMusic';
import UploadMusic from './components/UploadMusic';
import PlayMusic from './components/PlayMusic';

function App() {
  const [activeTool, setActiveTool] = useState('library');
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const audioRef = useRef(null);

  // Fetch all songs from library
  const fetchSongs = async () => {
    setIsLoadingSongs(true);
    try {
      const res = await fetch(`${API_URL}/songs`);
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
        setFilteredSongs(data.songs || []);
      }
    } catch (error) {
      console.error('Error fetching library songs:', error);
      toast.error('Failed to load music library');
    } finally {
      setIsLoadingSongs(false);
    }
  };

  useEffect(() => {
    fetchSongs();
  }, []);

  // Filter songs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSongs(songs);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredSongs(
        songs.filter(
          s => (s.title && s.title.toLowerCase().includes(q)) || (s.channel && s.channel.toLowerCase().includes(q))
        )
      );
    }
  }, [searchQuery, songs]);

  // Audio Control Handlers
  const handlePlayTrack = (track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      setCurrentTime(0);
    }
  };

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (audioRef.current) {
      audioRef.current.volume = v;
    }
  };

  const playNextTrack = () => {
    if (!currentTrack || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentTrack.id);
    if (currentIndex !== -1) {
      const nextTrack = songs[(currentIndex + 1) % songs.length];
      handlePlayTrack(nextTrack);
    }
  };

  const playPrevTrack = () => {
    if (!currentTrack || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentTrack.id);
    if (currentIndex !== -1) {
      const prevTrack = songs[(currentIndex - 1 + songs.length) % songs.length];
      handlePlayTrack(prevTrack);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-28 selection:bg-blue-600 selection:text-white">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />

      {/* Audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audio_url || ''}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNextTrack}
        autoPlay={isPlaying}
      />

      {/* Navbar Component */}
      <Navbar activeTool={activeTool} setActiveTool={setActiveTool} />

      {/* Body View Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-8 flex-1 w-full">
        {activeTool === 'library' && (
          <Library
            songs={songs}
            filteredSongs={filteredSongs}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoadingSongs={isLoadingSongs}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            handlePlayTrack={handlePlayTrack}
            fetchSongs={fetchSongs}
          />
        )}

        {activeTool === 'Recognition' && (
          <IdentifyMusic />
        )}

        {activeTool === 'url' && (
          <UploadMusic onUploadSuccess={fetchSongs} />
        )}
      </main>

      {/* Music Player Footer Component */}
      <PlayMusic
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        togglePlayPause={togglePlayPause}
        playNextTrack={playNextTrack}
        playPrevTrack={playPrevTrack}
        handleSeek={handleSeek}
        handleVolumeChange={handleVolumeChange}
      />
    </div>
  );
}

export default App;
