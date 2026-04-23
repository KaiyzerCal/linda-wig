#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

console.log('\n╔══════════════════════════════════════╗');
console.log('║   Linda — WIG Chief of Staff         ║');
console.log('║   Setup                              ║');
console.log('╚══════════════════════════════════════╝\n');

// Create .env from example if not present
if (!fs.existsSync('.env')) {
  fs.copyFileSync('.env.example', '.env');
  console.log('✓ Created .env — fill in your keys before running npm start\n');
} else {
  console.log('✓ .env already exists\n');
}

// Install dependencies
console.log('Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('\n✓ Dependencies installed\n');
} catch (e) {
  console.error('✗ npm install failed:', e.message);
  process.exit(1);
}

// Print Supabase SQL
const sql = fs.readFileSync('supabase-schema.sql', 'utf8');
console.log('══════════════════════════════════════');
console.log('SUPABASE SETUP — Run this SQL:');
console.log('https://supabase.com/dashboard → SQL Editor');
console.log('══════════════════════════════════════\n');
console.log(sql);

// Verify .env is filled
console.log('══════════════════════════════════════');
console.log('NEXT STEPS');
console.log('══════════════════════════════════════');
console.log('1. Create a Supabase project at https://supabase.com');
console.log('2. Run the SQL above in the Supabase SQL Editor');
console.log('3. Run: SELECT id, name, role FROM principals;');
console.log('   Copy the UUIDs into BISHOP_UUID and CALVIN_UUID in .env');
console.log('4. Fill in ANTHROPIC_API_KEY and SUPABASE credentials in .env');
console.log('5. Run: npm start');
console.log('6. Open: http://localhost:3000\n');

const env = fs.readFileSync('.env', 'utf8');
const missing = ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']
  .filter(k => !env.match(new RegExp(`^${k}=.+`, 'm')));

if (missing.length) {
  console.log(`⚠ Still needed in .env: ${missing.join(', ')}\n`);
} else {
  console.log('✓ .env looks complete. Run npm start to bring Linda online.\n');
}
