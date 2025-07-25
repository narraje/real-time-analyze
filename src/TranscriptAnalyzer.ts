import { AnalyzerConfig, AnalysisContext, AnalysisResult } from './types';

/**
 * TranscriptAnalyzer - Analyzes transcript content to determine if and when a response is needed
 * 
 * The analyzer evaluates transcripts based on multiple factors including:
 * - Content relevance and question detection
 * - Named addressing (when a name parameter is provided)
 * - Silence duration thresholds
 * - Word count minimums
 * - Context-specific rules based on role or additional context
 * 
 * The analyzer supports multiple AI providers and can be extended with custom analysis logic.
 */

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

  /**
   * Analyzes transcript content to determine if a response should be generated
   * 
   * @param transcript - The current transcript text to analyze
   * @param context - Additional context for the analysis including conversation history,
   *                  name recognition, role-specific behavior, and additional context
   * @returns Promise resolving to an AnalysisResult with response recommendation
   */
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
    
    // Check for immediate response triggers BEFORE silence duration
    const hasQuestion = transcript.includes('?');
    const hasGreeting = /^(hi|hello|hey)/i.test(transcript);
    
    if (hasQuestion || hasGreeting) {
      return {
        shouldRespond: true,
        confidence: 0.9,
        reason: hasQuestion ? 'Question detected' : 'Greeting detected'
      };
    }
    
    // Only check silence duration for non-obvious cases
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
    // Build detailed context for analysis
    let analysisContext = `${context.silenceDuration}ms of silence, ${context.conversationHistory.length} previous messages`;
    
    // Add name-based context - check if monitor is being directly addressed
    if (context.name && context.name.trim() !== '') {
      const nameLower = context.name.toLowerCase().trim();
      const transcriptLower = transcript.toLowerCase();
      
      // Check if name is mentioned in transcript
      const isAddressed = transcriptLower.includes(nameLower);
      analysisContext += `\nMonitor name: "${context.name}", directly addressed: ${isAddressed}`;
    }
    
    // Add role-based context to influence analysis
    if (context.role && context.role.trim() !== '') {
      analysisContext += `\nMonitor role: ${context.role}`;
    }
    
    // Add context file information if available
    if (context.contextFile && context.contextFile.trim() !== '') {
      const contextPreview = context.contextFile.length > 50 
        ? context.contextFile.substring(0, 50) + '...' 
        : context.contextFile;
      analysisContext += `\nAdditional context available: ${contextPreview}`;
    }
    
    const prompt = `
Analyze if this transcript needs a response:
"${transcript}"

Context: ${analysisContext}

${this.buildAnalysisInstructions(context)}

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
      
      return this.parseAndValidateResponse(response, transcript, context);
    } catch (error) {
      // Fallback to rule-based
      return this.ruleBasedAnalysis(transcript, context);
    }
  }

  private parseAndValidateResponse(response: string, transcript: string, context: AnalysisContext): AnalysisResult {
    try {
      const parsed = JSON.parse(response);
      
      // Validate required fields and types
      if (typeof parsed.shouldRespond !== 'boolean') {
        throw new Error('Invalid shouldRespond field');
      }
      
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        throw new Error('Invalid confidence field');
      }
      
      if (typeof parsed.reason !== 'string' || parsed.reason.length === 0) {
        throw new Error('Invalid reason field');
      }
      
      return {
        shouldRespond: parsed.shouldRespond,
        confidence: Math.max(0, Math.min(1, parsed.confidence)), // Clamp to 0-1 range
        reason: parsed.reason.substring(0, 200) // Limit reason length
      };
    } catch (error) {
      // If parsing fails, fall back to rule-based analysis
      console.warn('AI response parsing failed, using rule-based fallback:', error);
      return this.ruleBasedAnalysis(transcript, context);
    }
  }

  /**
   * Builds specific instructions for analysis based on context parameters
   * @param context Analysis context containing role and other information
   * @returns Instructions string for the analyzer
   */
  private buildAnalysisInstructions(context: AnalysisContext): string {
    let instructions = '';
    
    // Add name-specific instructions
    if (context.name && context.name.trim() !== '') {
      instructions += `If the user directly addresses "${context.name}", increase confidence in responding.`;
    }
    
    // Add generic role-based instructions
    if (context.role && context.role.trim() !== '') {
      instructions += `\n\nConsider the context of acting in the role of: ${context.role}`;
      instructions += `\n\nAdjust your analysis and response confidence accordingly.`;
    }
    
    // Add context file-specific instructions if available
    if (context.contextFile && context.contextFile.trim() !== '') {
      instructions += `\n\nUse the additional context to determine if a response is appropriate given the broader situational awareness.`;
    }
    
    return instructions;
  }

  private ruleBasedAnalysis(transcript: string, context: AnalysisContext): AnalysisResult {
    const hasQuestion = transcript.includes('?');
    const hasGreeting = /^(hi|hello|hey)/i.test(transcript);
    const seemsComplete = /[.!?]$/.test(transcript) || transcript.split(/\s+/).length > 10;
    let baseConfidence = 0.0;
    let shouldRespond = false;
    let reason = '';
    
    // Check for direct addressing by name
    const isDirectlyAddressed = context.name && 
                               context.name.trim() !== '' && 
                               transcript.toLowerCase().includes(context.name.toLowerCase().trim());
    
    // Direct addressing significantly increases confidence
    if (isDirectlyAddressed) {
      baseConfidence += 0.3; // Substantial boost for being directly addressed
      reason = `Directly addressed as ${context.name}`;
      shouldRespond = true;
    }
    
    // Standard checks
    if (hasQuestion) {
      baseConfidence += 0.5;
      shouldRespond = true;
      reason = reason ? `${reason}, question detected` : 'Question detected';
    } else if (hasGreeting) {
      baseConfidence += 0.4;
      shouldRespond = true;
      reason = reason ? `${reason}, greeting detected` : 'Greeting detected';
    }
    
    // Generic role-based adjustment - just add a small boost when role is provided
    if (context.role && context.role.trim() !== '') {
      // Small boost for having context about the role
      baseConfidence += 0.1;
    }
    
    // Complete statement check
    if (seemsComplete && context.silenceDuration > 2000) {
      baseConfidence += 0.2;
      shouldRespond = shouldRespond || true; // Only set true if not already set
      reason = reason ? `${reason}, complete statement` : 'Complete statement';
    }
    
    // Final confidence calculation
    const finalConfidence = Math.min(0.95, Math.max(0.1, baseConfidence)); // Clamp between 0.1 and 0.95
    
    return {
      shouldRespond: shouldRespond,
      confidence: finalConfidence,
      reason: reason || 'Incomplete or unclear'
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
    
    const data = await response.json() as any;
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
    
    const data = await response.json() as any;
    return data.content[0].text;
  }
}