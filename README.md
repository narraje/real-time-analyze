# Transcript Monitor Agent

A simple npm package that monitors transcripts from any source and intelligently generates responses using AI.

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
import { TranscriptMonitor } from "transcript-monitor-agent";

const monitor = new TranscriptMonitor({
  analyzer: {
    provider: "openai",
    apiKey: "your-openai-key",
    minWords: 5, // Don't respond to very short inputs
    maxSilenceMs: 1500, // Wait 1.5s of "silence" before responding
  },
  generator: {
    provider: "openai",
    apiKey: "your-openai-key",
    model: "gpt-4o",
    systemPrompt: "You are a helpful assistant.",
  },
});

// Listen for responses
monitor.on("responseGenerated", (response) => {
  console.log("AI says:", response);
  // Send to TTS, display in UI, etc.
});

// Start monitoring
monitor.start();

// Send transcripts from ANY source
monitor.updateTranscript("Hello, how are you?");
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
import { TranscriptMonitor } from "transcript-monitor-agent";

const monitor = new TranscriptMonitor({
  analyzer: {
    provider: "openai",
    apiKey: "key",
    minWords: 3,
  },
  generator: {
    provider: "openai",
    apiKey: "key",
  },
});

// Deepgram streaming
deepgram.on("transcript", (data) => {
  monitor.updateTranscript(data.transcript);
});
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
const monitor = new TranscriptMonitor({
  analyzer: {
    customAnalyzer: async (transcript, context) => {
      // Your logic here
      if (transcript.includes("?")) {
        return {
          shouldRespond: true,
          confidence: 0.95,
          reason: "Question detected",
        };
      }

      return {
        shouldRespond: false,
        confidence: 0.3,
        reason: "Not ready",
      };
    },
  },
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
  },
  generator: {
    provider: "openai" | "anthropic" | "custom",
    apiKey: string,
    model: string,
    systemPrompt: string,
    temperature: number,
    maxTokens: number,
    customGenerator: Function, // Your own generation logic
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
