#!/usr/bin/env node

/**
 * Check User Email Statistics
 * 
 * Queries the database to see how many users have email addresses.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local file not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      env[key.trim()] = value.trim();
    }
  });

  return env;
}

async function main() {
  const env = loadEnv();

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('📊 Querying user email statistics...\n');

  const { data, error } = await supabase
    .from('users')
    .select('email, name');

  if (error) {
    console.error('❌ Error querying database:', error.message);
    process.exit(1);
  }

  const total = data.length;
  const withEmail = data.filter(u => u.email && u.email.trim().length > 0).length;
  const withoutEmail = total - withEmail;
  const percentage = total > 0 ? ((withEmail / total) * 100).toFixed(1) : '0.0';

  console.log('📈 Results:');
  console.log(`   Total users: ${total}`);
  console.log(`   Users with email: ${withEmail}`);
  console.log(`   Users without email: ${withoutEmail}`);
  console.log(`   Percentage with email: ${percentage}%`);

  if (withoutEmail > 0) {
    console.log('\n⚠️  Users without email addresses:');
    const usersWithoutEmail = data.filter(u => !u.email || u.email.trim().length === 0);
    usersWithoutEmail.forEach(user => {
      console.log(`   - ${user.name || 'Unknown'} (ID: ${user.id})`);
    });
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});










