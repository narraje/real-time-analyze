# transcript-monitor-agent

**A comprehensive TypeScript library for real-time transcript monitoring and intelligent AI response generation.**

[![npm version](https://img.shields.io/npm/v/transcript-monitor-agent.svg)](https://www.npmjs.com/package/transcript-monitor-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.5+-blue.svg)](https://www.typescriptlang.org/)

## Overview

Transcript-monitor-agent is a powerful, event-driven library that provides seamless transcript monitoring coupled with intelligent response generation. It's designed to simplify real-time communication processes, making it an indispensable tool for building responsive AI assistants, chatbots, and interactive voice applications.

### Key Features

- 🎯 **Real-time transcript monitoring** with configurable debouncing
- 🤖 **Multi-provider AI support** (OpenAI, Anthropic, custom implementations)
- 📊 **Intelligent response timing** based on context analysis
- 🔧 **Highly configurable** with extensive customization options
- 💾 **Flexible storage backends** (memory, localStorage, custom)
- 📝 **Event-driven architecture** for seamless integration
- 🎭 **Role-based responses** with contextual awareness
- 📚 **Conversation history management** with automatic cleanup
- ⚡ **TypeScript-first** with comprehensive type definitions

## Recent Updates (v1.1.1)

- ✨ Added named addressing support for direct monitor interaction
- 🎭 Introduced role-based analysis and response generation
- 📄 Added context file support for enhanced situational awareness
- 🔄 Improved retry mechanisms with exponential backoff
- 🚀 Performance optimizations and memory management improvements
- 📚 Enhanced TypeScript definitions and JSDoc documentation

## Quick Start

### Installation

```bash
npm install transcript-monitor-agent
```

### Basic Usage

```typescript
import { TranscriptMonitor, SimpleStorage } from 'transcript-monitor-agent';

// Initialize with OpenAI
const monitor = new TranscriptMonitor({
  storage: new SimpleStorage(),
  
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
    systemPrompt: 'You are a helpful assistant. Be concise and friendly.',
    temperature: 0.7
  },
  
  debounceMs: 1000
});

// Event listeners
monitor.on('transcriptChanged', (transcript: string) => {
  console.log('📝 New transcript:', transcript);
});

monitor.on('analysisComplete', (result) => {
  console.log('🔍 Analysis result:', result);
});

monitor.on('responseGenerated', (response: string) => {
  console.log('🤖 AI Response:', response);
});

monitor.on('error', (error: Error) => {
  console.error('❌ Error:', error);
});

// Start monitoring
await monitor.start();

// Send transcript updates
monitor.updateTranscript('Hello, how can you help me today?');
```

## Core API Reference

### TranscriptMonitor

The main orchestrator class that manages transcript monitoring and response generation.

#### Constructor

```typescript
new TranscriptMonitor(config?: MonitorConfig)
```

**MonitorConfig Interface:**

```typescript
interface MonitorConfig {
  storage?: StorageInterface;           // Custom storage implementation
  analyzer?: AnalyzerConfig;           // Analysis configuration
  generator?: GeneratorConfig;         // Response generation configuration
  debounceMs?: number;                // Debounce delay (default: 1000ms)
  pollingIntervalMs?: number;         // Polling interval (default: 500ms)
  maxPollingIntervalMs?: number;      // Max polling interval (default: 5000ms)
  name?: string;                      // Monitor name for direct addressing
  role?: string;                      // Role description for contextual behavior
  contextFile?: string;               // Path to context file or direct content
}
```

#### Methods

##### `start(transcriptKey?: string): Promise<void>`
Starts monitoring for transcript changes.

```typescript
await monitor.start('transcript'); // Custom key
await monitor.start();              // Uses default 'transcript' key
```

##### `stop(): void`
Stops monitoring and cleans up resources.

```typescript
monitor.stop();
```

##### `updateTranscript(transcript: string): Promise<void>`
Manually updates the transcript content.

```typescript
await monitor.updateTranscript('User said something new...');
```

##### `getHistory(): Message[]`
Returns the current conversation history.

```typescript
const history = monitor.getHistory();
console.log('Conversation history:', history);
```

##### `clearHistory(): void`
Clears the conversation history.

```typescript
monitor.clearHistory();
```

#### Events

##### `transcriptChanged`
Emitted when a new transcript is received.
```typescript
monitor.on('transcriptChanged', (transcript: string) => {
  // Handle new transcript
});
```

##### `analysisComplete`
Emitted when transcript analysis is completed.
```typescript
monitor.on('analysisComplete', (result: AnalysisResult) => {
  // Handle analysis result
});
```

##### `responseGenerated`
Emitted when an AI response is generated.
```typescript
monitor.on('responseGenerated', (response: string) => {
  // Handle generated response
});
```

##### `error`
Emitted when an error occurs.
```typescript
monitor.on('error', (error: Error) => {
  // Handle error
});
```

##### `started`
Emitted when monitoring starts.
```typescript
monitor.on('started', () => {
  console.log('Monitoring started');
});
```

### TranscriptAnalyzer

Analyzes transcript content to determine when responses are needed.

#### Constructor

```typescript
new TranscriptAnalyzer(config?: AnalyzerConfig)
```

**AnalyzerConfig Interface:**

```typescript
interface AnalyzerConfig {
  provider?: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;                    // API key for AI providers
  model?: string;                     // Model name (optional)
  minWords?: number;                  // Minimum words before analysis (default: 5)
  maxSilenceMs?: number;             // Maximum silence duration (default: 1500ms)
  customAnalyzer?: (transcript: string, context: AnalysisContext) => Promise<AnalysisResult>;
}
```

#### Methods

##### `analyze(transcript: string, context: AnalysisContext): Promise<AnalysisResult>`
Analyzes transcript content and context to determine response necessity.

```typescript
const result = await analyzer.analyze('Hello there!', {
  transcript: 'Hello there!',
  previousTranscript: '',
  silenceDuration: 2000,
  conversationHistory: [],
  name: 'Assistant',
  role: 'helpful assistant'
});
```

### ResponseGenerator

Generates contextually appropriate AI responses.

#### Constructor

```typescript
new ResponseGenerator(config?: GeneratorConfig)
```

**GeneratorConfig Interface:**

```typescript
interface GeneratorConfig {
  provider?: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;                    // API key for AI providers
  model?: string;                     // Model name
  systemPrompt?: string;              // System prompt for AI
  temperature?: number;               // Response creativity (0-1, default: 0.7)
  maxTokens?: number;                // Maximum response length (default: 150)
  customGenerator?: (transcript: string, history: Message[]) => Promise<string>;
}
```

#### Methods

##### `generate(transcript: string, history: Message[], options?: GenerationOptions): Promise<string>`
Generates an AI response based on transcript and conversation history.

```typescript
const response = await generator.generate(
  'What is machine learning?',
  conversationHistory,
  {
    name: 'Assistant',
    role: 'teacher',
    contextFile: 'context.json'
  }
);
```

### Storage Classes

#### SimpleStorage
In-memory storage with subscription support.

```typescript
const storage = new SimpleStorage();
await storage.set('key', 'value');
const value = await storage.get('key');

// Subscribe to changes
const unsubscribe = storage.subscribe('key', (value) => {
  console.log('Value changed:', value);
});
```

#### BrowserStorage
Browser localStorage/sessionStorage adapter.

```typescript
const storage = new BrowserStorage(localStorage);
// Or use sessionStorage
const sessionStorage = new BrowserStorage(window.sessionStorage);
```

### Type Definitions

#### AnalysisResult
```typescript
interface AnalysisResult {
  shouldRespond: boolean;    // Whether to generate a response
  confidence: number;        // Confidence level (0-1)
  reason: string;           // Human-readable reasoning
}
```

#### AnalysisContext
```typescript
interface AnalysisContext {
  transcript: string;              // Current transcript
  previousTranscript: string;      // Previous transcript
  silenceDuration: number;         // Duration of silence in ms
  conversationHistory: Message[];  // Conversation history
  name?: string;                   // Monitor name
  role?: string;                   // Monitor role
  contextFile?: string;            // Context file path/content
}
```

#### Message
```typescript
interface Message {
  role: 'user' | 'assistant';    // Message sender
  content: string;               // Message content
  timestamp: number;             // Unix timestamp
}
```

## Advanced Usage Examples

### Named Assistant with Role

```typescript
const monitor = new TranscriptMonitor({
  name: 'Julia',
  role: 'patient math tutor for high school students',
  
  analyzer: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    minWords: 3,
    maxSilenceMs: 2000
  },
  
  generator: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    systemPrompt: 'You are Julia, a patient math tutor. Explain concepts step by step.',
    temperature: 0.6
  }
});

// The monitor will respond more readily when addressed as "Julia"
monitor.updateTranscript('Julia, can you help me with calculus?');
```

### Custom Analysis Logic

```typescript
const monitor = new TranscriptMonitor({
  analyzer: {
    customAnalyzer: async (transcript, context) => {
      // Custom decision logic
      const hasUrgentKeyword = /urgent|emergency|help|problem/i.test(transcript);
      const isQuestion = transcript.includes('?');
      const isAddressed = context.name && 
        transcript.toLowerCase().includes(context.name.toLowerCase());
      
      if (hasUrgentKeyword || isAddressed) {
        return {
          shouldRespond: true,
          confidence: 0.95,
          reason: hasUrgentKeyword ? 'Urgent keyword detected' : 'Directly addressed'
        };
      }
      
      if (isQuestion && context.silenceDuration > 1000) {
        return {
          shouldRespond: true,
          confidence: 0.8,
          reason: 'Question with adequate pause'
        };
      }
      
      return {
        shouldRespond: false,
        confidence: 0.3,
        reason: 'Waiting for more input'
      };
    }
  },
  
  generator: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    systemPrompt: 'You are a helpful assistant. Respond appropriately to user needs.'
  }
});
```

### Integration with Deepgram

```typescript
import { TranscriptMonitor, BrowserStorage } from 'transcript-monitor-agent';
// Uncomment when Deepgram is installed
// import { Deepgram } from '@deepgram/sdk';

const monitor = new TranscriptMonitor({
  storage: new BrowserStorage(),
  
  analyzer: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    minWords: 3
  },
  
  generator: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    systemPrompt: 'You are a voice assistant. Be conversational and helpful.'
  }
});

monitor.on('responseGenerated', (response) => {
  // Send to text-to-speech, display in UI, etc.
  console.log('🤖 AI Response:', response);
});

await monitor.start();

// Integrate with Deepgram
/*
const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
const live = deepgram.transcription.live({
  punctuate: true,
  interim_results: true
});

live.on('transcript', (data) => {
  if (data.transcript) {
    monitor.updateTranscript(data.transcript);
  }
});
*/
```

### Web Speech API Integration

```typescript
// Browser environment
if ('webkitSpeechRecognition' in window) {
  const recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  
  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    monitor.updateTranscript(transcript);
  };
  
  recognition.start();
}
```

### Custom Storage Implementation

```typescript
import { StorageInterface } from 'transcript-monitor-agent';

class DatabaseStorage implements StorageInterface {
  async get(key: string): Promise<string> {
    // Fetch from database
    const result = await db.query('SELECT value FROM storage WHERE key = ?', [key]);
    return result[0]?.value || '';
  }
  
  async set(key: string, value: string): Promise<void> {
    // Save to database
    await db.query('INSERT OR REPLACE INTO storage (key, value) VALUES (?, ?)', [key, value]);
    
    // Notify subscribers via your preferred method (WebSockets, etc.)
    this.notifySubscribers(key, value);
  }
  
  subscribe(key: string, callback: (value: string) => void): () => void {
    // Implement subscription logic
    this.subscribers.set(key, callback);
    return () => this.subscribers.delete(key);
  }
}

const monitor = new TranscriptMonitor({
  storage: new DatabaseStorage()
});
```

## Configuration Best Practices

### Model Selection

- **GPT-4o**: Best for complex analysis and nuanced responses
- **GPT-4o-mini**: Good balance of speed and capability
- **Claude-3-Sonnet**: Excellent for conversational responses
- **Claude-3-Haiku**: Fast responses for simple interactions

### Performance Tuning

```typescript
const monitor = new TranscriptMonitor({
  // Adjust debouncing for your use case
  debounceMs: 500,          // Faster response (default: 1000)
  
  // Polling configuration
  pollingIntervalMs: 250,   // Check more frequently (default: 500)
  maxPollingIntervalMs: 2000, // Cap at 2s (default: 5000)
  
  analyzer: {
    minWords: 3,            // Lower threshold for quicker responses
    maxSilenceMs: 1000     // Shorter silence tolerance
  },
  
  generator: {
    temperature: 0.3,       // More consistent responses
    maxTokens: 100         // Shorter responses for speed
  }
});
```

## Error Handling

The library includes built-in retry mechanisms and graceful error handling:

```typescript
monitor.on('error', (error) => {
  if (error.message.includes('API')) {
    console.error('API Error - check your credentials');
  } else if (error.message.includes('rate limit')) {
    console.error('Rate limited - implementing backoff');
  } else {
    console.error('Unexpected error:', error);
  }
});
```

## Migration Guide

### From v1.0.x to v1.1.x

- ✅ No breaking changes
- ✨ New optional parameters: `name`, `role`, `contextFile`
- 🔄 Enhanced `AnalysisContext` interface
- 📚 Improved TypeScript definitions

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](https://github.com/yourusername/transcript-monitor-agent#readme)
- 🐛 [Issues](https://github.com/yourusername/transcript-monitor-agent/issues)
- 💬 [Discussions](https://github.com/yourusername/transcript-monitor-agent/discussions)
