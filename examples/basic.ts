import { TranscriptMonitor, SimpleStorage } from 'transcript-monitor-agent';

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

// examples/with-deepgram.ts
import { TranscriptMonitor, BrowserStorage } from 'transcript-monitor-agent';
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
    apiKey: process.env.OPENAI_API_KEY
  }
});

monitor.start();

// Connect to Deepgram
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