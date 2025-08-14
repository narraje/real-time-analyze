# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2024-01-15

### Added
- **Named Addressing Support**: Monitor can now be given a name and will respond more readily when directly addressed
- **Role-based Analysis**: Added role parameter to influence analysis and response behavior
- **Context File Support**: Can now load additional context from files or direct content
- **Enhanced Event System**: Added `started` event for better lifecycle management
- **Improved Error Handling**: Better error categorization and retry mechanisms
- **Comprehensive JSDoc**: All public APIs now have detailed documentation with examples

### Enhanced
- **TranscriptAnalyzer**: 
  - Added support for name recognition in transcripts
  - Role-based analysis adjustments
  - Context file integration for better decision making
  - Improved fallback to rule-based analysis when AI fails
- **ResponseGenerator**: 
  - Context-aware response generation
  - Support for loading context from files
  - Better system prompt construction with role and name integration
- **Performance Optimizations**:
  - Improved debouncing logic
  - Better memory management for conversation history
  - Optimized polling with adaptive intervals

### Fixed
- Race condition prevention in transcript processing
- Better silence duration calculation
- Improved conversation history cleanup
- Enhanced error recovery mechanisms

### Documentation
- Completely rewritten README with comprehensive examples
- New API documentation with TypeScript signatures
- Enhanced examples including real-world chatbot and voice assistant
- Migration guide for version upgrades

## [1.0.1] - 2023-12-10

### Fixed
- Minor bug fixes in transcript processing
- Performance improvements in event handling
- Better error messages for API issues

### Enhanced
- Code refactoring for better maintainability
- Improved TypeScript definitions
- Enhanced test coverage

## [1.0.0] - 2023-11-20

### Added
- **Core TranscriptMonitor**: Main orchestration class for transcript monitoring
- **TranscriptAnalyzer**: AI-powered analysis to determine response timing
- **ResponseGenerator**: Contextual AI response generation
- **Storage System**: 
  - SimpleStorage for in-memory storage
  - BrowserStorage for persistent browser storage
  - Custom storage interface support
- **Multi-Provider AI Support**:
  - OpenAI integration (GPT models)
  - Anthropic integration (Claude models)
  - Custom analyzer/generator support
- **Event-Driven Architecture**:
  - `transcriptChanged` event
  - `analysisComplete` event  
  - `responseGenerated` event
  - `error` event
- **Conversation Management**:
  - Automatic conversation history tracking
  - History cleanup and management
  - Message timestamping
- **Utility Functions**:
  - Debounce utility for input handling
  - Retry utility with exponential backoff

### Features
- Real-time transcript monitoring with configurable debouncing
- Intelligent response timing based on content analysis
- Silence duration detection and analysis
- Word count and content pattern recognition
- Configurable polling with adaptive intervals
- TypeScript-first with comprehensive type definitions
- Cross-platform compatibility (Node.js and browser)

## [0.9.0-beta] - 2023-10-15

### Added
- Initial beta release
- Basic transcript monitoring functionality
- Simple OpenAI integration
- Event-based architecture foundation

### Known Issues
- Limited error handling
- Basic storage implementation only
- No conversation history management

---

## Migration Guides

### Migrating from 1.0.x to 1.1.x

This is a **non-breaking** update. All existing code will continue to work without changes.

#### New Optional Features

You can now enhance your implementation with these new features:

```typescript
// Before (still works)
const monitor = new TranscriptMonitor({
  analyzer: { provider: 'openai', apiKey: 'your-key' },
  generator: { provider: 'openai', apiKey: 'your-key' }
});

// After (enhanced with new features)
const monitor = new TranscriptMonitor({
  name: 'Assistant',  // NEW: Enable name recognition
  role: 'customer service representative',  // NEW: Role-based behavior
  contextFile: 'path/to/context.json',  // NEW: Additional context
  
  analyzer: { provider: 'openai', apiKey: 'your-key' },
  generator: { provider: 'openai', apiKey: 'your-key' }
});
```

#### Enhanced Analysis Context

The `AnalysisContext` interface now includes additional optional fields:

```typescript
// Your custom analyzer now receives enhanced context
const customAnalyzer = async (transcript: string, context: AnalysisContext) => {
  // NEW: Check if monitor was directly addressed
  if (context.name && transcript.toLowerCase().includes(context.name.toLowerCase())) {
    return { shouldRespond: true, confidence: 0.9, reason: 'Directly addressed' };
  }
  
  // NEW: Role-based decision making
  if (context.role && context.role.includes('support')) {
    // Be more responsive in support contexts
  }
  
  // Existing logic continues to work
  return { shouldRespond: false, confidence: 0.3, reason: 'Waiting' };
};
```

#### New Events

Listen for the new `started` event:

```typescript
monitor.on('started', () => {
  console.log('Monitoring is now active');
});
```

### Migrating from 0.9.x to 1.0.x

This was a **breaking** update with significant API changes.

#### Major Changes

1. **Event Names Changed**:
   ```typescript
   // Before
   monitor.on('transcript', callback);
   monitor.on('analysis', callback);
   monitor.on('response', callback);
   
   // After
   monitor.on('transcriptChanged', callback);
   monitor.on('analysisComplete', callback);
   monitor.on('responseGenerated', callback);
   ```

2. **Configuration Structure**:
   ```typescript
   // Before
   const monitor = new TranscriptMonitor({
     openaiKey: 'your-key',
     model: 'gpt-4'
   });
   
   // After
   const monitor = new TranscriptMonitor({
     analyzer: {
       provider: 'openai',
       apiKey: 'your-key',
       model: 'gpt-4'
     },
     generator: {
       provider: 'openai',
       apiKey: 'your-key',
       model: 'gpt-4'
     }
   });
   ```

3. **Storage System**:
   ```typescript
   // Before: No custom storage
   
   // After: Configurable storage
   const monitor = new TranscriptMonitor({
     storage: new SimpleStorage(), // or BrowserStorage, or custom
     // ... other config
   });
   ```

#### Migration Steps

1. Update event listener names
2. Restructure configuration object
3. Choose appropriate storage implementation
4. Update import statements if needed
5. Test thoroughly with new API

---

## Roadmap

### Upcoming Features (v1.2.0)
- WebSocket support for real-time transcript streaming
- Plugin system for custom integrations
- Built-in speech-to-text adapters
- Enhanced conversation context management
- Performance monitoring and analytics

### Future Considerations (v2.0.0)
- Multi-language support
- Advanced conversation flow management
- Integration with popular voice platforms
- Machine learning-based response timing optimization
- Enterprise features (logging, monitoring, scaling)

---

## Support and Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/transcript-monitor-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/transcript-monitor-agent/discussions)
- **Documentation**: [API Documentation](./API.md)
- **Examples**: [Examples Directory](./examples/)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code of conduct
- Development setup
- Pull request process
- Coding standards