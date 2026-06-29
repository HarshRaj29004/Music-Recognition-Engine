import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-hot-toast';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const AudioRecord = () => {
  const [activeTool, setActiveTool] = useState('library'); 
  const [songs, setSongs] = useState([]);
  const [filteredSongs, setFilteredSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoadingSongs, setIsLoadingSongs] = useState(false);
  const [url, setUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [response, setResponse] = useState(null);
  const [urlresponse, setUrlResponse] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Fetch all songs
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

  // Handle search filtering
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

  // Audio Player Handlers
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
    const nextTrack = songs[(currentIndex + 1) % songs.length];
    handlePlayTrack(nextTrack);
  };

  const playPrevTrack = () => {
    if (!currentTrack || songs.length === 0) return;
    const currentIndex = songs.findIndex(s => s.id === currentTrack.id);
    const prevTrack = songs[(currentIndex - 1 + songs.length) % songs.length];
    handlePlayTrack(prevTrack);
  };

  // Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      setResponse(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleAudioSubmit = async () => {
    if (!audioBlob) {
      toast.error('Please record an audio sample first');
      return;
    }

    setIsProcessing(true);
    setResponse(null);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const res = await fetch(`${API_URL}/identify`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      setResponse(data);
      if (data.match_found) {
        toast.success('🎉 Song match identified!');
      } else {
        toast.error(data.message || 'No matching song found');
      }
    } catch (error) {
      toast.error(`Error identifying audio: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // YouTube Ingestion Handler
  const handleUrlSubmit = async () => {
    if (!url.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }
    setIsProcessing(true);
    setUrlResponse(null);

    try {
      const res = await fetch(`${API_URL}/audio_upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }
      const data = await res.json();

      if (data.status === "Success") {
        toast.success(`🎵 Song added to library: ${data.title}`);
        fetchSongs(); // Refresh library!
      } else {
        toast.info(`Song already exists in library: ${data.title}`);
      }
      setUrlResponse(data);
    } catch (error) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getYouTubeEmbedUrl = (youtubeUrl) => {
    if (!youtubeUrl) return null;
    const videoId = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col pb-28 selection:bg-blue-600 selection:text-white">
      {/* Hidden HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audio_url || ''}
        onTimeUpdate={handleTimeUpdate}
        onEnded={playNextTrack}
        autoPlay={isPlaying}
      />

      {/* Top Header Navbar */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40 px-4 py-3 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo */}
          <div 
            onClick={() => setActiveTool('library')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                Soundify <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Player</span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">Cloud Audio Player & Recognition Engine</p>
            </div>
          </div>

          {/* Feature Quick Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTool('library')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTool === 'library'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Music Library</span>
            </button>

            <button
              onClick={() => setActiveTool('Recognition')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTool === 'Recognition'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              🎙️ <span className="hidden sm:inline">Music ID</span>
            </button>

            <button
              onClick={() => setActiveTool('url')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTool === 'url'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              ➕ <span className="hidden sm:inline">Add Track</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body View */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-8 flex-1 w-full">
        {/* VIEW 1: MUSIC LIBRARY */}
        {activeTool === 'library' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950/70 border border-blue-500/20 p-6 sm:p-10 shadow-2xl">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                    Cloud Audio Vault
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mt-3 mb-2">
                    Curated Music Library
                  </h2>
                  <p className="text-slate-300 text-sm max-w-lg font-normal">
                    Stream available songs directly from cloud storage, or use our acoustic fingerprint engine to identify songs playing around you.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {songs.length > 0 && (
                    <button
                      onClick={() => handlePlayTrack(songs[0])}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-full shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 text-sm"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Play All
                    </button>
                  )}
                  <button
                    onClick={fetchSongs}
                    title="Refresh Library"
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-all"
                  >
                    <svg className={`w-5 h-5 ${isLoadingSongs ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div className="relative w-full sm:w-80">
                <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search songs or artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Showing <strong className="text-white">{filteredSongs.length}</strong> of {songs.length} tracks
              </div>
            </div>

            {/* Tracks Table */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              {isLoadingSongs ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center">
                  <svg className="animate-spin h-8 w-8 text-blue-500 mb-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Loading available tracks from music library...</span>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="py-16 text-center text-slate-400">
                  <p className="text-lg font-semibold text-slate-300">No tracks found in library</p>
                  <p className="text-xs text-slate-500 mt-1">Add a new track from YouTube using the "Add Track" feature above.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/60">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80">
                    <div className="col-span-1">#</div>
                    <div className="col-span-6 sm:col-span-7">Title & Artist</div>
                    <div className="col-span-3 sm:col-span-3 text-right sm:text-left">Audio Status</div>
                    <div className="col-span-2 sm:col-span-1 text-right">Action</div>
                  </div>

                  {/* Track Rows */}
                  {filteredSongs.map((track, idx) => {
                    const isSelected = currentTrack?.id === track.id;
                    const isTrackPlaying = isSelected && isPlaying;

                    return (
                      <div
                        key={track.id || idx}
                        onClick={() => handlePlayTrack(track)}
                        className={`grid grid-cols-12 px-6 py-4 items-center text-sm cursor-pointer transition-colors group ${
                          isSelected ? 'bg-blue-600/10 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        {/* Index / Playing Indicator */}
                        <div className="col-span-1 font-mono text-xs text-slate-500 group-hover:text-blue-400 flex items-center">
                          {isTrackPlaying ? (
                            <div className="flex items-end gap-0.5 h-4 w-4">
                              <span className="w-1 bg-blue-500 h-full animate-bounce"></span>
                              <span className="w-1 bg-blue-500 h-2/3 animate-bounce delay-75"></span>
                              <span className="w-1 bg-blue-500 h-4/5 animate-bounce delay-150"></span>
                            </div>
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Title & Channel */}
                        <div className="col-span-6 sm:col-span-7 pr-4">
                          <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-400 font-bold' : 'text-slate-100'}`}>
                            {track.title || "Unknown Track"}
                          </h4>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{track.channel || "Unknown Artist"}</p>
                        </div>

                        {/* Audio Source / Status Badge */}
                        <div className="col-span-3 sm:col-span-3 text-right sm:text-left flex items-center">
                          {track.audio_url ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              High Fidelity Streamable
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                              Acoustically Fingerprinted
                            </span>
                          )}
                        </div>

                        {/* Play Action Button */}
                        <div className="col-span-2 sm:col-span-1 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayTrack(track);
                            }}
                            className={`p-2 rounded-full transition-all ${
                              isTrackPlaying
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-800 text-slate-300 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                          >
                            {isTrackPlaying ? (
                              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: AUDIO IDENTIFIER TOOL */}
        {activeTool ===  'Recognition' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
                🎙️ Spectral Engine
              </div>
              <h2 className="text-3xl font-black text-white">Identify Ambient Song</h2>
              <p className="text-slate-400 text-sm mt-1">Record audio around you to match against stored acoustic song fingerprints.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
              {/* Recording State */}
              {isRecording && (
                <div className="flex flex-col items-center py-6">
                  <div className="relative flex items-center justify-center mb-6">
                    <span className="absolute w-36 h-36 rounded-full bg-blue-500/20 animate-ping"></span>
                    <span className="absolute w-28 h-28 rounded-full bg-blue-600/30 animate-pulse"></span>
                    <div className="relative w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-blue-600/40">
                      <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-4 py-1.5 rounded-full font-mono font-bold text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                    Recording: {formatTime(recordingTime)}
                  </div>
                </div>
              )}

              {/* Idle Mic Button */}
              {!isRecording && !audioBlob && (
                <div className="py-6 flex flex-col items-center">
                  <button
                    onClick={startRecording}
                    className="group w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex flex-col items-center justify-center shadow-2xl shadow-blue-600/40 hover:scale-105 transition-all duration-300 cursor-pointer"
                  >
                    <svg className="w-12 h-12 mb-1 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Tap to Listen</span>
                  </button>
                  <p className="text-xs text-slate-400 mt-6">Click to record ambient music from microphone</p>
                </div>
              )}

              {/* Stop Recording */}
              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-lg transition-all"
                >
                  Stop Recording
                </button>
              )}

              {/* Audio Preview & Submit */}
              {audioBlob && !isRecording && (
                <div className="w-full max-w-md space-y-4">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-left">
                    <span className="text-xs font-bold text-slate-400 uppercase">Captured Audio Segment ({formatTime(recordingTime)})</span>
                    <audio controls src={URL.createObjectURL(audioBlob)} className="w-full h-10 mt-2 accent-blue-500" />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs transition-all"
                    >
                      Re-record
                    </button>
                    <button
                      onClick={handleAudioSubmit}
                      disabled={isProcessing}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                    >
                      {isProcessing ? 'Matching Fingerprints...' : 'Identify Song'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Match Results */}
            {response && response.match_found && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">🎉 Match Candidates</h3>
                {[response.match_1, response.match_2, response.match_3].map((match, idx) => {
                  if (!match) return null;
                  return (
                    <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-blue-400 text-sm">{match.title}</h4>
                        <p className="text-xs text-slate-400">{match.channel}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          Match Confidence: {match.score}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: ADD YOUTUBE TRACK TOOL */}
        {activeTool === 'url' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
                ➕ Add New Track to Library
              </div>
              <h2 className="text-3xl font-black text-white">Add Song from YouTube</h2>
              <p className="text-slate-400 text-sm mt-1">Processes YouTube audio, prepares instant streaming playback, and generates acoustic fingerprints.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-2">YouTube Video URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* 30-Second Wait Notice Banner */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3.5 text-left">
                <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 mt-0.5 flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider">Processing Notice</h4>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Please allow at least <strong>30 to 45 seconds</strong> while the system downloads high-quality audio, extracts acoustic fingerprints, and sets up streaming playback.
                  </p>
                </div>
              </div>

              <button
                onClick={handleUrlSubmit}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 disabled:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing Track (Please wait ~30s)...</span>
                  </>
                ) : (
                  'Add Track to Library'
                )}
              </button>
            </div>

            {urlresponse && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center animate-fade-in">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  {urlresponse.status}
                </span>
                <h4 className="text-lg font-bold text-white mt-3">{urlresponse.title}</h4>
                <p className="text-xs text-slate-400 mt-1">Track is now streamable in your library!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* STICKY BOTTOM MUSIC PLAYER BAR */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-3 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Track Info */}
          <div className="flex items-center gap-3.5 w-1/4 min-w-[180px]">
            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate">{currentTrack?.title || "No track selected"}</h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{currentTrack?.channel || "Select a song from library"}</p>
            </div>
          </div>

          {/* Center: Play Controls & Timeline Slider */}
          <div className="flex flex-col items-center w-2/4 max-w-xl">
            <div className="flex items-center gap-4 mb-1.5">
              <button onClick={playPrevTrack} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              <button
                onClick={togglePlayPause}
                disabled={!currentTrack}
                className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
              >
                {isPlaying ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              <button onClick={playNextTrack} className="text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>
            </div>

            {/* Time Seeker */}
            <div className="w-full flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!currentTrack}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume & Link */}
          <div className="flex items-center justify-end gap-3 w-1/4 hidden sm:flex">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            {currentTrack?.url && (
              <a href={currentTrack.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline font-bold ml-2">
                YouTube ↗
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AudioRecord;
