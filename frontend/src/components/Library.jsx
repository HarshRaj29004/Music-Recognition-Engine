import React from 'react';

const Library = ({
  songs,
  filteredSongs,
  searchQuery,
  setSearchQuery,
  isLoadingSongs,
  currentTrack,
  isPlaying,
  handlePlayTrack,
  fetchSongs
}) => {
  return (
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
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 text-sm cursor-pointer"
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
              className="p-3.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-all cursor-pointer"
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
            <div className="grid grid-cols-12 px-4 sm:px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80">
              <div className="col-span-2 sm:col-span-1">#</div>
              <div className="col-span-8 sm:col-span-7">Title & Artist</div>
              <div className="hidden sm:block sm:col-span-3 text-left">Audio Status</div>
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
                  className={`grid grid-cols-12 px-4 sm:px-6 py-4 items-center text-sm cursor-pointer transition-colors group ${
                    isSelected ? 'bg-blue-600/10 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {/* Index / Playing Indicator */}
                  <div className="col-span-2 sm:col-span-1 font-mono text-xs text-slate-500 group-hover:text-blue-400 flex items-center">
                    {isTrackPlaying ? (
                      <div className="flex items-center gap-0.5 h-4 w-4">
                        <span className="w-1 bg-blue-500 h-full animate-[bounce_1s_ease-in-out_infinite]"></span>
                        <span className="w-1 bg-blue-500 h-full animate-[bounce_1s_ease-in-out_infinite] [animation-delay:-0.2s]"></span>
                        <span className="w-1 bg-blue-500 h-full animate-[bounce_1s_ease-in-out_infinite] [animation-delay:-0.4s]"></span>
                      </div>
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </div>

                  {/* Title & Channel */}
                  <div className="col-span-8 sm:col-span-7 pr-4">
                    <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-400 font-bold' : 'text-slate-100'}`}>
                      {track.title || "Unknown Track"}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{track.channel || "Unknown Artist"}</p>
                    <span className="sm:hidden inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 mt-1">
                      {track.audio_url ? '● Streamable' : '○ Fingerprinted'}
                    </span>
                  </div>

                  {/* Audio Source / Status Badge */}
                  <div className="hidden sm:flex sm:col-span-3 items-center">
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
                      className={`p-2 rounded-full transition-all cursor-pointer ${
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
  );
};

export default Library;
