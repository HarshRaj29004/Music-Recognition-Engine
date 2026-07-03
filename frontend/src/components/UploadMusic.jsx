import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL } from '../utils/helpers';

const UploadMusic = ({ onUploadSuccess }) => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlresponse, setUrlResponse] = useState(null);

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
        if (onUploadSuccess) onUploadSuccess();
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

  return (
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
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-600/30 disabled:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
  );
};

export default UploadMusic;
