import { TranscriptMonitor, BrowserStorage, AnalysisContext, AnalysisResult, Message } from '../src/index';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Real-World Chatbot Example
 * 
 * This example demonstrates a production-ready chatbot implementation featuring:
 * - Named addressing and role-based responses
 * - Context file integration for domain knowledge
 * - Custom analysis logic with business rules
 * - Comprehensive error handling and logging
 * - Conversation persistence and management
 * - Performance monitoring and metrics
 */

interface ChatbotMetrics {
  totalMessages: number;
  responsesGenerated: number;
  averageResponseTime: number;
  errorCount: number;
  startTime: number;
}

class ProductSupportChatbot {
  private monitor: TranscriptMonitor;
  private metrics: ChatbotMetrics;
  private contextData: any;
  private isInitialized = false;

  constructor() {
    this.metrics = {
      totalMessages: 0,
      responsesGenerated: 0,
      averageResponseTime: 0,
      errorCount: 0,
      startTime: Date.now()
    };
    
    this.initializeMonitor();
  }

  private async initializeMonitor() {
    // Load context data for product support
    await this.loadContextData();
    
    this.monitor = new TranscriptMonitor({
      // Use browser storage for persistence (in real app, this would be your DB)
      storage: new BrowserStorage(),
      
      // Chatbot identity
      name: 'Alex',
      role: 'senior product support specialist with 5+ years experience',
      contextFile: JSON.stringify(this.contextData),
      
      // Optimized for responsive customer service
      debounceMs: 800,  // Quick response time
      pollingIntervalMs: 300,
      maxPollingIntervalMs: 2000,
      
      analyzer: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',  // Fast and cost-effective
        minWords: 2,           // Respond to very short messages
        maxSilenceMs: 1200,    // Quick timeout for customer service
        customAnalyzer: this.customAnalyzer.bind(this)
      },
      
      generator: {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o',
        systemPrompt: this.buildSystemPrompt(),
        temperature: 0.3,      // Consistent, professional responses
        maxTokens: 200
      }
    });

