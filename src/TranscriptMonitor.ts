import { EventEmitter } from 'events';
import { TranscriptAnalyzer } from './TranscriptAnalyzer';
import { ResponseGenerator } from './ResponseGenerator';
import { debounce, retry } from './utils';
import { MonitorConfig, Message, StorageInterface } from './types';

/**
 * TranscriptMonitor - The main class that orchestrates real-time transcript monitoring and response generation
 * 
 * This class handles: 
 * - Receiving and processing transcript updates
 * - Debouncing transcript changes
 * - Analyzing when a response is needed
 * - Generating intelligent AI responses
 * - Maintaining conversation history
 * - Emitting relevant events for integration
 * 
 * @example
 * ```typescript
 * import { TranscriptMonitor, SimpleStorage } from 'transcript-monitor-agent';
 * 
 * const monitor = new TranscriptMonitor({
 *   storage: new SimpleStorage(),
 *   analyzer: {
 *     provider: 'openai',
 *     apiKey: process.env.OPENAI_API_KEY,
 *     minWords: 5,
 *     maxSilenceMs: 1500
 *   },
 *   generator: {
 *     provider: 'openai',
 *     apiKey: process.env.OPENAI_API_KEY,
 *     model: 'gpt-4o',
 *     systemPrompt: 'You are a helpful assistant.',
 *     temperature: 0.7
 *   }
 * });
 * 
 * monitor.on('responseGenerated', (response) => {
 *   console.log('AI Response:', response);
 * });
 * 
 * await monitor.start();
 * monitor.updateTranscript('Hello, how can you help me?');
 * ```
 * 
 * @fires TranscriptMonitor#transcriptChanged
 * @fires TranscriptMonitor#analysisComplete
 * @fires TranscriptMonitor#responseGenerated
 * @fires TranscriptMonitor#error
 * @fires TranscriptMonitor#started
 */
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

  /**
   * Creates a new TranscriptMonitor instance with the specified configuration.
   * 
   * @param config - Configuration object for the monitor (optional)
   * @param config.storage - Storage implementation for transcript persistence
   * @param config.analyzer - Configuration for transcript analysis
   * @param config.generator - Configuration for response generation
   * @param config.debounceMs - Debounce delay in milliseconds (default: 1000)
   * @param config.pollingIntervalMs - Polling interval in milliseconds (default: 500)
   * @param config.maxPollingIntervalMs - Maximum polling interval in milliseconds (default: 5000)
   * @param config.name - Optional name for direct addressing
   * @param config.role - Optional role description for contextual behavior
   * @param config.contextFile - Optional context file path or content
   * 
   * @example
   * ```typescript
   * const monitor = new TranscriptMonitor({
   *   name: 'Assistant',
   *   role: 'helpful customer service representative',
   *   debounceMs: 1000,
   *   analyzer: {
   *     provider: 'openai',
   *     apiKey: process.env.OPENAI_API_KEY
   *   }
   * });
   * ```
   */
  constructor(config: MonitorConfig = {}) {
    super();
    
    // Set defaults
    this.config = {
      storage: config.storage || this.createDefaultStorage(),
      analyzer: config.analyzer || {},
      generator: config.generator || {},
      debounceMs: config.debounceMs ?? 1000,
      pollingIntervalMs: config.pollingIntervalMs ?? 500,
      maxPollingIntervalMs: config.maxPollingIntervalMs ?? 5000,
      name: config.name || '',
      role: config.role || '',
      contextFile: config.contextFile || ''
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

  /**
   * Starts monitoring for transcript changes using either subscription or polling.
   * 
   * @param transcriptKey - The storage key to monitor for transcript changes (default: 'transcript')
   * @returns Promise that resolves when monitoring starts successfully
   * @throws {Error} If storage operations fail during startup
   * 
   * @example
   * ```typescript
   * // Start with default key
   * await monitor.start();
   * 
   * // Start with custom key
   * await monitor.start('custom-transcript-key');
   * ```
   * 
   * @fires TranscriptMonitor#started
   */
  async start(transcriptKey: string = 'transcript') {
    // Set up polling or subscription
    if (this.storage.subscribe) {
      // Use subscription if available
      const unsubscribe = this.storage.subscribe(transcriptKey, (transcript) => {
        this.handleTranscriptChange(transcript);
      });
      
      this.once('stop', unsubscribe);
    } else {
      // Fall back to adaptive polling
      let currentInterval = this.config.pollingIntervalMs;
      let pollTimeout: NodeJS.Timeout;
      
      const poll = async () => {
        try {
          const transcript = await this.storage.get(transcriptKey);
          if (transcript !== this.lastTranscript) {
            this.handleTranscriptChange(transcript);
            // Reset to faster polling when changes detected
            currentInterval = this.config.pollingIntervalMs;
          } else {
            // Gradually slow down polling when no changes
            currentInterval = Math.min(
              currentInterval * 1.5,
              this.config.maxPollingIntervalMs
            );
          }
        } catch (error) {
          this.emit('error', error);
        }
        
        pollTimeout = setTimeout(poll, currentInterval);
      };
      
      // Start polling
      poll();
      
      this.once('stop', () => {
        if (pollTimeout) clearTimeout(pollTimeout);
      });
    }
    
    this.emit('started');
  }

  /**
   * Manually updates the transcript content and triggers processing.
   * 
   * @param transcript - The new transcript content to process
   * @returns Promise that resolves when the transcript is updated and stored
   * @throws {Error} If storage operations fail
   * 
   * @example
   * ```typescript
   * await monitor.updateTranscript('User said something new...');
   * await monitor.updateTranscript('How can I help you today?');
   * ```
   * 
   * @fires TranscriptMonitor#transcriptChanged
   */
  async updateTranscript(transcript: string) {
    await this.storage.set('transcript', transcript);
    this.handleTranscriptChange(transcript);
  }

  private handleTranscriptChange(transcript: string) {
    const now = Date.now();
    
    this.lastChangeTime = now;
    this.lastTranscript = transcript;
    
    this.emit('transcriptChanged', transcript);
    
    // Process with debounce - silence duration calculated at processing time
    this.processTranscript(transcript, 0); // Will be recalculated in _processTranscript
  }

  private async _processTranscript(transcript: string, silenceDuration: number) {
    if (!transcript.trim()) return;
    
    // Atomic check-and-set to prevent race conditions
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      // Calculate actual silence duration at processing time
      const now = Date.now();
      const actualSilenceDuration = now - this.lastChangeTime;
      
      // Analyze if we should respond
      const context = {
        transcript,
        previousTranscript: this.lastTranscript,
        silenceDuration: actualSilenceDuration,
        conversationHistory: this.conversationHistory,
        name: this.config.name,
        role: this.config.role,
        contextFile: this.config.contextFile
      };
      
      const analysis = await retry(() => 
        this.analyzer.analyze(transcript, context),
        3
      );
      
      this.emit('analysisComplete', analysis);
      
      if (analysis.shouldRespond) {
        // Generate response
        const response = await retry(() => 
          this.generator.generate(
            transcript, 
            this.conversationHistory, 
            {
              name: this.config.name,
              role: this.config.role,
              contextFile: this.config.contextFile
            }
          ),
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

  /**
   * Stops monitoring and cleans up all resources including event listeners.
   * This method should be called when the monitor is no longer needed to prevent memory leaks.
   * 
   * @example
   * ```typescript
   * monitor.stop();
   * ```
   */
  stop() {
    this.emit('stop');
    this.removeAllListeners();
  }

  /**
   * Returns a copy of the current conversation history.
   * 
   * @returns Array of Message objects representing the conversation history
   * 
   * @example
   * ```typescript
   * const history = monitor.getHistory();
   * console.log(`Conversation has ${history.length} messages`);
   * 
   * history.forEach(msg => {
   *   console.log(`${msg.role}: ${msg.content} (${new Date(msg.timestamp).toLocaleString()})`);
   * });
   * ```
   */
  getHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Clears the conversation history, removing all stored messages.
   * This is useful for starting fresh conversations or managing memory usage.
   * 
   * @example
   * ```typescript
   * monitor.clearHistory();
   * console.log('Conversation history cleared');
   * ```
   */
  clearHistory() {
    this.conversationHistory = [];
  }
}