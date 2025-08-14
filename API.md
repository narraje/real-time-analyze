# API Documentation

## Table of Contents

- [TranscriptMonitor](#transcriptmonitor)
- [TranscriptAnalyzer](#transcriptanalyzer)
- [ResponseGenerator](#responsegenerator)
- [Storage Classes](#storage-classes)
- [Type Definitions](#type-definitions)
- [Utility Functions](#utility-functions)
- [Error Handling](#error-handling)

## TranscriptMonitor

The main class that orchestrates transcript monitoring and AI response generation.

### Class Declaration

```typescript
class TranscriptMonitor extends EventEmitter {
  constructor(config?: MonitorConfig);
  
  // Public Methods
  start(transcriptKey?: string): Promise<void>;
  stop(): void;
  updateTranscript(transcript: string): Promise<void>;
  getHistory(): Message[];
  clearHistory(): void;
  
  // Events
  on(event: 'transcriptChanged', listener: (transcript: string) => void): this;
  on(event: 'analysisComplete', listener: (result: AnalysisResult) => void): this;
  on(event: 'responseGenerated', listener: (response: string) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'started', listener: () => void): this;
}
```

### Constructor

#### `new TranscriptMonitor(config?: MonitorConfig)`

Creates a new TranscriptMonitor instance.

**Parameters:**
- `config` (optional): Configuration object for the monitor

**Example:**
```typescript
const monitor = new TranscriptMonitor({
  storage: new SimpleStorage(),
  name: 'Assistant',
  role: 'helpful customer service representative',
  debounceMs: 1000,
  analyzer: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    minWords: 5,
    maxSilenceMs: 1500
  },
  generator: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
    maxTokens: 150
  }
});
```

### Methods

#### `start(transcriptKey?: string): Promise<void>`

Starts monitoring for transcript changes.

**Parameters:**
- `transcriptKey` (optional, default: 'transcript'): The key to monitor in storage

**Returns:** Promise that resolves when monitoring starts

**Throws:** Error if storage operations fail

**Example:**
```typescript
// Start with default key
await monitor.start();

// Start with custom key
await monitor.start('custom-transcript-key');
```

#### `stop(): void`

Stops monitoring and cleans up all resources including event listeners.

**Example:**
```typescript
monitor.stop();
```

#### `updateTranscript(transcript: string): Promise<void>`

Manually updates the transcript content and triggers processing.

**Parameters:**
- `transcript`: The new transcript content

**Returns:** Promise that resolves when the transcript is updated

**Example:**
```typescript
await monitor.updateTranscript('Hello, I need help with my order.');
```

#### `getHistory(): Message[]`

Returns a copy of the current conversation history.

**Returns:** Array of Message objects representing the conversation

**Example:**
```typescript
const history = monitor.getHistory();
console.log(`Conversation has ${history.length} messages`);
history.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`);
});
```

#### `clearHistory(): void`

Clears the conversation history.

**Example:**
```typescript
monitor.clearHistory();
console.log('Conversation history cleared');
```

### Events

#### `transcriptChanged`

Emitted when a new transcript is received.

**Callback Parameters:**
- `transcript`: The new transcript content

**Example:**
```typescript
monitor.on('transcriptChanged', (transcript: string) => {
  console.log('New transcript received:', transcript);
  // Update UI, log, etc.
});
```

#### `analysisComplete`

Emitted when transcript analysis is completed.

**Callback Parameters:**
- `result`: Analysis result containing decision and reasoning

**Example:**
```typescript
monitor.on('analysisComplete', (result: AnalysisResult) => {
  console.log(`Analysis: ${result.shouldRespond ? 'Respond' : 'Wait'} (${result.confidence})`);
  console.log(`Reason: ${result.reason}`);
});
```

#### `responseGenerated`

Emitted when an AI response is generated.

**Callback Parameters:**
- `response`: The generated response text

**Example:**
```typescript
monitor.on('responseGenerated', (response: string) => {
  console.log('AI Response:', response);
  // Send to TTS, display in chat, etc.
});
```

#### `error`

Emitted when an error occurs during processing.

**Callback Parameters:**
- `error`: The error that occurred

**Example:**
```typescript
monitor.on('error', (error: Error) => {
  console.error('Monitor error:', error.message);
  // Handle error, retry logic, user notification, etc.
});
```

#### `started`

Emitted when monitoring successfully starts.

**Example:**
```typescript
monitor.on('started', () => {
  console.log('Transcript monitoring is now active');
});
```

## TranscriptAnalyzer

Analyzes transcript content to determine if and when responses are needed.

### Class Declaration

```typescript
class TranscriptAnalyzer {
  constructor(config?: AnalyzerConfig);
  
  analyze(transcript: string, context: AnalysisContext): Promise<AnalysisResult>;
}
```

### Constructor

#### `new TranscriptAnalyzer(config?: AnalyzerConfig)`

Creates a new TranscriptAnalyzer instance.

**Parameters:**
- `config` (optional): Analyzer configuration

**Example:**
```typescript
const analyzer = new TranscriptAnalyzer({
  provider: 'openai',
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini',
  minWords: 3,
  maxSilenceMs: 2000
});
```

### Methods

#### `analyze(transcript: string, context: AnalysisContext): Promise<AnalysisResult>`

Analyzes a transcript to determine if a response should be generated.

**Parameters:**
- `transcript`: The transcript text to analyze
- `context`: Additional context for analysis

**Returns:** Promise resolving to analysis result

**Throws:** Error if analysis fails and no fallback is available

**Example:**
```typescript
const result = await analyzer.analyze('Hello, can you help me?', {
  transcript: 'Hello, can you help me?',
  previousTranscript: '',
  silenceDuration: 2500,
  conversationHistory: [],
  name: 'Assistant',
  role: 'customer service agent'
});

console.log(result);
// {
//   shouldRespond: true,
//   confidence: 0.95,
//   reason: 'Question detected'
// }
```

### Custom Analyzer Function

You can provide a custom analyzer function:

```typescript
const customAnalyzer = async (transcript: string, context: AnalysisContext): Promise<AnalysisResult> => {
  // Custom logic
  const hasUrgentWords = /urgent|emergency|asap/i.test(transcript);
  const isDirectlyAddressed = context.name && 
    transcript.toLowerCase().includes(context.name.toLowerCase());
  
  if (hasUrgentWords) {
    return {
      shouldRespond: true,
      confidence: 0.98,
      reason: 'Urgent keywords detected'
    };
  }
  
  if (isDirectlyAddressed) {
    return {
      shouldRespond: true,
      confidence: 0.9,
      reason: 'Directly addressed'
    };
  }
  
  // Default fallback
  return {
    shouldRespond: false,
    confidence: 0.3,
    reason: 'No clear trigger detected'
  };
};

const analyzer = new TranscriptAnalyzer({
  customAnalyzer
});
```

## ResponseGenerator

Generates contextually appropriate AI responses.

### Class Declaration

```typescript
class ResponseGenerator {
  constructor(config?: GeneratorConfig);
  
  generate(
    transcript: string, 
    history: Message[], 
    options?: GenerationOptions
  ): Promise<string>;
}
```

### Constructor

#### `new ResponseGenerator(config?: GeneratorConfig)`

Creates a new ResponseGenerator instance.

**Parameters:**
- `config` (optional): Generator configuration

**Example:**
```typescript
const generator = new ResponseGenerator({
  provider: 'anthropic',
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-sonnet-20240229',
  systemPrompt: 'You are a helpful customer service representative.',
  temperature: 0.7,
  maxTokens: 200
});
```

### Methods

#### `generate(transcript: string, history: Message[], options?: GenerationOptions): Promise<string>`

Generates an AI response based on the transcript and conversation history.

**Parameters:**
- `transcript`: The current transcript to respond to
- `history`: Array of previous conversation messages
- `options` (optional): Additional generation options

**Returns:** Promise resolving to generated response text

**Throws:** Error if generation fails

**Example:**
```typescript
const response = await generator.generate(
  'I need help canceling my subscription',
  [
    { role: 'user', content: 'Hello', timestamp: Date.now() - 5000 },
    { role: 'assistant', content: 'Hi! How can I help you today?', timestamp: Date.now() - 4000 }
  ],
  {
    name: 'Sarah',
    role: 'customer service representative',
    contextFile: '/path/to/company-policies.json'
  }
);

console.log(response);
// "I'd be happy to help you cancel your subscription. Let me walk you through the process..."
```

### Custom Generator Function

You can provide a custom generator function:

```typescript
const customGenerator = async (transcript: string, history: Message[]): Promise<string> => {
  // Custom generation logic
  if (transcript.toLowerCase().includes('joke')) {
    return "Why don't scientists trust atoms? Because they make up everything!";
  }
  
  if (transcript.toLowerCase().includes('time')) {
    return `The current time is ${new Date().toLocaleTimeString()}`;
  }
  
  // Default response
  return "I understand. How can I help you further?";
};

const generator = new ResponseGenerator({
  customGenerator
});
```

## Storage Classes

### SimpleStorage

In-memory storage implementation with subscription support.

#### Class Declaration

```typescript
class SimpleStorage implements StorageInterface {
  constructor();
  
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  subscribe(key: string, callback: (value: string) => void): () => void;
}
```

#### Methods

##### `get(key: string): Promise<string>`

Retrieves a value from storage.

**Parameters:**
- `key`: Storage key

**Returns:** Promise resolving to stored value (empty string if not found)

##### `set(key: string, value: string): Promise<void>`

Stores a value and notifies subscribers.

**Parameters:**
- `key`: Storage key
- `value`: Value to store

**Returns:** Promise that resolves when stored

##### `subscribe(key: string, callback: (value: string) => void): () => void`

Subscribes to changes for a specific key.

**Parameters:**
- `key`: Key to watch
- `callback`: Function called when value changes

**Returns:** Unsubscribe function

**Example:**
```typescript
const storage = new SimpleStorage();

// Subscribe to changes
const unsubscribe = storage.subscribe('transcript', (newValue) => {
  console.log('Transcript updated:', newValue);
});

// Set value (triggers callback)
await storage.set('transcript', 'Hello world');

// Get value
const value = await storage.get('transcript');

// Unsubscribe
unsubscribe();
```

### BrowserStorage

Browser localStorage/sessionStorage adapter.

#### Class Declaration

```typescript
class BrowserStorage implements StorageInterface {
  constructor(storage?: Storage);
  
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  subscribe(key: string, callback: (value: string) => void): () => void;
}
```

#### Constructor

##### `new BrowserStorage(storage?: Storage)`

Creates a browser storage adapter.

**Parameters:**
- `storage` (optional): Storage object (localStorage or sessionStorage)

**Example:**
```typescript
// Use localStorage (default)
const storage = new BrowserStorage();

// Use sessionStorage
const sessionStorage = new BrowserStorage(window.sessionStorage);

// Custom storage object
const customStorage = new BrowserStorage(myCustomStorageImplementation);
```

#### Methods

Methods are identical to SimpleStorage but persist data in browser storage.

**Example:**
```typescript
const storage = new BrowserStorage();

// Data persists across browser sessions
await storage.set('user-preference', 'dark-mode');

// Retrieve persisted data
const preference = await storage.get('user-preference');
```

### Custom Storage Implementation

You can implement custom storage by following the StorageInterface:

```typescript
import { StorageInterface } from 'transcript-monitor-agent';

class DatabaseStorage implements StorageInterface {
  private subscribers = new Map<string, Set<(value: string) => void>>();
  
  async get(key: string): Promise<string> {
    // Implement database retrieval
    const result = await db.query('SELECT value FROM storage WHERE key = ?', [key]);
    return result[0]?.value || '';
  }
  
  async set(key: string, value: string): Promise<void> {
    // Implement database storage
    await db.query('INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)', [key, value]);
    
    // Notify subscribers
    const callbacks = this.subscribers.get(key);
    if (callbacks) {
      callbacks.forEach(callback => callback(value));
    }
  }
  
  subscribe(key: string, callback: (value: string) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);
    
    return () => {
      const callbacks = this.subscribers.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }
}
```

## Type Definitions

### MonitorConfig

Configuration for TranscriptMonitor.

```typescript
interface MonitorConfig {
  /** Storage implementation (default: in-memory) */
  storage?: StorageInterface;
  
  /** Analyzer configuration */
  analyzer?: AnalyzerConfig;
  
  /** Response generator configuration */
  generator?: GeneratorConfig;
  
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number;
  
  /** Polling interval in milliseconds (default: 500) */
  pollingIntervalMs?: number;
  
  /** Maximum polling interval in milliseconds (default: 5000) */
  maxPollingIntervalMs?: number;
  
  /** Optional name for direct addressing */
  name?: string;
  
  /** Optional role description for contextual behavior */
  role?: string;
  
  /** Optional context file path or content */
  contextFile?: string;
}
```

### AnalyzerConfig

Configuration for TranscriptAnalyzer.

```typescript
interface AnalyzerConfig {
  /** AI provider ('openai', 'anthropic', or 'custom') */
  provider?: 'openai' | 'anthropic' | 'custom';
  
  /** API key for AI providers */
  apiKey?: string;
  
  /** Model name (provider-specific) */
  model?: string;
  
  /** Minimum word count before analysis (default: 5) */
  minWords?: number;
  
  /** Maximum silence duration in ms (default: 1500) */
  maxSilenceMs?: number;
  
  /** Custom analyzer function */
  customAnalyzer?: (transcript: string, context: AnalysisContext) => Promise<AnalysisResult>;
}
```

### GeneratorConfig

Configuration for ResponseGenerator.

```typescript
interface GeneratorConfig {
  /** AI provider ('openai', 'anthropic', or 'custom') */
  provider?: 'openai' | 'anthropic' | 'custom';
  
  /** API key for AI providers */
  apiKey?: string;
  
  /** Model name (provider-specific) */
  model?: string;
  
  /** System prompt for AI */
  systemPrompt?: string;
  
  /** Response creativity 0-1 (default: 0.7) */
  temperature?: number;
  
  /** Maximum response length (default: 150) */
  maxTokens?: number;
  
  /** Custom generator function */
  customGenerator?: (transcript: string, history: Message[]) => Promise<string>;
}
```

### AnalysisContext

Context provided to analyzers.

```typescript
interface AnalysisContext {
  /** Current transcript text */
  transcript: string;
  
  /** Previous transcript text */
  previousTranscript: string;
  
  /** Duration of silence in milliseconds */
  silenceDuration: number;
  
  /** Conversation history */
  conversationHistory: Message[];
  
  /** Optional monitor name for direct addressing */
  name?: string;
  
  /** Optional monitor role */
  role?: string;
  
  /** Optional context file path or content */
  contextFile?: string;
}
```

### AnalysisResult

Result of transcript analysis.

```typescript
interface AnalysisResult {
  /** Whether to generate a response */
  shouldRespond: boolean;
  
  /** Confidence level 0-1 */
  confidence: number;
  
  /** Human-readable reasoning */
  reason: string;
}
```

### Message

Conversation message structure.

```typescript
interface Message {
  /** Message sender role */
  role: 'user' | 'assistant';
  
  /** Message content */
  content: string;
  
  /** Unix timestamp */
  timestamp: number;
}
```

### StorageInterface

Interface for storage implementations.

```typescript
interface StorageInterface {
  /** Retrieve value by key */
  get(key: string): Promise<string>;
  
  /** Store value by key */
  set(key: string, value: string): Promise<void>;
  
  /** Subscribe to key changes (optional) */
  subscribe?(key: string, callback: (value: string) => void): () => void;
}
```

### GenerationOptions

Options for response generation.

```typescript
interface GenerationOptions {
  /** Assistant name */
  name?: string;
  
  /** Assistant role */
  role?: string;
  
  /** Context file path or content */
  contextFile?: string;
}
```

## Utility Functions

### debounce

Debounces function calls.

```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void
```

**Parameters:**
- `func`: Function to debounce
- `wait`: Wait time in milliseconds

**Returns:** Debounced function

**Example:**
```typescript
import { debounce } from 'transcript-monitor-agent';

const debouncedLog = debounce((message: string) => {
  console.log(message);
}, 1000);

// Only the last call within 1 second will execute
debouncedLog('Message 1');
debouncedLog('Message 2');
debouncedLog('Message 3'); // Only this will be logged
```

### retry

Retries async operations with exponential backoff.

```typescript
function retry<T>(
  fn: () => Promise<T>,
  maxAttempts?: number,
  delay?: number
): Promise<T>
```

**Parameters:**
- `fn`: Async function to retry
- `maxAttempts`: Maximum retry attempts (default: 3)
- `delay`: Initial delay in milliseconds (default: 1000)

**Returns:** Promise with result or throws last error

**Example:**
```typescript
import { retry } from 'transcript-monitor-agent';

const result = await retry(
  async () => {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  3,  // Max 3 attempts
  500 // Start with 500ms delay
);
```

## Error Handling

### Common Errors

#### API Errors

```typescript
monitor.on('error', (error) => {
  if (error.message.includes('API')) {
    console.error('API Error:', error.message);
    // Check API key, endpoint availability, etc.
  }
});
```

#### Rate Limiting

```typescript
monitor.on('error', (error) => {
  if (error.message.includes('rate limit')) {
    console.error('Rate limited - implementing backoff');
    // Implement exponential backoff
  }
});
```

#### Network Errors

```typescript
monitor.on('error', (error) => {
  if (error.message.includes('network') || error.message.includes('fetch')) {
    console.error('Network error - retrying...');
    // Implement retry logic
  }
});
```

### Error Recovery

The library includes built-in error recovery:

1. **Retry mechanisms**: Automatic retries with exponential backoff
2. **Fallback analysis**: Rule-based analysis when AI fails
3. **Graceful degradation**: Continues monitoring even after errors
4. **Event emission**: All errors are emitted for handling

### Best Practices

1. **Always listen for errors**: Implement error event handlers
2. **Validate API keys**: Check credentials before starting
3. **Monitor rate limits**: Implement appropriate delays
4. **Handle network issues**: Consider offline scenarios
5. **Log errors appropriately**: Include context for debugging

```typescript
// Comprehensive error handling
monitor.on('error', (error) => {
  // Log with context
  console.error(`TranscriptMonitor Error [${new Date().toISOString()}]:`, {
    message: error.message,
    stack: error.stack,
    // Add any relevant context
  });
  
  // Implement recovery strategies
  if (error.message.includes('rate limit')) {
    // Implement backoff
    setTimeout(() => {
      // Resume operations
    }, 60000);
  } else if (error.message.includes('API key')) {
    // Notify user to check credentials
    console.error('Please check your API credentials');
  }
});
```