    this.setupEventHandlers();
    this.isInitialized = true;
  }

  private async loadContextData() {
    // Simulate loading product knowledge base
    this.contextData = {
      company: "TechCorp Solutions",
      products: [
        {
          name: "CloudSync Pro",
          version: "3.2.1",
          commonIssues: ["login problems", "sync failures", "slow performance"],
          supportLevel: "premium"
        },
        {
          name: "DataVault",
          version: "2.1.5",
          commonIssues: ["backup failures", "storage limits", "encryption issues"],
          supportLevel: "standard"
        }
      ],
      businessHours: "9 AM - 6 PM EST, Monday-Friday",
      escalationKeywords: ["frustrated", "angry", "cancel", "refund", "lawsuit", "broken"],
      priorityCustomers: ["enterprise", "premium", "vip"],
      responseTemplates: {
        greeting: "Hello! I'm Alex, your product support specialist. I'm here to help you with any questions or issues.",
        escalation: "I understand your frustration. Let me connect you with a senior specialist who can better assist you.",
        offHours: "Our support team is currently offline. You can expect a response within 2 hours during business hours."
      }
    };
  }

  private buildSystemPrompt(): string {
    return `You are Alex, a senior product support specialist for ${this.contextData.company}. 

Your expertise:
- 5+ years in technical support
- Deep knowledge of all company products
- Excellent customer service skills
- Ability to explain technical concepts simply

Guidelines:
1. Always be helpful, professional, and empathetic
2. Provide specific, actionable solutions when possible
3. If you don't know something, be honest and offer to escalate
4. Use the customer's name when they provide it
5. Keep responses concise but thorough
6. Always ask clarifying questions for complex issues

Available products: ${this.contextData.products.map(p => `${p.name} v${p.version}`).join(', ')}

Remember: You have access to the full product knowledge base and can help with technical issues, account problems, and general questions.`;
  }

  private async customAnalyzer(transcript: string, context: AnalysisContext): Promise<AnalysisResult> {
    const transcriptLower = transcript.toLowerCase();
    
    // High priority triggers (always respond immediately)
    const urgentKeywords = this.contextData.escalationKeywords;
    const hasUrgentKeyword = urgentKeywords.some((keyword: string) => 
      transcriptLower.includes(keyword.toLowerCase())
    );
    
    if (hasUrgentKeyword) {
      return {
        shouldRespond: true,
        confidence: 0.98,
        reason: 'Urgent customer service keyword detected - immediate response required'
      };
    }

    // Direct addressing (name mentioned)
    const isDirectlyAddressed = context.name && 
      transcriptLower.includes(context.name.toLowerCase());
    
    if (isDirectlyAddressed) {
      return {
        shouldRespond: true,
        confidence: 0.95,
        reason: `Directly addressed as ${context.name}`
      };
    }

    // Product mentions
    const mentionsProduct = this.contextData.products.some((product: any) => 
      transcriptLower.includes(product.name.toLowerCase())
    );
    
    if (mentionsProduct) {
      return {
        shouldRespond: true,
        confidence: 0.9,
        reason: 'Product name mentioned - providing relevant support'
      };
    }

    // Standard question patterns
    const hasQuestion = transcript.includes('?');
    const hasGreeting = /^(hi|hello|hey|help)/i.test(transcript);
    const hasHelpKeywords = /help|support|issue|problem|error|bug/i.test(transcript);
    
    if (hasQuestion || hasGreeting || hasHelpKeywords) {
      return {
        shouldRespond: true,
        confidence: 0.85,
        reason: hasQuestion ? 'Question detected' : 
               hasGreeting ? 'Greeting detected' : 'Help keywords detected'
      };
    }

    // Consider conversation context
    if (context.conversationHistory.length > 0 && context.silenceDuration > 800) {
      return {
        shouldRespond: true,
        confidence: 0.7,
        reason: 'Active conversation with adequate pause'
      };
    }

    return {
      shouldRespond: false,
      confidence: 0.3,
      reason: 'Waiting for clearer customer intent'
    };
  }

  private setupEventHandlers() {
    this.monitor.on('transcriptChanged', (transcript: string) => {
      this.metrics.totalMessages++;
      console.log(`\n[${new Date().toLocaleTimeString()}] 💬 Customer: "${transcript}"`);
      console.log(`📊 Total messages: ${this.metrics.totalMessages}`);
    });

    this.monitor.on('analysisComplete', (result: AnalysisResult) => {
      console.log(`🔍 Analysis: ${result.shouldRespond ? '✅ Responding' : '⏳ Waiting'} (${(result.confidence * 100).toFixed(1)}%)`);
      console.log(`📝 Reason: ${result.reason}`);
    });

    this.monitor.on('responseGenerated', (response: string) => {
      const responseTime = Date.now() - this.metrics.startTime;
      this.metrics.responsesGenerated++;
      this.updateAverageResponseTime(responseTime);
      
      console.log(`\n🤖 Alex: "${response}"`);
      console.log(`⚡ Response time: ${responseTime}ms | Total responses: ${this.metrics.responsesGenerated}`);
      
      // Log conversation to file (in production, this would go to your database)
      this.logConversation('assistant', response);
    });

    this.monitor.on('error', (error: Error) => {
      this.metrics.errorCount++;
      console.error(`\n❌ Error occurred (${this.metrics.errorCount} total):`, error.message);
      
      // Implement error recovery strategies
      if (error.message.includes('rate limit')) {
        console.log('🔄 Implementing rate limit backoff...');
        // In production: implement exponential backoff
      } else if (error.message.includes('API key')) {
        console.error('🔑 API credentials issue - check environment variables');
      } else if (error.message.includes('network')) {
        console.log('🌐 Network issue detected - retrying...');
        // In production: implement retry logic
      }
    });

    this.monitor.on('started', () => {
      console.log('✅ Product Support Chatbot is now online!');
      console.log(`👋 I'm Alex, ready to help with ${this.contextData.company} products\n`);
    });
  }

  private updateAverageResponseTime(responseTime: number) {
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.responsesGenerated - 1) + responseTime;
    this.metrics.averageResponseTime = totalResponseTime / this.metrics.responsesGenerated;
  }

  private async logConversation(role: 'user' | 'assistant', content: string) {
    // In production, save to database or logging service
    const logEntry = {
      timestamp: new Date().toISOString(),
      role,
      content,
      sessionId: 'demo-session-123'
    };
    
    try {
      const logFile = path.join(__dirname, 'conversation.log');
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('Could not write to log file:', error);
    }
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('Chatbot not initialized. Call initializeMonitor() first.');
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    await this.monitor.start();
    return this;
  }

  async processMessage(message: string) {
    if (!this.isInitialized) {
      throw new Error('Chatbot not started');
    }
    
    this.logConversation('user', message);
    await this.monitor.updateTranscript(message);
  }

  getMetrics(): ChatbotMetrics {
    return { ...this.metrics };
  }

  getConversationHistory(): Message[] {
    return this.monitor.getHistory();
  }

  async stop() {
    if (this.monitor) {
      this.monitor.stop();
      console.log('\n🛑 Chatbot stopped');
      this.printFinalMetrics();
    }
  }

  private printFinalMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const uptimeSeconds = Math.round(uptime / 1000);
    
    console.log('\n📊 Session Metrics:');
    console.log(`   Uptime: ${uptimeSeconds}s`);
    console.log(`   Messages received: ${this.metrics.totalMessages}`);
    console.log(`   Responses generated: ${this.metrics.responsesGenerated}`);
    console.log(`   Response rate: ${this.metrics.totalMessages > 0 ? Math.round((this.metrics.responsesGenerated / this.metrics.totalMessages) * 100) : 0}%`);
    console.log(`   Average response time: ${Math.round(this.metrics.averageResponseTime)}ms`);
    console.log(`   Errors: ${this.metrics.errorCount}`);
  }
}

