import { TranscriptAnalyzer } from '../src/TranscriptAnalyzer';

describe('TranscriptAnalyzer', () => {
  test('should detect questions', async () => {
    const analyzer = new TranscriptAnalyzer();
    
    const result = await analyzer.analyze('What is your name?', {
      transcript: 'What is your name?',
      previousTranscript: '',
      silenceDuration: 2000,
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('Question');
  });
  
  test('should wait for minimum words', async () => {
    const analyzer = new TranscriptAnalyzer({ minWords: 5 });
    
    const result = await analyzer.analyze('Hi there', {
      transcript: 'Hi there',
      previousTranscript: '',
      silenceDuration: 2000,
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('Too few words');
  });
  
  test('should wait for silence', async () => {
    const analyzer = new TranscriptAnalyzer({ maxSilenceMs: 1500 });
    
    const result = await analyzer.analyze('Hello how are you', {
      transcript: 'Hello how are you',
      previousTranscript: '',
      silenceDuration: 500, // Only 500ms of silence
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('still be speaking');
  });
});