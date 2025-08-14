import { TranscriptMonitor, AnalysisContext, AnalysisResult, SimpleStorage } from '../src/index';

/**
 * Custom Analyzer Example
 * 
 * This example demonstrates how to implement sophisticated custom analysis logic
 * for determining when responses are needed. It includes:
 * - Multi-factor decision making
 * - Context-aware analysis
 * - Business rule implementation
 * - Advanced pattern matching
 */

console.log('🚀 Starting Custom Analyzer Example\n');

/**
 * Advanced Custom Analyzer Implementation
 * 
 * This analyzer considers multiple factors to make intelligent decisions:
 * - Content analysis (questions, commands, sentiments)
 * - Timing factors (silence duration, conversation flow)
 * - Context awareness (previous interactions, user patterns)
 * - Business rules (priority keywords, escalation triggers)
 */
const advancedAnalyzer = async (transcript: string, context: AnalysisContext): Promise<AnalysisResult> => {
  const transcriptLower = transcript.toLowerCase().trim();
  let confidence = 0.0;
  let shouldRespond = false;
  let reasonParts: string[] = [];

  console.log(`\n🔍 Analyzing: "${transcript}"`);
  console.log(`📊 Context: ${context.silenceDuration}ms silence, ${context.conversationHistory.length} previous messages`);

  // 1. IMMEDIATE RESPONSE TRIGGERS (High Priority)
  
  // Direct questions - highest priority
  const questionMarkers = ['?', 'what', 'how', 'when', 'where', 'why', 'who', 'can you', 'could you', 'would you'];
  const hasQuestion = questionMarkers.some(marker => transcriptLower.includes(marker));
  if (hasQuestion) {
    confidence += 0.4;
    shouldRespond = true;
    reasonParts.push('question detected');
    console.log('  ✅ Question detected (+40% confidence)');
  }

  // Urgent/emergency keywords
  const urgentKeywords = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'broken', 'down', 'not working'];
  const hasUrgentKeyword = urgentKeywords.some(keyword => transcriptLower.includes(keyword));
  if (hasUrgentKeyword) {
    confidence += 0.35;
    shouldRespond = true;
    reasonParts.push('urgent keyword detected');
    console.log('  🚨 Urgent keyword detected (+35% confidence)');
  }

  // Direct addressing by name
  if (context.name && transcriptLower.includes(context.name.toLowerCase())) {
    confidence += 0.3;
    shouldRespond = true;
    reasonParts.push(`directly addressed as ${context.name}`);
    console.log(`  👋 Directly addressed as ${context.name} (+30% confidence)`);
  }

  // Greetings and politeness markers
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
  const hasGreeting = greetings.some(greeting => transcriptLower.startsWith(greeting));
  if (hasGreeting) {
    confidence += 0.25;
    shouldRespond = true;
    reasonParts.push('greeting detected');
    console.log('  👋 Greeting detected (+25% confidence)');
  }

  // 2. CONTENT ANALYSIS

  // Commands and requests
  const commandWords = ['please', 'can you', 'could you', 'help me', 'show me', 'tell me', 'explain'];
  const hasCommand = commandWords.some(command => transcriptLower.includes(command));
  if (hasCommand) {
    confidence += 0.2;
    shouldRespond = true;
    reasonParts.push('request/command detected');
    console.log('  📝 Command/request detected (+20% confidence)');
  }

  // Negative sentiment (needs support)
  const negativeWords = ['problem', 'issue', 'error', 'trouble', 'difficulty', 'confused', 'stuck', 'frustrated'];
  const hasNegativeSentiment = negativeWords.some(word => transcriptLower.includes(word));
  if (hasNegativeSentiment) {
    confidence += 0.15;
    shouldRespond = true;
    reasonParts.push('negative sentiment - user needs help');
    console.log('  😟 Negative sentiment detected (+15% confidence)');
  }

  // 3. CONTEXT AND TIMING ANALYSIS

  // Word count consideration
  const wordCount = transcript.split(/\s+/).filter(word => word.length > 0).length;
  console.log(`  📏 Word count: ${wordCount}`);
  
  if (wordCount < 2) {
    confidence *= 0.5; // Reduce confidence for very short messages
    reasonParts.push('very short message');
    console.log('  ⚠️ Very short message (-50% confidence multiplier)');
  } else if (wordCount >= 10) {
    confidence += 0.1; // Boost for longer, more complete thoughts
    reasonParts.push('substantial message');
    console.log('  📝 Substantial message (+10% confidence)');
  }

  // Silence duration analysis
  console.log(`  ⏱️ Silence duration: ${context.silenceDuration}ms`);
  
  if (context.silenceDuration > 3000) {
    confidence += 0.1;
    reasonParts.push('long pause indicates completion');
    console.log('  ⏳ Long pause detected (+10% confidence)');
  } else if (context.silenceDuration < 500 && wordCount > 3) {
    confidence *= 0.7; // User might still be speaking
    reasonParts.push('short pause - user may still be speaking');
    console.log('  ⚡ Short pause - might still be speaking (-30% confidence multiplier)');
  }

  // Conversation flow analysis
  if (context.conversationHistory.length > 0) {
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];
    const timeSinceLastMessage = Date.now() - lastMessage.timestamp;
    
    if (lastMessage.role === 'assistant' && timeSinceLastMessage < 30000) {
      // Recent assistant response - user might be responding
      confidence += 0.1;
      reasonParts.push('active conversation flow');
      console.log('  💬 Active conversation flow (+10% confidence)');
    }
  }

  // 4. ROLE-BASED ADJUSTMENTS

  if (context.role) {
    console.log(`  🎭 Role context: ${context.role}`);
    
    // Adjust based on role
    if (context.role.toLowerCase().includes('teacher') || context.role.toLowerCase().includes('tutor')) {
      // Educational context - be more responsive to learning indicators
      const learningWords = ['explain', 'understand', 'learn', 'teach', 'show', 'how does'];
      const hasLearningIntent = learningWords.some(word => transcriptLower.includes(word));
      if (hasLearningIntent) {
        confidence += 0.15;
        reasonParts.push('educational context - learning intent detected');
        console.log('  🎓 Educational learning intent (+15% confidence)');
      }
    } else if (context.role.toLowerCase().includes('support') || context.role.toLowerCase().includes('service')) {
      // Support context - be more responsive to problem indicators
      const supportWords = ['help', 'support', 'issue', 'problem', 'not working', 'error'];
      const hasSupportNeed = supportWords.some(word => transcriptLower.includes(word));
      if (hasSupportNeed) {
        confidence += 0.15;
        reasonParts.push('support context - assistance needed');
        console.log('  🛠️ Support context - assistance needed (+15% confidence)');
      }
    }
  }

  // 5. FINAL DECISION LOGIC

  // Clamp confidence to valid range
  confidence = Math.max(0.1, Math.min(0.95, confidence));

  // Decision threshold
  const RESPONSE_THRESHOLD = 0.6;
  
  if (!shouldRespond && confidence >= RESPONSE_THRESHOLD) {
    shouldRespond = true;
    reasonParts.push('confidence threshold exceeded');
  }

  // Override for very low confidence
  if (confidence < 0.3) {
    shouldRespond = false;
    reasonParts.push('confidence too low');
  }

  const finalReason = reasonParts.join(', ');
  
  console.log(`  🎯 Final decision: ${shouldRespond ? 'RESPOND' : 'WAIT'} (${(confidence * 100).toFixed(1)}%)`);
  console.log(`  📋 Reasoning: ${finalReason}\n`);

  return {
    shouldRespond,
    confidence,
    reason: finalReason
  };
};

