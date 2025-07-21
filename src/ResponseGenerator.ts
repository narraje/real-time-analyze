import { GeneratorConfig, Message } from './types';

export class ResponseGenerator {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig = {}) {
    this.config = {
      provider: 'openai',
      temperature: 0.7,
      maxTokens: 150,
      ...config
    };
  }

  async generate(transcript: string, history: Message[]): Promise<string> {
    // Use custom generator if provided
    if (this.config.customGenerator) {
      return this.config.customGenerator(transcript, history);
    }
    
    // Use AI provider
    if (!this.config.apiKey) {
      throw new Error('API key required for response generation');
    }
    
    const messages = [
      ...(this.config.systemPrompt ? [{
        role: 'system' as const,
        content: this.config.systemPrompt
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
    
    const data = await response.json();
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
    
    const data = await response.json();
    return data.content[0].text;
  }
}