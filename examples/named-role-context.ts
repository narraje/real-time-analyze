import { TranscriptMonitor, SimpleStorage } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Example context file content - in a real scenario, this would be a separate file
const contextFilePath = path.join(__dirname, 'context.json');
if (!fs.existsSync(contextFilePath)) {
  fs.writeFileSync(contextFilePath, JSON.stringify({
    topicArea: 'computer science',
    speakerDetails: {
      expertise: 'beginner',
      preferences: 'wants simple explanations with examples'
    },
    relevantTerms: ['algorithm', 'data structure', 'variable', 'function']
  }, null, 2));
  console.log(`Created context file at ${contextFilePath}`);
}

// Set up monitor with name, role and context file
const monitor = new TranscriptMonitor({
  storage: new SimpleStorage(),
  
  // Set name - enables recognizing when the monitor is being addressed directly
  name: 'Assistant',
  
  // Set role - influences analysis and response style
  role: 'patient computer science tutor for beginners',
  
  // Set context file - provides background information
  contextFile: contextFilePath,
  
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
    systemPrompt: 'You are a patient computer science tutor. Explain concepts clearly with simple examples.',
    temperature: 0.7
  }
});

// Listen for events
monitor.on('transcriptChanged', (transcript) => {
  console.log('📝 Transcript:', transcript);
});

monitor.on('analysisComplete', (result) => {
  console.log('🔍 Analysis:', result);
  
  // Log if name recognition influenced the decision
  if (result.reason.includes('name')) {
    console.log('✓ Name recognition was a factor');
  }
});

monitor.on('responseGenerated', (response) => {
  console.log('🤖 Response:', response);
});

monitor.on('error', (error) => {
  console.error('❌ Error:', error);
});

// Define our parameters for easy reference
const monitorName = 'Assistant';
const monitorRole = 'patient computer science tutor for beginners';

// Start monitoring
console.log('Starting monitor with:');
console.log(`- Name: ${monitorName}`);
console.log(`- Role: ${monitorRole}`);
console.log(`- Context File: ${contextFilePath}`);
monitor.start();

// Simulate transcript updates that test the parameters
console.log('\n--- Testing without name mention ---');
setTimeout(() => {
  monitor.updateTranscript('Can you explain what an algorithm is?');
}, 1000);

// Test name recognition
console.log('\n--- Testing with name mention ---');
setTimeout(() => {
  monitor.updateTranscript('Hey Assistant, how do variables work?');
}, 5000);

// Test role-specific query
console.log('\n--- Testing role-specific query ---');
setTimeout(() => {
  monitor.updateTranscript('I\'m really struggling with loops, can you explain them very simply?');
}, 9000);

// Test context-aware response
console.log('\n--- Testing context-aware query ---');
setTimeout(() => {
  monitor.updateTranscript('Which data structures should I learn first as a beginner?');
}, 13000);
