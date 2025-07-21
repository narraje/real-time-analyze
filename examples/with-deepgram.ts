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
