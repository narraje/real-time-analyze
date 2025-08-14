import { TranscriptMonitor, SimpleStorage, AnalysisContext, AnalysisResult } from '../src/index';

/**
 * Voice Assistant Example
 * 
 * This example demonstrates building a voice-enabled assistant that can:
 * - Listen to speech input via Web Speech API (browser) or simulate it
 * - Process voice commands with intelligent timing
 * - Generate spoken responses with text-to-speech
 * - Handle interruptions and conversation flow
 * - Manage voice-specific features like wake words
 */

interface VoiceAssistantConfig {
  wakeWord?: string;
  voiceEnabled: boolean;
  language: string;
  responseVoice?: string;
  interruptionDetection: boolean;
}

class VoiceAssistant {
  private monitor: TranscriptMonitor;
  private config: VoiceAssistantConfig;
  private isListening = false;
  private isSpeaking = false;
  private recognition: any; // SpeechRecognition interface
  private synthesis: any;   // SpeechSynthesis interface
  private lastSpeechTime = 0;
  private conversationActive = false;

  constructor(config: Partial<VoiceAssistantConfig> = {}) {
    this.config = {
      wakeWord: 'assistant',
      voiceEnabled: true,
      language: 'en-US',
      responseVoice: 'female',
      interruptionDetection: true,
      ...config
    };

    this.initializeVoiceMonitor();
    this.initializeSpeechAPIs();
  }