// Demo function to simulate customer interactions
async function runChatbotDemo() {
  console.log('🚀 Starting Real-World Product Support Chatbot Demo\n');

  try {
    const chatbot = new ProductSupportChatbot();
    await chatbot.start();

    // Simulate various customer scenarios
    const scenarios = [
      { delay: 1000, message: "Hi there!", description: "Initial greeting" },
      { delay: 3000, message: "Alex, I'm having trouble with CloudSync Pro", description: "Direct addressing with product mention" },
      { delay: 6000, message: "It keeps saying sync failed", description: "Problem description" },
      { delay: 9000, message: "I've tried restarting but nothing works", description: "Troubleshooting attempt" },
      { delay: 12000, message: "This is really frustrating!", description: "Escalation keyword" },
      { delay: 15000, message: "Can you help me fix this?", description: "Direct help request" },
      { delay: 18000, message: "Thanks for your help", description: "Conclusion" }
    ];

    console.log('🎭 Simulating customer support conversation...\n');

    // Process each scenario
    for (const scenario of scenarios) {
      setTimeout(async () => {
        console.log(`--- ${scenario.description} ---`);
        await chatbot.processMessage(scenario.message);
      }, scenario.delay);
    }

    // Show final results
    setTimeout(async () => {
      console.log('\n📚 Final Conversation Summary:');
      const history = chatbot.getConversationHistory();
      
      if (history.length > 0) {
        history.forEach((msg, index) => {
          const time = new Date(msg.timestamp).toLocaleTimeString();
          const role = msg.role === 'user' ? '👤 Customer' : '🤖 Alex';
          console.log(`   ${index + 1}. [${time}] ${role}: ${msg.content}`);
        });
      }

      await chatbot.stop();
      console.log('\n✅ Demo completed successfully!');
    }, 22000);

  } catch (error) {
    console.error('❌ Failed to start chatbot demo:', error);
    process.exit(1);
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runChatbotDemo().catch(console.error);
}

export { ProductSupportChatbot };