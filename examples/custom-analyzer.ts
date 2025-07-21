import { TranscriptMonitor } from '../src/index';

// Custom analysis logic
const monitor = new TranscriptMonitor({
  analyzer: {
    customAnalyzer: async (transcript, context) => {
      // Your custom logic here
      const hasQuestion = transcript.includes('?');
      const isLongEnough = transcript.split(' ').length > 5;
      const hasBeenSilent = context.silenceDuration > 2000;
      
      // Custom decision logic
      if (hasQuestion) {
        return {
          shouldRespond: true,
          confidence: 0.95,
          reason: 'Direct question'
        };
      }
      
      if (isLongEnough && hasBeenSilent) {
        return {
          shouldRespond: true,
          confidence: 0.7,
          reason: 'Complete thought'
        };
      }
      
      return {
        shouldRespond: false,
        confidence: 0.3,
        reason: 'Waiting for more input'
      };
    }
  },
  
  generator: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-3-sonnet-20240229',
    systemPrompt: 'Be helpful and concise.'
  }
});