import { TranscriptMonitor, SimpleStorage } from '../src/index';

/**
 * Basic Example: Getting Started with TranscriptMonitor
 * 
 * This example demonstrates the fundamental usage of TranscriptMonitor with OpenAI.
 * It shows how to set up monitoring, handle events, and process transcript updates.
 */

console.log('🚀 Starting Basic TranscriptMonitor Example\n');

// Basic setup with OpenAI
const monitor = new TranscriptMonitor({
  storage: new SimpleStorage(),
  
  analyzer: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    minWords: 5,              // Minimum words before considering response
    maxSilenceMs: 1500        // Wait 1.5 seconds of silence before responding
  },
  
  generator: {
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant. Be concise and friendly.',
    temperature: 0.7,         // Balanced creativity
    maxTokens: 150           // Keep responses short
  },
  
  debounceMs: 1000 // Wait 1 second before processing new transcript
});

// Event handlers with detailed logging
monitor.on('transcriptChanged', (transcript: string) => {
  console.log('📝 Transcript Updated:', transcript);
  console.log(`   Length: ${transcript.length} characters, ${transcript.split(' ').length} words\n`);
});

monitor.on('analysisComplete', (result) => {
  console.log('🔍 Analysis Complete:');
  console.log(`   Should Respond: ${result.shouldRespond ? '✅ Yes' : '❌ No'}`);
  console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`   Reason: ${result.reason}\n`);
});

monitor.on('responseGenerated', (response: string) => {
  console.log('🤖 AI Response Generated:');
  console.log(`   "${response}"\n`);
});

monitor.on('error', (error: Error) => {
  console.error('❌ Error occurred:');
  console.error(`   ${error.message}\n`);
  
  // Basic error handling
  if (error.message.includes('API key')) {
    console.error('💡 Tip: Make sure your OPENAI_API_KEY environment variable is set');
  } else if (error.message.includes('rate limit')) {
    console.error('💡 Tip: You may be hitting API rate limits. Consider adding delays between requests');
  }
});

monitor.on('started', () => {
  console.log('✅ Monitoring started successfully!\n');
});

// Check for API key before starting
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY environment variable is required');
  console.log('💡 Set it with: export OPENAI_API_KEY="your-api-key-here"');
  process.exit(1);
}

// Start monitoring
async function runExample() {
  try {
    await monitor.start();
    
    // Simulate various transcript scenarios
    console.log('🎭 Simulating different transcript scenarios...\n');
    
    // Scenario 1: Short greeting
    console.log('--- Scenario 1: Short greeting ---');
    setTimeout(() => {
      monitor.updateTranscript('Hello!');
    }, 1000);
    
    // Scenario 2: Question
    console.log('--- Scenario 2: Direct question ---');
    setTimeout(() => {
      monitor.updateTranscript('What time is it?');
    }, 4000);
    
    // Scenario 3: Longer statement
    console.log('--- Scenario 3: Longer conversational statement ---');
    setTimeout(() => {
      monitor.updateTranscript('I was wondering if you could help me understand how machine learning works in simple terms.');
    }, 8000);
    
    // Scenario 4: Follow-up
    console.log('--- Scenario 4: Follow-up question ---');
    setTimeout(() => {
      monitor.updateTranscript('Could you give me a specific example?');
    }, 12000);
    
    // Show conversation history after all interactions
    setTimeout(() => {
      console.log('\n📚 Final Conversation History:');
      const history = monitor.getHistory();
      if (history.length === 0) {
        console.log('   No conversation history (no responses were generated)');
      } else {
        history.forEach((msg, index) => {
          const timestamp = new Date(msg.timestamp).toLocaleTimeString();
          console.log(`   ${index + 1}. [${timestamp}] ${msg.role.toUpperCase()}: ${msg.content}`);
        });
      }
      
      // Clean shutdown
      console.log('\n🛑 Stopping monitor...');
      monitor.stop();
      console.log('✅ Example completed successfully!');
    }, 16000);
    
  } catch (error) {
    console.error('❌ Failed to start monitoring:', error);
    process.exit(1);
  }
}

// Run the example
runExample();