import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Volume2, Upload, AlertCircle } from 'lucide-react';
import { VoiceNoteAttachment } from '../types';

interface AudioRecorderProps {
  voiceNote?: VoiceNoteAttachment;
  onVoiceNoteChange: (voiceNote?: VoiceNoteAttachment) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  voiceNote,
  onVoiceNoteChange
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up media streams and timers
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setPermissionError(null);
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          onVoiceNoteChange({
            dataUrl: base64data,
            durationSeconds: recordingSeconds > 0 ? recordingSeconds : 1,
            mimeType: audioBlob.type,
            filename: `voicenote_${Date.now()}.webm`,
            recordedAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(audioBlob);

        // Stop tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(250); // chunk every 250ms
      setIsRecording(true);
      setIsPaused(false);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 120) { // 2 minutes max
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      console.error("Microphone access error:", err);
      setPermissionError(err.message || "Microphone access denied. You can still upload an audio file below.");
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

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
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
        // approximate duration or set default
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
      audioPlayerRef.current = new Audio(voiceNote.dataUrl);
      audioPlayerRef.current.ontimeupdate = () => {
        if (audioPlayerRef.current) {
          const current = audioPlayerRef.current.currentTime;
          const total = audioPlayerRef.current.duration || voiceNote.durationSeconds;
          setPlaybackTime(Math.floor(current));
          setPlaybackProgress((current / total) * 100);
        }
      };
      audioPlayerRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
        setPlaybackTime(0);
      };
    }

    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        audioPlayerRef.current.play().catch(err => console.error("Playback error:", err));
        setIsPlaying(true);
      }
    }
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
    <div id="voice-recorder-container" className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          Voice Note / Spoken Explanation
        </label>
        <span className="text-xs text-slate-400">
          Optional (Max 2:00)
        </span>
      </div>

      {permissionError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">{permissionError}</div>
            <div className="text-amber-400/80 mt-0.5">Please allow microphone access in your browser bar, or upload an audio recording file.</div>
          </div>
        </div>
      )}

      {/* State 1: No Voice Note recorded yet */}
      {!isRecording && !voiceNote && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-start-record-audio"
              onClick={startRecording}
              className="w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
            >
              <Mic className="w-5 h-5" />
            </button>
            <div>
              <div className="text-sm font-medium text-slate-200">Record Spoken Explanation</div>
              <div className="text-xs text-slate-400">Explain the bug out loud with your microphone</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 hidden sm:inline">or</span>
            <input
              ref={fileUploadInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioFileUpload}
              className="hidden"
              id="audio-file-upload-input"
            />
            <button
              type="button"
              id="btn-upload-audio-file"
              onClick={() => fileUploadInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Audio File
            </button>
          </div>
        </div>
      )}

      {/* State 2: Actively Recording */}
      {isRecording && (
        <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-400 rounded-full border-2 border-slate-900 animate-ping" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-rose-300 font-mono tracking-wider">
                  {formatTime(recordingSeconds)}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {isPaused ? 'Paused' : 'Recording...'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Speak clearly into your microphone</p>
            </div>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="flex items-center gap-1 h-6 px-3 py-1 rounded bg-slate-900/80 border border-slate-800">
            {[40, 75, 100, 60, 85, 45, 95, 70, 30, 80, 65, 90, 50, 75].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-rose-400 rounded-full transition-all duration-150"
                style={{
                  height: isPaused ? '4px' : `${Math.max(4, Math.sin((recordingSeconds * 5) + i) * (h / 4) + 12)}px`
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-pause-recording"
              onClick={pauseRecording}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              type="button"
              id="btn-stop-recording"
              onClick={stopRecording}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Done
            </button>
          </div>
        </div>
      )}

      {/* State 3: Voice Note Recorded & Attached */}
      {voiceNote && !isRecording && (
        <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-slate-900/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                id="btn-play-voicenote"
                onClick={togglePlayback}
                className="w-9 h-9 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors shadow-md shrink-0"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div>
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Voice Note Attached</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                    {formatTime(isPlaying ? playbackTime : voiceNote.durationSeconds)} / {formatTime(voiceNote.durationSeconds)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-xs">
                  {voiceNote.filename}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-rerecord-voicenote"
                onClick={() => {
                  deleteVoiceNote();
                  startRecording();
                }}
                title="Re-record voice note"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Re-record</span>
              </button>
              <button
                type="button"
                id="btn-delete-voicenote"
                onClick={deleteVoiceNote}
                title="Delete voice note"
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Progress Bar & Waveform Preview */}
          <div className="w-full bg-slate-950 rounded-lg p-2 border border-slate-800/80">
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-1">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
              <span>{formatTime(playbackTime)}</span>
              <div className="flex gap-0.5 items-center">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full ${
                      (i / 24) * 100 <= playbackProgress ? 'bg-indigo-400' : 'bg-slate-700'
                    }`}
                    style={{ height: `${Math.sin(i * 0.8) * 8 + 10}px` }}
                  />
                ))}
              </div>
              <span>{formatTime(voiceNote.durationSeconds)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
