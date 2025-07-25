/**
 * README.md Generator Script
 * 
 * This script generates the README.md file by:
 * 1. Extracting package information from package.json
 * 2. Using a template with dynamic content
 * 3. Including up-to-date examples from the examples directory
 * 4. Leveraging OpenAI to analyze recent changes and improve content
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');

// Paths
const ROOT_DIR = path.resolve(__dirname, '../..');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');
const EXAMPLES_DIR = path.join(ROOT_DIR, 'examples');

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4';

// Load package.json
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));

// Extract example files
function getExamples() {
  const examples = {};
  
  // Read example files
  const exampleFiles = fs.readdirSync(EXAMPLES_DIR)
    .filter(file => file.endsWith('.ts') && !file.includes('test-'));
    
  // Extract content from each example
  exampleFiles.forEach(file => {
    const content = fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8');
    const name = file.replace('.ts', '');
    
    examples[name] = content;
  });
  
  return examples;
}

/**
 * Get recent changes from git
 */
async function getRecentChanges() {
  return new Promise((resolve, reject) => {
    exec('git log -n 5 --pretty=format:"%h %s" --no-merges', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.warn('Warning: Could not get git history. Using default content.', error);
        resolve([]);
        return;
      }
      
      const changes = stdout.split('\n').map(line => {
        const [hash, ...messageParts] = line.split(' ');
        return {
          hash,
          message: messageParts.join(' ')
        };
      });
      
      resolve(changes);
    });
  });
}

/**
 * Get file changes from the most recent commits
 */
async function getFileChanges() {
  return new Promise((resolve, reject) => {
    exec('git diff --name-status HEAD~3 HEAD', { cwd: ROOT_DIR }, (error, stdout, stderr) => {
      if (error) {
        console.warn('Warning: Could not get file changes. Using default content.', error);
        resolve([]);
        return;
      }
      
      const changes = stdout.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          const [status, ...fileParts] = line.split('\t');
          return {
            status,
            file: fileParts.join('\t')
          };
        });
      
      resolve(changes);
    });
  });
}

/**
 * Call OpenAI API to enhance content
 */
async function callOpenAI(prompt) {
  if (!OPENAI_API_KEY) {
    console.warn('Warning: OpenAI API key not provided. Skipping AI enhancement.');
    return null;
  }
  
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'You are a technical documentation assistant. Your task is to help improve README files for code projects.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 1000
    });
    
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': data.length
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          if (parsedData.error) {
            console.warn('OpenAI API error:', parsedData.error);
            resolve(null);
            return;
          }
          resolve(parsedData.choices[0].message.content);
        } catch (error) {
          console.warn('Error parsing OpenAI response:', error);
          resolve(null);
        }
      });
    });
    
    req.on('error', (error) => {
      console.warn('Error calling OpenAI API:', error);
      resolve(null);
    });
    
    req.write(data);
    req.end();
  });
}

/**
 * Generate an improved section with OpenAI
 */
async function enhanceSectionWithAI(sectionName, content, recentChanges, fileChanges) {
  const prompt = `
I'm updating a README.md file for a TypeScript package called "transcript-monitor-agent".

Recent changes in the repository:
${recentChanges.map(c => `- ${c.message} (${c.hash})`).join('\n')}

Files changed:
${fileChanges.map(c => `- ${c.status} ${c.file}`).join('\n')}

Here's the current content for the "${sectionName}" section of the README:

${content}

Please improve this section based on the recent changes. Make it more informative, concise, and engaging.
Keep the same general structure but enhance the explanations and examples.
If there are any new features or changes reflected in the recent commits, please incorporate them.
Keep the technical information accurate and focus on making the content helpful to developers.
Respond ONLY with the improved section content in markdown format, without any extra explanations.
`;

  const enhancedContent = await callOpenAI(prompt);
  return enhancedContent || content; // Fallback to original if OpenAI fails
}

/**
 * Generate README content using the template with dynamic data
 */