// Set up monitor with custom analyzer
const monitor = new TranscriptMonitor({
  storage: new SimpleStorage(),
  
  // Test with a specific role
  name: 'Assistant',
  role: 'helpful AI tutor specializing in computer science',
  
  analyzer: {
    customAnalyzer: advancedAnalyzer
  },
  
  generator: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    systemPrompt: 'You are a helpful AI tutor. Provide clear, educational responses.',
    temperature: 0.7,
    maxTokens: 200
  },
  
  debounceMs: 1500 // Slightly longer to let analysis complete
});

// Enhanced event handlers
monitor.on('transcriptChanged', (transcript: string) => {
  console.log(`📝 New transcript received: "${transcript}"`);
});

monitor.on('analysisComplete', (result: AnalysisResult) => {
  console.log(`🎯 Analysis Result: ${result.shouldRespond ? '✅ RESPOND' : '⏳ WAIT'}`);
  console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  console.log(`📝 Final Reasoning: ${result.reason}\n`);
});

monitor.on('responseGenerated', (response: string) => {
  console.log(`🤖 Generated Response: "${response}"\n`);
});

monitor.on('error', (error: Error) => {
  console.error(`❌ Error: ${error.message}`);
  
  if (error.message.includes('API key')) {
    console.error('💡 Make sure to set ANTHROPIC_API_KEY environment variable');
  }
});

// Check environment
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY environment variable is required');
  console.log('💡 Set it with: export ANTHROPIC_API_KEY="your-api-key-here"');
  process.exit(1);
}

// Demo scenarios to test the custom analyzer
async function runCustomAnalyzerDemo() {
  try {
    await monitor.start();
    
    console.log('🎭 Testing various scenarios with custom analyzer...\n');
    
    const testScenarios = [
      { delay: 1000, text: 'Hi', description: 'Short greeting' },
      { delay: 3000, text: 'Assistant, can you help me?', description: 'Direct addressing with question' },
      { delay: 6000, text: 'I am having trouble understanding', description: 'Partial statement (should wait)' },
      { delay: 8000, text: 'I am having trouble understanding algorithms', description: 'Complete problem statement' },
      { delay: 11000, text: 'This is urgent - my code is broken!', description: 'Urgent keyword with problem' },
      { delay: 14000, text: 'Could you explain how sorting works?', description: 'Educational question' },
      { delay: 17000, text: 'Thanks for explaining that clearly', description: 'Appreciation (should have lower confidence)' },
      { delay: 20000, text: 'What about quicksort specifically?', description: 'Follow-up question' }
    ];
    
    // Process each scenario
    for (const scenario of testScenarios) {
      setTimeout(() => {
        console.log(`\n--- Testing: ${scenario.description} ---`);
        monitor.updateTranscript(scenario.text);
      }, scenario.delay);
    }
    
    // Summary
    setTimeout(() => {
      console.log('\n📊 Demo Summary:');
      const history = monitor.getHistory();
      console.log(`Total responses generated: ${history.filter(m => m.role === 'assistant').length}`);
      console.log(`Total user messages: ${history.filter(m => m.role === 'user').length}`);
      
      console.log('\n🛑 Stopping monitor...');
      monitor.stop();
      console.log('✅ Custom analyzer demo completed!');
    }, 24000);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
runCustomAnalyzerDemo();