  private initializeVoiceMonitor() {
    this.monitor = new TranscriptMonitor({
      storage: new SimpleStorage(),
      
      // Voice assistant identity
      name: this.config.wakeWord,
      role: 'friendly voice assistant for smart home and general queries',
      
      // Optimized for voice interaction
      debounceMs: 600,  // Quick response for voice
      pollingIntervalMs: 200,
      maxPollingIntervalMs: 1000,
      
      analyzer: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        minWords: 1,           // Respond to single words for voice commands
        maxSilenceMs: 800,     // Shorter silence for voice
        customAnalyzer: this.voiceAnalyzer.bind(this)
      },
      
      generator: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
        systemPrompt: this.buildVoiceSystemPrompt(),
        temperature: 0.4,      // Consistent voice responses
        maxTokens: 100         // Keep spoken responses concise
      }
    });

    this.setupVoiceEventHandlers();
  }

  private buildVoiceSystemPrompt(): string {
    return `You are a friendly voice assistant named "${this.config.wakeWord}". 

Voice interaction guidelines:
1. Keep responses under 30 words when possible
2. Be conversational and natural sounding
3. Use simple, clear language suitable for speech
4. Acknowledge commands with confirmation before actions
5. Ask clarifying questions if needed
6. Be helpful for smart home, weather, time, calculations, and general questions

Examples of good voice responses:
- "Sure, I'll set a timer for 5 minutes"
- "The weather today is sunny with a high of 75 degrees"
- "Sorry, I didn't catch that. Could you repeat?"
- "I can help with that. What would you like to know?"

Avoid:
- Long, complex explanations
- Technical jargon
- Bullet points or numbered lists
- Requesting the user to "type" or "click" anything`;
  }

  private async voiceAnalyzer(transcript: string, context: AnalysisContext): Promise<AnalysisResult> {
    const transcriptLower = transcript.toLowerCase().trim();
    let confidence = 0.0;
    let shouldRespond = false;
    let reasonParts: string[] = [];

    console.log(`\n🎤 Voice Analysis: "${transcript}"`);
    console.log(`🔊 Speaking: ${this.isSpeaking}, Listening: ${this.isListening}, Active: ${this.conversationActive}`);

    // 1. WAKE WORD DETECTION
    const wakeWordMentioned = this.config.wakeWord && 
      transcriptLower.includes(this.config.wakeWord.toLowerCase());
    
    if (wakeWordMentioned) {
      confidence += 0.4;
      shouldRespond = true;
      this.conversationActive = true;
      reasonParts.push(`wake word "${this.config.wakeWord}" detected`);
      console.log(`  🎯 Wake word "${this.config.wakeWord}" detected (+40% confidence)`);
    }

    // 2. VOICE COMMANDS
    const voiceCommands = [
      'set timer', 'what time', 'weather', 'play music', 'stop', 'pause',
      'volume up', 'volume down', 'lights on', 'lights off', 'temperature',
      'remind me', 'call', 'text', 'search for', 'calculate', 'convert'
    ];
    
    const hasVoiceCommand = voiceCommands.some(command => 
      transcriptLower.includes(command.toLowerCase())
    );
    
    if (hasVoiceCommand) {
      confidence += 0.35;
      shouldRespond = true;
      reasonParts.push('voice command detected');
      console.log('  🎛️ Voice command detected (+35% confidence)');
    }

    // 3. INTERRUPTION DETECTION
    if (this.config.interruptionDetection && this.isSpeaking) {
      const interruptionWords = ['stop', 'wait', 'pause', 'hold on', 'excuse me'];
      const isInterruption = interruptionWords.some(word => 
        transcriptLower.includes(word)
      );
      
      if (isInterruption) {
        confidence = 0.95;
        shouldRespond = true;
        reasonParts = ['interruption detected - stopping current speech'];
        console.log('  ✋ Interruption detected - will stop speaking');
        this.stopSpeaking();
      } else {
        // User is speaking while assistant is speaking - lower confidence
        confidence *= 0.3;
        reasonParts.push('user speaking while assistant is speaking');
        console.log('  🤐 User speaking while assistant is speaking (-70% confidence)');
      }
    }

    // 4. CONVERSATION FLOW
    if (this.conversationActive) {
      // In active conversation - be more responsive
      confidence += 0.2;
      reasonParts.push('active voice conversation');
      console.log('  💬 Active voice conversation (+20% confidence)');
      
      // Auto-timeout conversation after silence
      if (context.silenceDuration > 10000) {
        this.conversationActive = false;
        console.log('  ⏰ Conversation timed out due to silence');
      }
    }

    // 5. QUESTIONS AND NATURAL SPEECH
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'who', 'can you', 'will you'];
    const hasQuestion = questionWords.some(word => transcriptLower.includes(word)) || 
                       transcript.includes('?');
    
    if (hasQuestion) {
      confidence += 0.3;
      shouldRespond = true;
      reasonParts.push('question detected');
      console.log('  ❓ Question detected (+30% confidence)');
    }

    // 6. POLITENESS AND GREETINGS
    const politeWords = ['please', 'thank you', 'thanks', 'hello', 'hi', 'good morning'];
    const isPolite = politeWords.some(word => transcriptLower.includes(word));
    
    if (isPolite) {
      confidence += 0.15;
      shouldRespond = true;
      reasonParts.push('polite interaction');
      console.log('  🙏 Polite interaction detected (+15% confidence)');
    }

    // 7. VOICE-SPECIFIC TIMING
    const wordCount = transcript.split(/\s+/).length;
    const speechRate = wordCount / Math.max(1, context.silenceDuration / 1000);
    
    if (speechRate > 5) {
      // Very fast speech - might be incomplete
      confidence *= 0.6;
      reasonParts.push('fast speech - may be incomplete');
      console.log('  🏃 Fast speech detected - may be incomplete (-40% confidence)');
    }

    // 8. SILENCE ANALYSIS FOR VOICE
    if (context.silenceDuration > 2000 && wordCount > 2) {
      confidence += 0.1;
      reasonParts.push('adequate pause after speech');
      console.log('  ⏸️ Adequate pause after speech (+10% confidence)');
    }

    // Final adjustments
    confidence = Math.max(0.1, Math.min(0.95, confidence));
    
    // Threshold for voice interaction
    const VOICE_THRESHOLD = 0.5;
    if (!shouldRespond && confidence >= VOICE_THRESHOLD) {
      shouldRespond = true;
      reasonParts.push('voice confidence threshold exceeded');
    }

    const finalReason = reasonParts.join(', ');
    
    console.log(`  🎯 Voice Decision: ${shouldRespond ? 'RESPOND' : 'WAIT'} (${(confidence * 100).toFixed(1)}%)`);
    console.log(`  📝 Reasoning: ${finalReason}\n`);

    return {
      shouldRespond,
      confidence,
      reason: finalReason
    };
  }

  private initializeSpeechAPIs() {
    // In a real browser environment, this would initialize Web Speech API
    // For this demo, we'll simulate the APIs
    
    console.log('🎤 Initializing speech recognition...');
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      // Real browser environment
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.config.language;
      
      this.recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (event.results[event.results.length - 1].isFinal) {
          this.processVoiceInput(transcript);
        }
      };
      
      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
      };
    } else {
      // Simulated environment
      console.log('📱 Using simulated speech recognition for demo');
    }

    // Text-to-speech initialization
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.log('🔊 Using simulated text-to-speech for demo');
    }
  }

  private setupVoiceEventHandlers() {
    this.monitor.on('transcriptChanged', (transcript: string) => {
      console.log(`🎤 Voice Input: "${transcript}"`);
      this.lastSpeechTime = Date.now();
    });

    this.monitor.on('analysisComplete', (result: AnalysisResult) => {
      console.log(`🎯 Voice Analysis: ${result.shouldRespond ? '🔊 SPEAK' : '🤐 SILENT'} (${(result.confidence * 100).toFixed(1)}%)`);
    });

    this.monitor.on('responseGenerated', (response: string) => {
      console.log(`🤖 Voice Response: "${response}"`);
      this.speak(response);
    });

    this.monitor.on('error', (error: Error) => {
      console.error(`❌ Voice Assistant Error: ${error.message}`);
      this.speak("Sorry, I encountered an error. Please try again.");
    });
  }

  private async processVoiceInput(transcript: string) {
    if (this.isSpeaking && this.config.interruptionDetection) {
      // Check if this is an interruption
      const isInterruption = ['stop', 'wait', 'pause'].some(word => 
        transcript.toLowerCase().includes(word)
      );
      
      if (isInterruption) {
        this.stopSpeaking();
        return;
      }
    }

    await this.monitor.updateTranscript(transcript);
  }

  private speak(text: string) {
    if (!this.config.voiceEnabled) {
      console.log(`🔇 Voice disabled - would speak: "${text}"`);
      return;
    }

    this.isSpeaking = true;
    console.log(`🔊 Speaking: "${text}"`);

    if (this.synthesis) {
      // Real speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.config.language;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      
      utterance.onend = () => {
        this.isSpeaking = false;
        console.log('🔇 Finished speaking');
      };
      
      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('Speech synthesis error:', event.error);
      };
      
      this.synthesis.speak(utterance);
    } else {
      // Simulated speech
      setTimeout(() => {
        this.isSpeaking = false;
        console.log('🔇 Finished speaking (simulated)');
      }, text.length * 50); // Simulate speech duration
    }
  }

  private stopSpeaking() {
    if (this.synthesis && this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    console.log('⏹️ Stopped speaking');
  }

  async startListening() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    await this.monitor.start();
    
    if (this.recognition) {
      this.recognition.start();
      this.isListening = true;
      console.log('🎤 Voice assistant is listening...');
    } else {
      console.log('🎤 Voice assistant ready (simulation mode)');
    }

    // Speak greeting
    this.speak(`Hello! I'm ${this.config.wakeWord}, your voice assistant. How can I help you?`);
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
    
    this.stopSpeaking();
    this.monitor.stop();
    console.log('🔇 Voice assistant stopped');
  }

  // Simulate voice input for demo
  simulateVoiceInput(text: string) {
    console.log(`\n🎭 Simulating voice input: "${text}"`);
    this.processVoiceInput(text);
  }

  getConversationHistory() {
    return this.monitor.getHistory();
  }
}

