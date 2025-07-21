import { TranscriptMonitor, SimpleStorage } from '../src';

describe('TranscriptMonitor', () => {
  let monitor: TranscriptMonitor;
  
  beforeEach(() => {
    monitor = new TranscriptMonitor({
      storage: new SimpleStorage(),
      analyzer: {
        // Use rule-based analysis for tests (no API calls)
        customAnalyzer: async (transcript, context) => {
          // Always respond to messages with enough words for testing
          const wordCount = transcript.split(' ').length;
          return {
            shouldRespond: wordCount >= 5, // Respond to longer messages
            confidence: 0.8,
            reason: 'Test analysis'
          };
        }
      },
      generator: {
        // Mock generator for tests
        customGenerator: async (transcript, history) => {
          return `Test response to: ${transcript}`;
        }
      },
      debounceMs: 100 // Faster for tests
    });
  });
  
  afterEach(() => {
    monitor.stop();
  });
  
  test('should emit events when transcript changes', (done) => {
    // Use once() to avoid multiple event firing issues
    monitor.once('transcriptChanged', (transcript) => {
      expect(transcript).toBe('Hello world');
      done();
    });
    
    monitor.start();
    monitor.updateTranscript('Hello world');
  });
  
  test('should analyze transcripts', (done) => {
    monitor.on('analysisComplete', (result) => {
      expect(result.shouldRespond).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      done();
    });
    
    monitor.start();
    monitor.updateTranscript('What is the weather like?');
  });
  
  test('should generate responses for complete thoughts', (done) => {
    monitor.on('responseGenerated', (response) => {
      expect(response).toContain('Test response to:');
      done();
    });
    
    monitor.start();
    monitor.updateTranscript('How can you help me today?');
  });
  
  test('should not respond to very short inputs', async () => {
    const mockAnalysis = jest.fn();
    monitor.on('analysisComplete', mockAnalysis);
    
    monitor.start();
    await monitor.updateTranscript('Hi');
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 200));
    
    expect(mockAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        shouldRespond: false
      })
    );
  });
  
  test('should maintain conversation history', async () => {
    monitor.start();
    
    // Wait for first response to be generated
    const firstResponse = new Promise(resolve => {
      monitor.once('responseGenerated', resolve);
    });
    
    await monitor.updateTranscript('First message that is long enough to trigger');
    await firstResponse;
    
    // Wait for second response to be generated
    const secondResponse = new Promise(resolve => {
      monitor.once('responseGenerated', resolve);
    });
    
    await monitor.updateTranscript('Second message that is long enough to trigger');
    await secondResponse;
    
    const history = monitor.getHistory();
    expect(history.length).toBe(4); // 2 user + 2 assistant messages
    expect(history[0].role).toBe('user');
    expect(history[1].role).toBe('assistant');
    expect(history[2].role).toBe('user');
    expect(history[3].role).toBe('assistant');
  });
});