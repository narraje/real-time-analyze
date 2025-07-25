# transcript-monitor-agent

"Transcript-monitor-agent" is a powerful tool that enables real-time transcript monitoring and leverages AI for intelligent response generation. It's designed to enhance your interaction processes, providing a seamless and smart communication experience.
## Recent Updates

- Comprehensive class documentation has been added to `TranscriptMonitor` for better understanding of the class's functionality and usage.
- The `TranscriptMonitor` class now features enhanced code readability, making it easier for developers to understand and modify.
- The recent updates have significantly improved the maintainability of the code, making future changes and enhancements more efficient.


## What it does

1. **Monitors** text/transcript input from any source
2. **Analyzes** whether a response is needed (is the user done speaking?)
3. **Generates** intelligent responses using OpenAI or Anthropic

That's it. Simple and focused.

## Installation

```bash
npm install transcript-monitor-agent
```

## Quick Start

```javascript
import { TranscriptMonitor, SimpleStorage } from '../src/index';

// Basic setup with OpenAI
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
    systemPrompt: 'You are a helpful assistant. Be concise.',
    temperature: 0.7
  },
  
  debounceMs: 1000 // Wait 1 second before processing
});

// Listen for events
monitor.on('transcriptChanged', (transcript) => {
  console.log('📝 Transcript:', transcript);
});

monitor.on('analysisComplete', (result) => {
  console.log('🔍 Analysis:', result);
});

monitor.on('responseGenerated', (response) => {
  console.log('🤖 Response:', response);
});

monitor.on('error', (error) => {
  console.error('❌ Error:', error);
});

// Start monitoring
monitor.start();

// Simulate transcript updates from any source
setTimeout(() => {
  monitor.updateTranscript('Hello, how are you?');
}, 1000);

setTimeout(() => {
  monitor.updateTranscript('What can you help me with?');
}, 3000);
```

## Core Concepts

### TranscriptMonitor

The main class that orchestrates everything:

- Receives transcript updates
- Decides when to respond (with debouncing)
- Generates responses
- Emits events

### TranscriptAnalyzer

Decides **when** to respond:

- Too short? Don't respond yet
- User still speaking? Wait
- Complete thought? Generate response

### ResponseGenerator

Generates **what** to respond:

- Uses OpenAI or Anthropic
- Maintains conversation history
- Configurable prompts and parameters

## Usage Examples

### With Deepgram

```javascript
import { TranscriptMonitor, BrowserStorage } from '../src/index';
// import { Deepgram } from '@deepgram/sdk';

const monitor = new TranscriptMonitor({
  storage: new BrowserStorage(), // Uses localStorage
  
  analyzer: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    minWords: 3
  },
  
  generator: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7
  }
});

// Listen for responses
monitor.on('responseGenerated', (response) => {
  console.log('🤖 AI Response:', response);
  // Send to TTS, display in UI, etc.
});

// Start monitoring
monitor.start();

// Connect to Deepgram (uncomment when you have Deepgram installed)
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

### With Web Speech API

```javascript
const recognition = new webkitSpeechRecognition();

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  monitor.updateTranscript(transcript);
};
```

### Custom Analysis Logic

```javascript
import { TranscriptMonitor } from '../src/index';

// Custom analysis logic
const monitor = new TranscriptMonitor({
  analyzer: {
    customAnalyzer: async (transcript, context) => {
      // Your custom logic here
      const hasQuestion = transcript.includes('?');
      const isLongEnough = transcript.split(' ').length > 5;
      const hasBeenSilent = context.silenceDuration > 2000;
      
      // Custom decision logic
      if (hasQuestion) {
        return {
          shouldRespond: true,
          confidence: 0.95,
          reason: 'Direct question'
        };
      }
      
      if (isLongEnough && hasBeenSilent) {
        return {
          shouldRespond: true,
          confidence: 0.7,
          reason: 'Complete thought'
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
    systemPrompt: 'Be helpful and concise.'
  }
});
```

## Events

- `transcriptChanged` - New transcript received
- `analysisComplete` - Analysis finished (should we respond?)
- `responseGenerated` - Response ready
- `error` - Something went wrong

## API

### TranscriptMonitor

```typescript
new TranscriptMonitor({
  storage: StorageInterface, // Optional custom storage
  analyzer: {
    provider: "openai" | "anthropic" | "custom",
    apiKey: string,
    model: string,
    minWords: number, // Minimum words before considering response
    maxSilenceMs: number, // Max silence duration to wait
    customAnalyzer: Function, // Your own analysis logic
    name: string, // Optional name for identifying when addressed directly
    role: string, // Optional role to influence analysis behavior
    contextFile: string, // Optional path to context file
  },
  generator: {
    provider: "openai" | "anthropic" | "custom",
    apiKey: string,
    model: string,
    systemPrompt: string,
    temperature: number,
    maxTokens: number,
    customGenerator: Function, // Your own generation logic
    name: string, // Optional name from analyzer settings
    role: string, // Optional role from analyzer settings
    contextFile: string, // Optional context file from analyzer settings
  },
  debounceMs: number, // Debounce delay (default: 1000ms)
});
```

### Methods

- `start()` - Start monitoring
- `stop()` - Stop monitoring
- `updateTranscript(text)` - Send new transcript
- `getHistory()` - Get conversation history
- `clearHistory()` - Clear conversation history

## Storage

By default, uses in-memory storage. You can also use:

```javascript
import { BrowserStorage } from "transcript-monitor-agent";

// Uses localStorage/sessionStorage
const monitor = new TranscriptMonitor({
  storage: new BrowserStorage(localStorage),
});
```

Or implement your own:

```typescript
interface StorageInterface {
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  subscribe?(key: string, callback: Function): Function;
}
```

## Why This Package?

- **Simple**: Just monitors transcripts and generates responses
- **Flexible**: Works with any transcript source
- **Focused**: Does one thing well
- **Configurable**: Use your own analysis/generation logic

## License

MIT
