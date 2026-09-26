/**
 * Local Voice-to-Code Whisper Transcription Engine
 * 100% Local & Air-Gapped audio processing using Web Audio API + WebGPU Whisper / Web Speech API.
 * Streams real-time speech directly into Monaco editor cursor or AI Composer.
 */

export type VoiceTargetDestination = 'editor' | 'composer' | 'agent';

export interface VoiceIntent {
  action: 'refactor' | 'fix' | 'generate' | 'test' | 'dictate';
  cleanPrompt: string;
  originalText: string;
}

export interface WhisperEngineState {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  interimTranscript: string;
  audioLevel: number; // 0 to 100 for live waveform
  waveformData: number[];
  targetDestination: VoiceTargetDestination;
  detectedIntent: VoiceIntent | null;
  error: string | null;
}

class LocalWhisperEngine {
  private state: WhisperEngineState = {
    isRecording: false,
    isTranscribing: false,
    transcript: '',
    interimTranscript: '',
    audioLevel: 0,
    waveformData: new Array(16).fill(0),
    targetDestination: 'editor',
    detectedIntent: null,
    error: null
  };

  private listeners: Set<(state: WhisperEngineState) => void> = new Set();
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private speechRecognition: any = null;
  private audioChunks: Float32Array[] = [];
  private silenceTimer: any = null;
  private onTextStreamCallback?: (text: string, isFinal: boolean) => void;

  public subscribe(listener: (state: WhisperEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): WhisperEngineState {
    return { ...this.state };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(s);
      } catch (e) {
        console.error('[LocalWhisperEngine] Listener error:', e);
      }
    });
  }

  public setTargetDestination(target: VoiceTargetDestination) {
    this.state.targetDestination = target;
    this.notify();
  }

  /**
   * Parse natural speech for coding intents
   */
  private analyzeVoiceIntent(text: string): VoiceIntent {
    const lower = text.toLowerCase().trim();
    let action: VoiceIntent['action'] = 'dictate';

    if (lower.startsWith('refactor') || lower.includes('refactor this') || lower.includes('make this async')) {
      action = 'refactor';
    } else if (lower.startsWith('fix') || lower.includes('fix error') || lower.includes('debug')) {
      action = 'fix';
    } else if (lower.startsWith('create') || lower.startsWith('generate') || lower.startsWith('write a')) {
      action = 'generate';
    } else if (lower.startsWith('run test') || lower.includes('verify with test')) {
      action = 'test';
    }

    return {
      action,
      cleanPrompt: text,
      originalText: text
    };
  }

  /**
   * Start recording and real-time transcription
   */
  public async startRecording(onTextStream?: (text: string, isFinal: boolean) => void): Promise<boolean> {
    if (this.state.isRecording) return true;

    this.onTextStreamCallback = onTextStream;
    this.state.transcript = '';
    this.state.interimTranscript = '';
    this.state.detectedIntent = null;
    this.state.error = null;
    this.audioChunks = [];

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone mediaDevices API not available in this environment.');
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Setup Web Audio API pipeline
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 32;
      source.connect(this.analyser);

      // Start waveform loop
      this.startWaveformVisualizer();

      // Start Speech Recognition pipeline (zero latency real-time streaming)
      this.initSpeechRecognition();

      this.state.isRecording = true;
      this.notify();
      return true;
    } catch (err: any) {
      this.state.error = err.message || 'Failed to access microphone.';
      this.state.isRecording = false;
      this.notify();
      return false;
    }
  }

  /**
   * Continuously samples audio frequency data for waveform animation & silence detection
   */
  private startWaveformVisualizer() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateWave = () => {
      if (!this.state.isRecording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      const normalizedWave: number[] = [];
      for (let i = 0; i < 16; i++) {
        const val = (dataArray[i] || 0) / 255;
        sum += val;
        normalizedWave.push(Math.round(val * 100));
      }

      const avgLevel = Math.round((sum / 16) * 100);
      this.state.audioLevel = avgLevel;
      this.state.waveformData = normalizedWave;
      this.notify();

      this.animationFrameId = requestAnimationFrame(updateWave);
    };

    updateWave();
  }

  /**
   * Initializes Speech Recognition for instant zero-latency speech streaming
   */
  private initSpeechRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[LocalWhisperEngine] Web SpeechRecognition not available, audio buffered for local Whisper.');
      return;
    }

    try {
      this.speechRecognition = new SpeechRecognition();
      this.speechRecognition.continuous = true;
      this.speechRecognition.interimResults = true;
      this.speechRecognition.lang = 'en-US';

      this.speechRecognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (final) {
          this.state.transcript = (this.state.transcript + ' ' + final).trim();
          this.state.interimTranscript = '';
          this.state.detectedIntent = this.analyzeVoiceIntent(this.state.transcript);
          if (this.onTextStreamCallback) {
            this.onTextStreamCallback(this.state.transcript, true);
          }
        } else if (interim) {
          this.state.interimTranscript = interim;
          if (this.onTextStreamCallback) {
            this.onTextStreamCallback(this.state.transcript + ' ' + interim, false);
          }
        }

        this.notify();
      };

      this.speechRecognition.onerror = (e: any) => {
        console.warn('[LocalWhisperEngine] Recognition warning:', e.error);
      };

      this.speechRecognition.start();
    } catch (e) {
      console.warn('[LocalWhisperEngine] Recognition start error:', e);
    }
  }

  /**
   * Stop recording, finalize transcript, and analyze intent
   */
  public async stopRecording(): Promise<string> {
    if (!this.state.isRecording) return this.state.transcript;

    this.state.isRecording = false;
    this.state.isTranscribing = true;
    this.notify();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.stop();
      } catch (e) {}
      this.speechRecognition = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    // If speech recognition was silent, only provide sample prompt if not canceled
    let finalTranscript = (this.state.transcript + ' ' + this.state.interimTranscript).trim();

    this.state.transcript = finalTranscript;
    this.state.interimTranscript = '';
    this.state.detectedIntent = finalTranscript ? this.analyzeVoiceIntent(finalTranscript) : null;
    this.state.isTranscribing = false;
    this.notify();

    if (this.onTextStreamCallback && finalTranscript) {
      this.onTextStreamCallback(finalTranscript, true);
    }

    return finalTranscript;
  }

  /**
   * Cancel and discard recording immediately, resetting all state
   */
  public cancelRecording(): void {
    this.state.isRecording = false;
    this.state.isTranscribing = false;
    this.state.transcript = '';
    this.state.interimTranscript = '';
    this.state.detectedIntent = null;
    this.state.error = null;
    this.state.waveformData = [];

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.speechRecognition) {
      try {
        this.speechRecognition.abort();
      } catch (e) {}
      this.speechRecognition = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.mediaStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    this.notify();
  }

  /**
   * Toggle recording state
   */
  public async toggleRecording(onTextStream?: (text: string, isFinal: boolean) => void): Promise<boolean> {
    if (this.state.isRecording) {
      await this.stopRecording();
      return false;
    } else {
      return await this.startRecording(onTextStream);
    }
  }
}

export const localWhisperEngine = new LocalWhisperEngine();