async function generateReadme() {
  const examples = getExamples();
  const recentChanges = await getRecentChanges();
  const fileChanges = await getFileChanges();
  
  // Get basic example from examples/basic.ts if it exists
  let basicExample = examples['basic'] || 
    `import { TranscriptMonitor } from "transcript-monitor-agent";

const monitor = new TranscriptMonitor({
  analyzer: {
    provider: "openai",
    apiKey: "your-openai-key",
    minWords: 5, // Don't respond to very short inputs
    maxSilenceMs: 1500, // Wait 1.5s of "silence" before responding
  },
  generator: {
    provider: "openai",
    apiKey: "your-openai-key",
    model: "gpt-4o",
    systemPrompt: "You are a helpful assistant.",
  },
});

// Listen for responses
monitor.on("responseGenerated", (response) => {
  console.log("AI says:", response);
  // Send to TTS, display in UI, etc.
});

// Start monitoring
monitor.start();

// Send transcripts from ANY source
monitor.updateTranscript("Hello, how are you?");`;

  // Get deepgram example
  let deepgramExample = examples['with-deepgram'] || 
    `import { TranscriptMonitor } from "transcript-monitor-agent";

const monitor = new TranscriptMonitor({
  analyzer: {
    provider: "openai",
    apiKey: "key",
    minWords: 3,
  },
  generator: {
    provider: "openai",
    apiKey: "key",
  },
});

// Deepgram streaming
deepgram.on("transcript", (data) => {
  monitor.updateTranscript(data.transcript);
});`;

  // Get custom analyzer example
  let customAnalyzerExample = examples['custom-analyzer'] || 
    `const monitor = new TranscriptMonitor({
  analyzer: {
    customAnalyzer: async (transcript, context) => {
      // Your logic here
      if (transcript.includes("?")) {
        return {
          shouldRespond: true,
          confidence: 0.95,
          reason: "Question detected",
        };
      }

      return {
        shouldRespond: false,
        confidence: 0.3,
        reason: "Not ready",
      };
    },
  },
});`;

  // Enhance examples with AI if available
  if (OPENAI_API_KEY) {
    try {
      // Only enhance if there were actual changes to the examples
      const hasExampleChanges = fileChanges.some(change => change.file.startsWith('examples/'));
      
      if (hasExampleChanges) {
        console.log('Enhancing examples with OpenAI...');
        
        const enhancedBasic = await enhanceSectionWithAI('Basic Example', basicExample, recentChanges, fileChanges);
        const enhancedDeepgram = await enhanceSectionWithAI('With Deepgram Example', deepgramExample, recentChanges, fileChanges);
        const enhancedCustom = await enhanceSectionWithAI('Custom Analyzer Example', customAnalyzerExample, recentChanges, fileChanges);
        
        // Only use enhanced versions if they're actually better (avoid gibberish)
        if (enhancedBasic && enhancedBasic.includes('import') && enhancedBasic.includes('TranscriptMonitor')) {
          basicExample = enhancedBasic;
        }
        
        if (enhancedDeepgram && enhancedDeepgram.includes('import') && enhancedDeepgram.includes('Deepgram')) {
          deepgramExample = enhancedDeepgram;
        }
        
        if (enhancedCustom && enhancedCustom.includes('customAnalyzer') && enhancedCustom.includes('transcript')) {
          customAnalyzerExample = enhancedCustom;
        }
      }
    } catch (error) {
      console.warn('Error enhancing examples with OpenAI:', error);
    }
  }
  
  // Generate intro text with AI if available
  let introText = packageJson.description;
  if (OPENAI_API_KEY) {
    try {
      const enhancedIntro = await callOpenAI(
        `Create a concise but compelling 1-2 sentence description for a package called "${packageJson.name}". ` +
        `It's described as: "${packageJson.description}". ` +
        `Make it engaging but technical, appropriate for a README introduction. ` +
        `Just respond with the text, no extra formatting or explanations.`
      );
      
      if (enhancedIntro && enhancedIntro.length > 20) {
        introText = enhancedIntro;
      }
    } catch (error) {
      console.warn('Error enhancing intro with OpenAI:', error);
    }
  }
  
  // Generate changes summary with AI if available
  let changesSummary = '';
  if (OPENAI_API_KEY && recentChanges.length > 0) {
    try {
      const enhancedChanges = await callOpenAI(
        `Based on these recent commits to a TypeScript package:
         ${recentChanges.map(c => `- ${c.message} (${c.hash})`).join('\n')}

` +
        `And these file changes:
         ${fileChanges.map(c => `- ${c.status} ${c.file}`).join('\n')}

` +
        `Create a concise "Recent Updates" section (3-5 bullet points) summarizing the key changes and improvements. ` +
        `Focus on user-facing changes and new features. Use markdown bullet points. ` +
        `Just respond with the formatted content, no title or extra text.`
      );
      
      if (enhancedChanges && enhancedChanges.includes('-')) {
        changesSummary = `
## Recent Updates

${enhancedChanges}
`;
      }
    } catch (error) {
      console.warn('Error generating changes summary with OpenAI:', error);
    }
  }
  
  // README template
  const readme = `# ${packageJson.name}

${introText}${changesSummary}

## What it does

1. **Monitors** text/transcript input from any source
2. **Analyzes** whether a response is needed (is the user done speaking?)
3. **Generates** intelligent responses using OpenAI or Anthropic

That's it. Simple and focused.

## Installation

\`\`\`bash
npm install ${packageJson.name}
\`\`\`

## Quick Start

\`\`\`javascript
${basicExample}
\`\`\`

## Core Concepts

### TranscriptMonitor

The main class that orchestrates everything:

- Receives transcript updates
- Decides when to respond (with debouncing)
- Generates responses
- Emits events

### TranscriptAnalyzer

Decides **when** to respond:

- Too short? Don't respond yet
- User still speaking? Wait
- Complete thought? Generate response

### ResponseGenerator

Generates **what** to respond:

- Uses OpenAI or Anthropic
- Maintains conversation history
- Configurable prompts and parameters

## Usage Examples

### With Deepgram

\`\`\`javascript
${deepgramExample}
\`\`\`

### With Web Speech API

\`\`\`javascript
const recognition = new webkitSpeechRecognition();

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  monitor.updateTranscript(transcript);
};
\`\`\`

### Custom Analysis Logic

\`\`\`javascript
${customAnalyzerExample}
\`\`\`

## Events

- \`transcriptChanged\` - New transcript received
- \`analysisComplete\` - Analysis finished (should we respond?)
- \`responseGenerated\` - Response ready
- \`error\` - Something went wrong

## API

### TranscriptMonitor

\`\`\`typescript
new TranscriptMonitor({
  storage: StorageInterface, // Optional custom storage
  analyzer: {
    provider: "openai" | "anthropic" | "custom",
    apiKey: string,
    model: string,
    minWords: number, // Minimum words before considering response
    maxSilenceMs: number, // Max silence duration to wait
    customAnalyzer: Function, // Your own analysis logic
    name: string, // Optional name for identifying when addressed directly
    role: string, // Optional role to influence analysis behavior
    contextFile: string, // Optional path to context file
  },
  generator: {
    provider: "openai" | "anthropic" | "custom",
    apiKey: string,
    model: string,
    systemPrompt: string,
    temperature: number,
    maxTokens: number,
    customGenerator: Function, // Your own generation logic
    name: string, // Optional name from analyzer settings
    role: string, // Optional role from analyzer settings
    contextFile: string, // Optional context file from analyzer settings
  },
  debounceMs: number, // Debounce delay (default: 1000ms)
});
\`\`\`

### Methods

- \`start()\` - Start monitoring
- \`stop()\` - Stop monitoring
- \`updateTranscript(text)\` - Send new transcript
- \`getHistory()\` - Get conversation history
- \`clearHistory()\` - Clear conversation history

## Storage

By default, uses in-memory storage. You can also use:

\`\`\`javascript
import { BrowserStorage } from "${packageJson.name}";

// Uses localStorage/sessionStorage
const monitor = new TranscriptMonitor({
  storage: new BrowserStorage(localStorage),
});
\`\`\`

Or implement your own:

\`\`\`typescript
interface StorageInterface {
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  subscribe?(key: string, callback: Function): Function;
}
\`\`\`

## Why This Package?

- **Simple**: Just monitors transcripts and generates responses
- **Flexible**: Works with any transcript source
- **Focused**: Does one thing well
- **Configurable**: Use your own analysis/generation logic

## License

${packageJson.license}
`;

  return readme;
}

// Main function
async function main() {
  try {
    // Generate new README content
    const readmeContent = await generateReadme();
    
    // Write to file
    fs.writeFileSync(README_PATH, readmeContent);
    
    console.log('README.md has been successfully updated!');
  } catch (error) {
    console.error('Error generating README:', error);
    process.exit(1);
  }
}

// Execute main function
main();
