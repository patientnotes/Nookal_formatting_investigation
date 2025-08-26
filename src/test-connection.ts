#!/usr/bin/env node

import { createNookalClientFromEnv } from './nookal-client.js';
import { loadEnvFile } from './utils.js';

/**
 * Simple test script to verify API connection and credentials
 */
async function testConnection(): Promise<void> {
  try {
    // Load environment variables
    loadEnvFile();

    console.log('🔧 Testing Nookal API Connection\n');

    // Check environment variables
    const apiKey = process.env.NOOKAL_API_KEY;
    const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

    console.log('Environment Check:');
    console.log(`• API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : 'MISSING'}`);
    console.log(`• Base URL: ${baseUrl}`);
    console.log('');

    if (!apiKey) {
      console.error('❌ NOOKAL_API_KEY is not set in environment variables');
      console.log('💡 Make sure to:');
      console.log('   1. Copy .env.example to .env');
      console.log('   2. Add your API key to the .env file');
      process.exit(1);
    }

    // Create client
    const client = createNookalClientFromEnv();

    // Test simple API call
    console.log('🌐 Testing API connection...');

    try {
      // Make a simple request to get patients with limit 1
      const patients = await client.getPatients({ limit: 1 });
      console.log('✅ Connection successful!');
      console.log(`📊 Response: Found ${patients.length} patients`);

      if (patients.length > 0) {
        const patient = patients[0];
        console.log(`👤 Sample patient: ${patient.FirstName || 'N/A'} ${patient.LastName || 'N/A'} (ID: ${patient.ID})`);
      }

    } catch (error) {
      console.error('❌ API call failed:', error instanceof Error ? error.message : error);
      console.log('\n🔍 Troubleshooting tips:');
      console.log('• Verify your API key is correct and active');
      console.log('• Check if your IP address is whitelisted (if required)');
      console.log('• Ensure you have the correct base URL');
      console.log('• Try accessing the API directly in a browser or Postman');
    }

  } catch (error) {
    console.error('💥 Setup error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Nookal API Connection Test

Usage:
  npm run dev src/test-connection.ts

This script will:
  • Check environment variables
  • Test basic API connectivity
  • Provide troubleshooting tips if connection fails

Make sure you have:
  1. Copied .env.example to .env
  2. Added your NOOKAL_API_KEY to the .env file
  3. Optionally set NOOKAL_BASE_URL (defaults to production)
`);
} else {
  testConnection().catch(console.error);
}
