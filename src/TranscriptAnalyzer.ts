import { AnalyzerConfig, AnalysisContext, AnalysisResult } from './types';

export class TranscriptAnalyzer {
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig = {}) {
    this.config = {
      provider: 'openai',
      minWords: 5,
      maxSilenceMs: 1500,
      ...config
    };
  }

  async analyze(transcript: string, context: AnalysisContext): Promise<AnalysisResult> {
    // Basic checks
    const wordCount = transcript.split(/\s+/).filter(w => w.length > 0).length;
    
    if (wordCount < (this.config.minWords || 5)) {
      return {
        shouldRespond: false,
        confidence: 0.2,
        reason: 'Too few words'
      };
    }
    
    if (context.silenceDuration < (this.config.maxSilenceMs || 1500)) {
      return {
        shouldRespond: false,
        confidence: 0.5,
        reason: 'User may still be speaking'
      };
    }
    
    // Use custom analyzer if provided
    if (this.config.customAnalyzer) {
      return this.config.customAnalyzer(transcript, context);
    }
    
    // AI-based analysis
    if (this.config.provider !== 'custom' && this.config.apiKey) {
      return this.aiAnalysis(transcript, context);
    }
    
    // Simple rule-based fallback
    return this.ruleBasedAnalysis(transcript, context);
  }

  private async aiAnalysis(transcript: string, context: AnalysisContext): Promise<AnalysisResult> {
    const prompt = `
Analyze if this transcript needs a response:
"${transcript}"

Context: ${context.silenceDuration}ms of silence, ${context.conversationHistory.length} previous messages

Return JSON: { "shouldRespond": boolean, "confidence": 0-1, "reason": "brief explanation" }
`;

    try {
      let response: string;
      
      if (this.config.provider === 'openai') {
        response = await this.callOpenAI(prompt);
      } else if (this.config.provider === 'anthropic') {
        response = await this.callAnthropic(prompt);
      } else {
        throw new Error(`Unknown provider: ${this.config.provider}`);
      }
      
      return JSON.parse(response);
    } catch (error) {
      // Fallback to rule-based
      return this.ruleBasedAnalysis(transcript, context);
    }
  }

  private ruleBasedAnalysis(transcript: string, context: AnalysisContext): AnalysisResult {
    const hasQuestion = transcript.includes('?');
    const hasGreeting = /^(hi|hello|hey)/i.test(transcript);
    const seemsComplete = /[.!?]$/.test(transcript) || transcript.split(/\s+/).length > 10;
    
    if (hasQuestion || hasGreeting) {
      return {
        shouldRespond: true,
        confidence: 0.9,
        reason: hasQuestion ? 'Question detected' : 'Greeting detected'
      };
    }
    
    if (seemsComplete && context.silenceDuration > 2000) {
      return {
        shouldRespond: true,
        confidence: 0.7,
        reason: 'Complete statement'
      };
    }
    
    return {
      shouldRespond: false,
      confidence: 0.4,
      reason: 'Incomplete or unclear'
    };
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }

  private async callAnthropic(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
  }
}