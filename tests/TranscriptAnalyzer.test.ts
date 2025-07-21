import { TranscriptAnalyzer } from '../src/TranscriptAnalyzer';

describe('TranscriptAnalyzer', () => {
  test('should detect questions immediately', async () => {
    const analyzer = new TranscriptAnalyzer();
    
    // Questions should be detected even with short silence duration
    // Using a longer question to meet minimum word count (5+ words)
    const result = await analyzer.analyze('What is your full name today?', {
      transcript: 'What is your full name today?',
      previousTranscript: '',
      silenceDuration: 100, // Very short silence - should still respond to questions
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('Question detected');
    expect(result.confidence).toBe(0.9);
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
  
  test('should detect greetings immediately', async () => {
    const analyzer = new TranscriptAnalyzer();
    
    // Greetings should be detected even with short silence duration
    // Using a longer greeting to meet minimum word count (5+ words)
    const result = await analyzer.analyze('Hello there how are you doing', {
      transcript: 'Hello there how are you doing',
      previousTranscript: '',
      silenceDuration: 100, // Very short silence - should still respond to greetings
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(true);
    expect(result.reason).toContain('Greeting detected');
    expect(result.confidence).toBe(0.9);
  });

  test('should wait for silence on statements', async () => {
    const analyzer = new TranscriptAnalyzer({ maxSilenceMs: 1500 });
    
    // Use a statement (not greeting/question) that should wait for silence
    const result = await analyzer.analyze('I am working on a project today', {
      transcript: 'I am working on a project today',
      previousTranscript: '',
      silenceDuration: 500, // Only 500ms of silence
      conversationHistory: []
    });
    
    expect(result.shouldRespond).toBe(false);
    expect(result.reason).toContain('User may still be speaking');
  });
});