export interface MonitorConfig {
    storage?: StorageInterface;
    analyzer?: AnalyzerConfig;
    generator?: GeneratorConfig;
    debounceMs?: number;
    pollingIntervalMs?: number;
    maxPollingIntervalMs?: number;
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