// Demo function
async function runVoiceAssistantDemo() {
  console.log('🚀 Starting Voice Assistant Demo\n');

  try {
    const assistant = new VoiceAssistant({
      wakeWord: 'jarvis',
      voiceEnabled: true,
      language: 'en-US',
      interruptionDetection: true
    });

    await assistant.startListening();

    // Simulate voice interactions
    const voiceScenarios = [
      { delay: 2000, text: 'Jarvis, what time is it?', description: 'Wake word + time query' },
      { delay: 5000, text: 'Set a timer for 5 minutes', description: 'Voice command' },
      { delay: 8000, text: 'What is the weather like today?', description: 'Weather query' },
      { delay: 11000, text: 'Stop', description: 'Interruption command' },
      { delay: 13000, text: 'Play some music', description: 'Entertainment command' },
      { delay: 16000, text: 'Turn off the lights', description: 'Smart home command' },
      { delay: 19000, text: 'Thank you, Jarvis', description: 'Polite conclusion' }
    ];

    console.log('🎭 Simulating voice conversation...\n');

    // Process each voice scenario
    for (const scenario of voiceScenarios) {
      setTimeout(() => {
        console.log(`--- ${scenario.description} ---`);
        assistant.simulateVoiceInput(scenario.text);
      }, scenario.delay);
    }

    // Cleanup
    setTimeout(() => {
      console.log('\n📊 Voice Conversation Summary:');
      const history = assistant.getConversationHistory();
      
      if (history.length > 0) {
        history.forEach((msg, index) => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          const role = msg.role === 'user' ? '🎤 User' : '🔊 Assistant';
          console.log(`   ${index + 1}. [${time}] ${role}: ${msg.content}`);
        });
      }

      assistant.stopListening();
      console.log('\n✅ Voice assistant demo completed!');
    }, 23000);

  } catch (error) {
    console.error('❌ Voice assistant demo failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { VoiceAssistant };

// Run demo if this file is executed directly
if (require.main === module) {
  runVoiceAssistantDemo().catch(console.error);
}