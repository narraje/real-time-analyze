import { ResponseGenerator } from '../src/ResponseGenerator';

describe('ResponseGenerator', () => {
  test('should use custom generator', async () => {
    const generator = new ResponseGenerator({
      customGenerator: async (transcript, history) => {
        return `Echo: ${transcript}`;
      }
    });
    
    const response = await generator.generate('Hello', []);
    expect(response).toBe('Echo: Hello');
  });
  
  test('should include conversation history', async () => {
    const generator = new ResponseGenerator({
      customGenerator: async (transcript, history) => {
        return `History length: ${history.length}, New: ${transcript}`;
      }
    });
    
    const history = [
      { role: 'user' as const, content: 'Hi', timestamp: Date.now() },
      { role: 'assistant' as const, content: 'Hello', timestamp: Date.now() }
    ];
    
    const response = await generator.generate('How are you?', history);
    expect(response).toBe('History length: 2, New: How are you?');
  });
  
  test('should throw error without API key', async () => {
    const generator = new ResponseGenerator({
      provider: 'openai'
      // No API key provided
    });
    
    await expect(generator.generate('Hello', [])).rejects.toThrow('API key required');
  });
});