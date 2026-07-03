import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { API_URL, formatTime } from '../utils/helpers';

const IdentifyMusic = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

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

  return (
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
            {recordingTime < 30 && (
              <p className="text-xs text-slate-400 mt-4 animate-pulse">
                Recording 30-second minimum fingerprint sample... ({30 - recordingTime}s remaining)
              </p>
            )}
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
        {isRecording && recordingTime >= 30 && (
          <button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-500 text-white px-8 py-3 rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer"
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
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Re-record
              </button>
              <button
                onClick={handleAudioSubmit}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
  );
};

export default IdentifyMusic;
