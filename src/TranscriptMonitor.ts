import { EventEmitter } from 'events';
import { TranscriptAnalyzer } from './TranscriptAnalyzer';
import { ResponseGenerator } from './ResponseGenerator';
import { debounce, retry } from './utils';
import { MonitorConfig, Message, StorageInterface } from './types';

export class TranscriptMonitor extends EventEmitter {
  private config: Required<MonitorConfig>;
  private analyzer: TranscriptAnalyzer;
  private generator: ResponseGenerator;
  private storage: StorageInterface;
  private lastTranscript: string = '';
  private lastChangeTime: number = Date.now();
  private conversationHistory: Message[] = [];
  private isProcessing: boolean = false;
  private processTranscript: (transcript: string, silenceDuration: number) => void;

  constructor(config: MonitorConfig = {}) {
    super();
    
    // Set defaults
    this.config = {
      storage: config.storage || this.createDefaultStorage(),
      analyzer: config.analyzer || {},
      generator: config.generator || {},
      debounceMs: config.debounceMs ?? 1000
    };
    
    this.storage = this.config.storage;
    this.analyzer = new TranscriptAnalyzer(this.config.analyzer);
    this.generator = new ResponseGenerator(this.config.generator);
    
    // Debounce transcript processing
    this.processTranscript = debounce(
      this._processTranscript.bind(this),
      this.config.debounceMs
    );
  }

  private createDefaultStorage(): StorageInterface {
    // Simple in-memory storage
    const store = new Map<string, string>();
    return {
      async get(key: string) {
        return store.get(key) || '';
      },
      async set(key: string, value: string) {
        store.set(key, value);
      }
    };
  }

  async start(transcriptKey: string = 'transcript') {
    // Set up polling or subscription
    if (this.storage.subscribe) {
      // Use subscription if available
      const unsubscribe = this.storage.subscribe(transcriptKey, (transcript) => {
        this.handleTranscriptChange(transcript);
      });
      
      this.once('stop', unsubscribe);
    } else {
      // Fall back to polling
      const pollInterval = setInterval(async () => {
        const transcript = await this.storage.get(transcriptKey);
        if (transcript !== this.lastTranscript) {
          this.handleTranscriptChange(transcript);
        }
      }, 100);
      
      this.once('stop', () => clearInterval(pollInterval));
    }
    
    this.emit('started');
  }

  async updateTranscript(transcript: string) {
    await this.storage.set('transcript', transcript);
    this.handleTranscriptChange(transcript);
  }

  private handleTranscriptChange(transcript: string) {
    const now = Date.now();
    const silenceDuration = now - this.lastChangeTime;
    
    this.lastChangeTime = now;
    this.lastTranscript = transcript;
    
    this.emit('transcriptChanged', transcript);
    
    // Process with debounce
    this.processTranscript(transcript, silenceDuration);
  }

  private async _processTranscript(transcript: string, silenceDuration: number) {
    if (this.isProcessing || !transcript.trim()) return;
    
    this.isProcessing = true;
    
    try {
      // Analyze if we should respond
      const context = {
        transcript,
        previousTranscript: this.lastTranscript,
        silenceDuration,
        conversationHistory: this.conversationHistory
      };
      
      const analysis = await retry(() => 
        this.analyzer.analyze(transcript, context),
        3
      );
      
      this.emit('analysisComplete', analysis);
      
      if (analysis.shouldRespond) {
        // Generate response
        const response = await retry(() => 
          this.generator.generate(transcript, this.conversationHistory),
          3
        );
        
        // Update conversation history
        this.conversationHistory.push(
          { role: 'user', content: transcript, timestamp: Date.now() },
          { role: 'assistant', content: response, timestamp: Date.now() }
        );
        
        // Keep history manageable
        if (this.conversationHistory.length > 20) {
          this.conversationHistory = this.conversationHistory.slice(-20);
        }
        
        this.emit('responseGenerated', response);
      }
    } catch (error) {
      this.emit('error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    this.emit('stop');
    this.removeAllListeners();
  }

  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}