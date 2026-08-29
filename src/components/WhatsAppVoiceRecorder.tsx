import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Volume2, 
  Upload, 
  AlertCircle, 
  Check, 
  FastForward,
  Sparkles
} from 'lucide-react';
import { VoiceNoteAttachment } from '../types';

interface WhatsAppVoiceRecorderProps {
  voiceNote?: VoiceNoteAttachment;
  onVoiceNoteChange: (voiceNote?: VoiceNoteAttachment) => void;
  autoStart?: boolean;
}

export const WhatsAppVoiceRecorder: React.FC<WhatsAppVoiceRecorderProps> = ({
  voiceNote,
  onVoiceNoteChange,
  autoStart = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // Update audio playback rate when changed
  useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);
    setWaveformLevels([]);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;

      // Setup Web Audio API for real-time audio analysis
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (analyserRef.current && !isPaused) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              const normalized = Math.min(100, Math.max(5, (avg / 128) * 100));
              setAudioLevel(normalized);
              setWaveformLevels(prev => {
                const next = [...prev, normalized];
                return next.slice(-28); // Keep last 28 samples
              });
            }
            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (audioCtxErr) {
        console.warn("AudioContext visualization fallback:", audioCtxErr);
      }

      // Initialize MediaRecorder
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
        else if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
        else mimeType = '';
      }

      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onVoiceNoteChange({
            dataUrl: base64data,
            durationSeconds: recordingSeconds > 0 ? recordingSeconds : 1,
            mimeType: audioBlob.type,
            filename: `voice_note_${Date.now()}.webm`,
            recordedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(audioBlob);

        // Clean up tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setIsPaused(false);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 180) { // 3 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Microphone recording error:", err);
      setPermissionError(err.message || "Microphone access was denied. Please allow microphone permissions or attach an audio file.");
      setIsRecording(false);
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Clear chunks so onstop doesn't emit
      audioChunksRef.current = [];
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
    setIsRecording(false);
    setIsPaused(false);
    setRecordingSeconds(0);
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const audio = new Audio();
        audio.src = reader.result as string;
        audio.onloadedmetadata = () => {
          onVoiceNoteChange({
            dataUrl: reader.result as string,
            durationSeconds: Math.round(audio.duration || 10),
            mimeType: file.type || 'audio/mp3',
            filename: file.name,
            recordedAt: new Date().toISOString()
          });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current && voiceNote) {
      const player = new Audio(voiceNote.dataUrl);
      player.playbackRate = playbackRate;
      player.ontimeupdate = () => {
        const current = player.currentTime;
        const total = player.duration || voiceNote.durationSeconds;
        setPlaybackTime(Math.floor(current));
        setPlaybackProgress((current / total) * 100);
      };
      player.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        setPlaybackTime(0);
      };
      audioPlayerRef.current = player;
    }

    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play().catch(err => console.error("Audio playback error:", err));
        setIsPlaying(true);
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
  };

  const deleteVoiceNote = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
    setPlaybackTime(0);
    onVoiceNoteChange(undefined);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div id="whatsapp-voice-recorder-widget" className="w-full">
      {permissionError && (
        <div className="flex items-start gap-2 p-3 mb-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">{permissionError}</div>
            <div className="text-amber-400/80 mt-0.5">Please allow microphone access or upload an audio file.</div>
          </div>
        </div>
      )}

      {/* STATE 1: Idle / Not Recording and No Voice Note */}
      {!isRecording && !voiceNote && (
        <div className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-whatsapp-start-record"
              onClick={startRecording}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              title="Record voice note"
            >
              <Mic className="w-5 h-5 fill-current" />
            </button>
            <div>
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Record Voice Note</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                  Built-in
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tap to speak & describe the bug like in WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileUploadInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileUpload}
              className="hidden"
              id="whatsapp-audio-upload-input"
            />
            <button
              type="button"
              id="btn-whatsapp-upload-audio"
              onClick={() => fileUploadInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Upload className="w-3 h-3" />
              <span>Audio File</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: Actively Recording (WhatsApp Live Voice Bar) */}
      {isRecording && (
        <div className="p-3 rounded-2xl bg-slate-900 border-2 border-emerald-500/50 shadow-xl shadow-emerald-950/40 flex items-center justify-between gap-3 animate-in fade-in">
          {/* Left: Cancel Trash Button */}
          <button
            type="button"
            id="btn-whatsapp-cancel-recording"
            onClick={cancelRecording}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Cancel and discard voice note"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Center: Live Timer & Real-Time Waveform */}
          <div className="flex-1 flex items-center gap-3 overflow-hidden px-2">
            <div className="flex items-center gap-2 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              <span className="text-sm font-bold text-emerald-400 font-mono tracking-wider">
                {formatTime(recordingSeconds)}
              </span>
            </div>

            {/* Dynamic Web Audio Waveform */}
            <div className="flex-1 flex items-center justify-center gap-0.5 h-7 overflow-hidden">
              {(waveformLevels.length > 0 ? waveformLevels : [20, 45, 70, 35, 90, 60, 40, 80, 55, 30, 65, 85, 40]).map((lvl, i) => (
                <span
                  key={i}
                  className="w-1 bg-emerald-400 rounded-full transition-all duration-75"
                  style={{
                    height: isPaused ? '4px' : `${Math.max(4, Math.min(26, (lvl / 100) * 26))}px`
                  }}
                />
              ))}
            </div>
          </div>

          {/* Right: Pause & Finish Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="btn-whatsapp-pause-recording"
              onClick={pauseRecording}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              id="btn-whatsapp-finish-recording"
              onClick={stopRecording}
              className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Finish and attach voice note"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: Voice Note Recorded (WhatsApp Audio Message Bubble) */}
      {voiceNote && !isRecording && (
        <div className="p-3 rounded-2xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center justify-between gap-3">
            {/* Play/Pause Button */}
            <div className="flex items-center gap-3 flex-1">
              <button
                type="button"
                id="btn-whatsapp-toggle-playback"
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {/* Scrubber & Waveform Track */}
              <div className="flex-1 space-y-1">
                {/* Waveform graphic */}
                <div 
                  className="flex items-center gap-0.5 h-5 cursor-pointer py-1"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const pct = Math.max(0, Math.min(1, clickX / rect.width));
                    if (audioPlayerRef.current) {
                      audioPlayerRef.current.currentTime = pct * (audioPlayerRef.current.duration || voiceNote.durationSeconds);
                    }
                  }}
                >
                  {Array.from({ length: 32 }).map((_, idx) => {
                    const barPct = (idx / 32) * 100;
                    const isPassed = barPct <= playbackProgress;
                    // Pseudo-random pseudo-frequency wave pattern
                    const heightVal = Math.sin(idx * 0.7) * 7 + Math.cos(idx * 1.3) * 5 + 12;
                    return (
                      <span
                        key={idx}
                        className={`flex-1 rounded-full transition-colors ${
                          isPassed ? 'bg-emerald-400' : 'bg-emerald-900/60'
                        }`}
                        style={{ height: `${Math.max(4, heightVal)}px` }}
                      />
                    );
                  })}
                </div>

                {/* Duration / Counter */}
                <div className="flex items-center justify-between text-[11px] font-mono text-emerald-300/80">
                  <span>{formatTime(isPlaying ? playbackTime : voiceNote.durationSeconds)}</span>
                  <span className="text-slate-400">{formatTime(voiceNote.durationSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Actions: Speed, Re-record, Delete */}
            <div className="flex items-center gap-1.5 shrink-0 pl-1 border-l border-emerald-500/20">
              <button
                type="button"
                id="btn-whatsapp-playback-rate"
                onClick={cyclePlaybackRate}
                className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-mono text-xs font-bold transition-colors cursor-pointer"
                title="Change playback speed"
              >
                {playbackRate}x
              </button>
              <button
                type="button"
                id="btn-whatsapp-rerecord"
                onClick={() => {
                  deleteVoiceNote();
                  startRecording();
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Re-record voice note"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="btn-whatsapp-delete-voicenote"
                onClick={deleteVoiceNote}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Delete voice note"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
