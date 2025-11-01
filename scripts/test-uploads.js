#!/usr/bin/env node

/**
 * Upload Testing Utility
 *
 * This script helps test file uploads with different file sizes.
 * It generates test files and can optionally upload them to test endpoints.
 *
 * Usage:
 *   node scripts/test-uploads.js --help                    Show help
 *   node scripts/test-uploads.js --generate                Generate test files
 *   node scripts/test-uploads.js --generate --sizes 1,10,50,200  Generate specific sizes
 *   node scripts/test-uploads.js --cleanup                 Remove test files
 *   node scripts/test-uploads.js --test-video              Test video upload endpoint (requires auth token)
 *   node scripts/test-uploads.js --test-audio              Test audio upload endpoint (requires auth token)
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Configuration
const TEST_DIR = path.join(__dirname, '..', 'test-files');
const DEFAULT_SIZES = {
  audio: [1, 5, 25, 50], // MB - test audio limits (50MB max)
  video: [1, 50, 100, 200, 500], // MB - test video sizes (direct upload <200MB, TUS >200MB)
};

// Utility functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function createTestFile(filePath, sizeInMB) {
  return new Promise((resolve, reject) => {
    const sizeInBytes = sizeInMB * 1024 * 1024;
    let written = 0;
    const chunkSize = 1024 * 1024; // 1MB chunks

    const stream = fs.createWriteStream(filePath);

    stream.on('error', reject);
    stream.on('finish', () => {
      console.log(`✓ Created ${path.basename(filePath)} (${formatBytes(sizeInBytes)})`);
      resolve();
    });

    // Write data in chunks
    const writeChunk = () => {
      const remainingBytes = sizeInBytes - written;
      const currentChunkSize = Math.min(chunkSize, remainingBytes);

      if (currentChunkSize <= 0) {
        stream.end();
        return;
      }

      // Create deterministic but varied data for more realistic testing
      const buffer = Buffer.alloc(currentChunkSize);
      for (let i = 0; i < currentChunkSize; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }

      written += currentChunkSize;
      const percent = Math.round((written / sizeInBytes) * 100);
      process.stdout.write(`\r  Progress: ${percent}% (${formatBytes(written)}/${formatBytes(sizeInBytes)})`);

      if (!stream.write(buffer)) {
        stream.once('drain', writeChunk);
      } else {
        writeChunk();
      }
    };

    writeChunk();
  });
}

async function generateTestFiles(type = 'all', customSizes = null) {
  // Create test directory
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  const sizes = customSizes || (type === 'audio' ? DEFAULT_SIZES.audio : type === 'video' ? DEFAULT_SIZES.video : [...DEFAULT_SIZES.audio, ...DEFAULT_SIZES.video]);
  const ext = type === 'audio' ? 'mp3' : 'mp4';

  console.log(`\n📁 Generating ${type} test files in ${TEST_DIR}...\n`);

  for (const size of sizes) {
    const fileName = `test-${size}mb.${ext}`;
    const filePath = path.join(TEST_DIR, fileName);

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      console.log(`⊘ ${fileName} already exists (${formatBytes(stat.size)})`);
      continue;
    }

    await createTestFile(filePath, size, ext);
    console.log('');
  }

  console.log(`\n✅ Test files ready in: ${TEST_DIR}`);
  console.log('\nFile sizes summary:');

  const files = fs.readdirSync(TEST_DIR).sort();
  for (const file of files) {
    const filePath = path.join(TEST_DIR, file);
    const stat = fs.statSync(filePath);
    const isBelowThreshold = type === 'audio' ? stat.size <= 50 * 1024 * 1024 : stat.size <= 200 * 1024 * 1024;
    const uploadMethod = type === 'audio'
      ? (isBelowThreshold ? '✓ Direct upload (Supabase)' : '✗ Exceeds 50MB limit')
      : (isBelowThreshold ? '✓ Direct POST (Cloudflare)' : '✓ TUS resumable (Cloudflare)');

    console.log(`  ${file.padEnd(25)} ${formatBytes(stat.size).padEnd(10)} ${uploadMethod}`);
  }
}

async function cleanupTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    console.log('No test files directory found.');
    return;
  }

  const files = fs.readdirSync(TEST_DIR);
  if (files.length === 0) {
    console.log('Test directory is empty.');
    return;
  }

  console.log(`\n🗑️  Removing ${files.length} test file(s)...\n`);
  for (const file of files) {
    const filePath = path.join(TEST_DIR, file);
    fs.unlinkSync(filePath);
    console.log(`✓ Deleted ${file}`);
  }

  fs.rmdirSync(TEST_DIR);
  console.log(`\n✅ Cleanup complete`);
}

function showHelp() {
  console.log(`
📋 Upload Testing Utility

Usage: node scripts/test-uploads.js [command] [options]

Commands:
  --generate              Generate test files for upload testing
  --cleanup              Delete all generated test files
  --test-video [path]    Test Cloudflare Stream video upload (requires auth)
  --test-audio [path]    Test Supabase Storage audio upload (requires auth)
  --list                 List available test files
  --help                 Show this help message

Generate Options:
  --sizes SIZE1,SIZE2    Comma-separated sizes in MB (e.g., --sizes 1,10,50,200)
  --audio                Generate audio test files only
  --video                Generate video test files only

Examples:
  # Generate default test files
  node scripts/test-uploads.js --generate

  # Generate specific audio sizes
  node scripts/test-uploads.js --generate --audio --sizes 5,25,50

  # Generate large video files for TUS testing
  node scripts/test-uploads.js --generate --video --sizes 300,500,1000

  # Clean up all test files
  node scripts/test-uploads.js --cleanup

  # List available test files
  node scripts/test-uploads.js --list

Testing:
  For upload testing, you'll need to:
  1. Be logged into the development server (http://localhost:3000)
  2. Extract auth token from browser DevTools (Application → Cookies → sb-auth-token)
  3. Test endpoints with the token in the Authorization header

Note: Upload testing with --test-video/--test-audio requires local dev server running
  `);
}

function listTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    console.log('No test files directory found. Run --generate to create test files.');
    return;
  }

  const files = fs.readdirSync(TEST_DIR).sort((a, b) => {
    const sizeA = fs.statSync(path.join(TEST_DIR, a)).size;
    const sizeB = fs.statSync(path.join(TEST_DIR, b)).size;
    return sizeA - sizeB;
  });

  if (files.length === 0) {
    console.log('Test files directory is empty.');
    return;
  }

  console.log(`\n📁 Test Files in ${TEST_DIR}:\n`);
  for (const file of files) {
    const filePath = path.join(TEST_DIR, file);
    const stat = fs.statSync(filePath);
    const isAudio = file.endsWith('.mp3');
    const isVideo = file.endsWith('.mp4');

    let uploadMethod = '?';
    if (isAudio) {
      uploadMethod = stat.size <= 50 * 1024 * 1024 ? '✓ Direct (Supabase)' : '✗ Too large (>50MB)';
    } else if (isVideo) {
      uploadMethod = stat.size <= 200 * 1024 * 1024 ? '✓ Direct POST' : '✓ TUS resumable';
    }

    console.log(`  ${file.padEnd(30)} ${formatBytes(stat.size).padEnd(12)} ${uploadMethod}`);
  }
  console.log('');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  if (args.includes('--generate')) {
    const isAudio = args.includes('--audio');
    const isVideo = args.includes('--video');
    const type = isAudio ? 'audio' : isVideo ? 'video' : 'all';

    // Parse custom sizes if provided
    const sizesIdx = args.indexOf('--sizes');
    let customSizes = null;
    if (sizesIdx !== -1 && sizesIdx + 1 < args.length) {
      customSizes = args[sizesIdx + 1].split(',').map(s => parseInt(s.trim())).filter(s => s > 0);
      if (customSizes.length === 0) {
        console.error('❌ Invalid sizes provided');
        return;
      }
    }

    await generateTestFiles(type, customSizes);
  } else if (args.includes('--cleanup')) {
    await cleanupTestFiles();
  } else if (args.includes('--list')) {
    listTestFiles();
  } else if (args.includes('--test-video')) {
    console.log('\n🎥 Video Upload Testing');
    console.log('Currently requires manual testing via browser DevTools');
    console.log('For automated testing, configure auth token as environment variable\n');
  } else if (args.includes('--test-audio')) {
    console.log('\n🎵 Audio Upload Testing');
    console.log('Currently requires manual testing via browser DevTools');
    console.log('For automated testing, configure auth token as environment variable\n');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
