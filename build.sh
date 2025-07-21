#!/bin/bash
# build.sh - Simple build script for transcript-monitor-agent

echo "🔨 Building transcript-monitor-agent..."

# Clean
echo "🧹 Cleaning dist folder..."
rm -rf dist

# Build
echo "📦 Building TypeScript..."
npx tsc

# Verify
if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist folder not created"
  exit 1
fi

echo "✅ Build complete!"
echo ""
echo "Files created:"
ls -la dist/

# Optional: Run tests
read -p "Run tests? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  npm test
fi

# Optional: Publish
echo ""
echo "To publish to npm:"
echo "  1. Make sure you're logged in: npm login"
echo "  2. Update version in package.json"
echo "  3. Run: npm publish"
echo ""
echo "To test locally:"
echo "  1. Run: npm link"
echo "  2. In another project: npm link transcript-monitor-agent"