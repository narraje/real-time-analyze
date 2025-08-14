import { GeneratorConfig, Message } from './types';
import * as fs from 'fs/promises';

/**
 * ResponseGenerator - Generates contextually appropriate responses to transcript content
 * 
 * Features:
 * - Multiple AI provider support (OpenAI, Anthropic, or custom implementation)
 * - Conversation history integration for context-aware responses
 * - Temperature and token control for response generation
 * - Support for name, role, and context file parameters to personalize responses
 * - Graceful error handling with fallback responses
 * 
 * @example
 * ```typescript
 * import { ResponseGenerator } from 'transcript-monitor-agent';
 * 
 * const generator = new ResponseGenerator({
 *   provider: 'openai',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   model: 'gpt-4o',
 *   systemPrompt: 'You are a helpful assistant.',
 *   temperature: 0.7,
 *   maxTokens: 150
 * });
 * 
 * const response = await generator.generate(
 *   'What is machine learning?',
 *   conversationHistory,
 *   { name: 'Assistant', role: 'teacher' }
 * );
 * 
 * console.log('Generated response:', response);
 * ```
 */
export class ResponseGenerator {
  private config: GeneratorConfig;

  /**
   * Creates a new ResponseGenerator instance with the specified configuration.
   * 
   * @param config - Configuration object for the generator (optional)
   * @param config.provider - AI provider ('openai', 'anthropic', or 'custom')
   * @param config.apiKey - API key for AI providers
   * @param config.model - Model name (provider-specific)
   * @param config.systemPrompt - System prompt for AI
   * @param config.temperature - Response creativity 0-1 (default: 0.7)
   * @param config.maxTokens - Maximum response length (default: 150)
   * @param config.customGenerator - Custom generator function
   * 
   * @example
   * ```typescript
   * const generator = new ResponseGenerator({
   *   provider: 'anthropic',
   *   apiKey: process.env.ANTHROPIC_API_KEY,
   *   model: 'claude-3-sonnet-20240229',
   *   systemPrompt: 'You are a helpful customer service representative.',
   *   temperature: 0.3,
   *   maxTokens: 200
   * });
   * ```
   */
  constructor(config: GeneratorConfig = {}) {
    this.config = {
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 150,
      ...config
    };
  }

  /**
   * Generates a response based on transcript content and conversation history.
   * This is the main method that creates contextually appropriate responses using AI.
   * 
   * @param transcript - The current transcript text to respond to
   * @param history - Array of previous messages in the conversation for context
   * @param options - Additional response configuration options
   * @param options.name - Optional name of the assistant being addressed
   * @param options.role - Optional role to adopt when generating responses (e.g. "teacher", "support agent")
   * @param options.contextFile - Optional path to file with additional context or direct content
   * @returns Promise resolving to the generated response text
   * @throws {Error} If generation fails and API key is missing or invalid
   * 
   * @example
   * ```typescript
   * const response = await generator.generate(
   *   'I need help with my order',
   *   [
   *     { role: 'user', content: 'Hello', timestamp: Date.now() - 5000 },
   *     { role: 'assistant', content: 'Hi! How can I help?', timestamp: Date.now() - 4000 }
   *   ],
   *   {
   *     name: 'Sarah',
   *     role: 'customer service representative',
   *     contextFile: 'company-policies.json'
   *   }
   * );
   * 
   * console.log('AI Response:', response);
   * ```
   */
  async generate(transcript: string, history: Message[], options?: { name?: string; role?: string; contextFile?: string }): Promise<string> {
    // Use custom generator if provided
    if (this.config.customGenerator) {
      return this.config.customGenerator(transcript, history);
    }
    
    // Use AI provider
    if (!this.config.apiKey) {
      throw new Error('API key required for response generation');
    }
    
    // Build system prompt with additional context if available
    let systemPrompt = this.config.systemPrompt || '';
    
    // Add role information to system prompt if provided
    if (options?.role) {
      systemPrompt += `\n\nYou are acting as: ${options.role}`;
    }
    
    // Add name to system prompt if provided
    if (options?.name && options.name.trim() !== '') {
      systemPrompt += `\n\nYou should respond when directly addressed as "${options.name}".`;
    }
    
    // Load and add context file content if provided
    if (options?.contextFile) {
      try {
        // Check if it's a file path or direct content
        if (options.contextFile.includes('\n') || !options.contextFile.includes('/')) {
          // Direct content
          systemPrompt += `\n\nAdditional context: ${options.contextFile}`;
        } else {
          // Try to read from file
          try {
            const contextContent = await fs.readFile(options.contextFile, 'utf-8');
            systemPrompt += `\n\nAdditional context: ${contextContent}`;
          } catch (error) {
            console.warn(`Could not read context file: ${options.contextFile}`, error);
            // Still include the context filename as a reference
            systemPrompt += `\n\nContext reference: ${options.contextFile}`;
          }
        }
      } catch (error) {
        console.warn('Error processing context file', error);
      }
    }
    
    const messages = [
      ...(systemPrompt ? [{
        role: 'system' as const,
        content: systemPrompt
      }] : []),
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user' as const, content: transcript }
    ];
    
    if (this.config.provider === 'openai') {
      return this.generateOpenAI(messages);
    } else if (this.config.provider === 'anthropic') {
      return this.generateAnthropic(messages);
    }
    
    throw new Error(`Unknown provider: ${this.config.provider}`);
  }

  private async generateOpenAI(messages: any[]): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o',
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.choices[0].message.content;
  }

  private async generateAnthropic(messages: any[]): Promise<string> {
    // Extract system prompt
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-sonnet-20240229',
        system: systemMessage?.content,
        messages: userMessages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens || 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.content[0].text;
  }
}