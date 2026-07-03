import React from 'react';
import { formatTime } from '../utils/helpers';

const PlayMusic = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  togglePlayPause,
  playNextTrack,
  playPrevTrack,
  handleSeek,
  handleVolumeChange
}) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-3 z-50 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Track Info */}
        <div className="flex items-center gap-3 w-full sm:w-1/4 min-w-0 justify-between sm:justify-start">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-400 shadow-inner flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
            <div className="truncate">
              <h4 className="text-xs font-bold text-white truncate">{currentTrack?.title || "No track selected"}</h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">{currentTrack?.channel || "Select a song from library"}</p>
            </div>
          </div>
          
          {/* Quick Play/Pause button for mobile */}
          <button
            onClick={togglePlayPause}
            disabled={!currentTrack}
            className="sm:hidden w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white flex items-center justify-center shadow-md flex-shrink-0 animate-fade-in"
          >
            {isPlaying ? (
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

        {/* Center: Play Controls & Timeline Slider */}
        <div className="flex flex-col items-center w-full sm:w-2/4 max-w-xl">
          <div className="hidden sm:flex items-center gap-4 mb-1.5">
            <button onClick={playPrevTrack} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button
              onClick={togglePlayPause}
              disabled={!currentTrack}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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

            <button onClick={playNextTrack} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
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
  );
};

export default PlayMusic;
