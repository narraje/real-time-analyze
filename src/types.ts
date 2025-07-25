export interface MonitorConfig {
    storage?: StorageInterface;
    analyzer?: AnalyzerConfig;
    generator?: GeneratorConfig;
    debounceMs?: number;
    pollingIntervalMs?: number;
    maxPollingIntervalMs?: number;
    /**
     * Optional name for the monitor that can be referenced in transcripts.
     * This allows the monitor to recognize when it's being addressed directly.
     */
    name?: string;
    /**
     * Optional role description for the monitor, influencing how it analyzes and responds.
     * Example: 'teacher in a classroom of 3rd graders'
     */
    role?: string;
    /**
     * Optional path or content for additional context about the conversation environment.
     * Provides background information to better inform analysis and generation.
     */
    contextFile?: string;
  }
  
  export interface StorageInterface {
    get(key: string): Promise<string>;
    set(key: string, value: string): Promise<void>;
    subscribe?(key: string, callback: (value: string) => void): () => void;
  }
  
  export interface AnalyzerConfig {
    provider?: 'openai' | 'anthropic' | 'custom';
    apiKey?: string;
    model?: string;
    minWords?: number;
    maxSilenceMs?: number;
    customAnalyzer?: (transcript: string, context: AnalysisContext) => Promise<AnalysisResult>;
  }
  
  export interface GeneratorConfig {
    provider?: 'openai' | 'anthropic' | 'custom';
    apiKey?: string;
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    customGenerator?: (transcript: string, history: Message[]) => Promise<string>;
  }
  
  export interface AnalysisContext {
    transcript: string;
    previousTranscript: string;
    silenceDuration: number;
    conversationHistory: Message[];
    /**
     * Optional name of the monitor that can be referenced in transcripts
     */
    name?: string;
    /**
     * Optional role description affecting analysis behavior
     */
    role?: string;
    /**
     * Optional context file to provide additional information
     */
    contextFile?: string;
  }
  
  export interface AnalysisResult {
    shouldRespond: boolean;
    confidence: number;
    reason: string;
  }
  
  export interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }