#!/usr/bin/env node

import { createNookalClientFromEnv } from './nookal-client.js';
import { loadEnvFile } from './utils.js';

/**
 * Troubleshooting script for Nookal API issues
 * Helps diagnose common problems and provides solutions
 */
async function troubleshoot(): Promise<void> {
  try {
    loadEnvFile();

    console.log('🔍 Nookal API Troubleshooting Guide\n');

    // Check environment setup
    await checkEnvironment();

    // Check API connectivity
    await checkApiConnectivity();

    // Test specific error codes
    await testErrorCodes();

    // Provide solutions
    provideSolutions();

  } catch (error) {
    console.error('💥 Troubleshooting script error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function checkEnvironment(): Promise<void> {
  console.log('📋 Environment Check\n');

  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

  console.log(`✓ API Key: ${apiKey ? `${apiKey.substring(0, 8)}...` : '❌ MISSING'}`);
  console.log(`✓ Base URL: ${baseUrl}`);
  console.log(`✓ Node.js Version: ${process.version}\n`);

  if (!apiKey) {
    console.error('❌ NOOKAL_API_KEY is not set!');
    console.log('💡 Solution: Create a .env file with your API key\n');
  }
}

async function checkApiConnectivity(): Promise<void> {
  console.log('🌐 API Connectivity Test\n');

  try {
    const client = createNookalClientFromEnv();

    // Test a simple endpoint
    console.log('Testing getPatients endpoint...');
    await client.getPatients({ limit: 1 });
    console.log('✅ API connection successful!\n');

  } catch (error) {
    console.log('❌ API connection failed');
    if (error instanceof Error) {
      console.log(`Error: ${error.message}\n`);
    }
  }
}

async function testErrorCodes(): Promise<void> {
  console.log('🚨 Common Nookal Error Codes\n');

  const errorCodes = {
    'L003': {
      description: 'Unable to retrieve locations',
      possibleCauses: [
        'Invalid API key',
        'No locations configured in your Nookal account',
        'Insufficient permissions'
      ]
    },
    'L004': {
      description: 'Unable to retrieve practitioners',
      possibleCauses: [
        'Invalid API key',
        'No practitioners configured in your Nookal account',
        'Insufficient permissions'
      ]
    },
    'L005': {
      description: 'Unable to retrieve patients',
      possibleCauses: [
        'Invalid API key',
        'No patients in your Nookal account',
        'Insufficient permissions',
        'Invalid patient ID specified'
      ]
    },
    'L006': {
      description: 'Unable to retrieve appointments',
      possibleCauses: [
        'Invalid API key',
        'No appointments in specified date range',
        'Invalid date format',
        'Insufficient permissions'
      ]
    },
    'L007': {
      description: 'Unable to retrieve treatment notes',
      possibleCauses: [
        'Invalid API key',
        'Invalid patient/case/practitioner ID',
        'Required fields missing',
        'Insufficient permissions'
      ]
    }
  };

  for (const [code, info] of Object.entries(errorCodes)) {
    console.log(`${code}: ${info.description}`);
    console.log('   Possible causes:');
    for (const cause of info.possibleCauses) {
      console.log(`   • ${cause}`);
    }
    console.log('');
  }
}

function provideSolutions(): void {
  console.log('💡 Troubleshooting Solutions\n');

  const solutions = [
    {
      problem: 'Getting L003, L004, L005, L006, or L007 errors',
      solutions: [
        'Verify your API key is correct and active',
        'Check if your Nookal account has data in the respective areas',
        'Ensure your API key has sufficient permissions',
        'Contact Nookal support to verify API access'
      ]
    },
    {
      problem: 'HTTP 404 errors',
      solutions: [
        'Check the endpoint URL is correct',
        'Verify the API version in the base URL',
        'Some endpoints may not be available in your Nookal plan'
      ]
    },
    {
      problem: 'Authentication issues',
      solutions: [
        'Double-check your API key in the .env file',
        'Ensure there are no extra spaces or characters',
        'Try regenerating your API key in Nookal settings',
        'Check if your IP address needs to be whitelisted'
      ]
    },
    {
      problem: 'Empty results when expecting data',
      solutions: [
        'Verify you have data in your Nookal account',
        'Check date ranges for appointment queries',
        'Ensure you\'re using valid IDs for specific lookups',
        'Try broader search criteria'
      ]
    },
    {
      problem: 'Treatment note issues',
      solutions: [
        'Ensure patient, case, and practitioner IDs are valid',
        'Check date format is YYYY-MM-DD HH:mm:ss',
        'Verify the case belongs to the specified patient',
        'Make sure the practitioner has access to the case'
      ]
    }
  ];

  for (const item of solutions) {
    console.log(`🔧 ${item.problem}:`);
    for (const solution of item.solutions) {
      console.log(`   • ${solution}`);
    }
    console.log('');
  }

  console.log('📞 Additional Help\n');
  console.log('• Nookal API Documentation: https://nookal.com/api');
  console.log('• Nookal Support: https://support.nookal.com');
  console.log('• Check Nookal status page for API outages');
  console.log('• Verify your account plan includes API access');
}

async function testSpecificEndpoint(endpoint: string): Promise<void> {
  console.log(`🧪 Testing ${endpoint} endpoint...\n`);

  try {
    const client = createNookalClientFromEnv();

    switch (endpoint) {
      case 'patients':
        const patients = await client.getPatients({ limit: 1 });
        console.log(`✅ Found ${patients.length} patients`);
        break;

      case 'practitioners':
        const practitioners = await client.getPractitioners();
        console.log(`✅ Found ${practitioners.length} practitioners`);
        break;

      case 'locations':
        const locations = await client.getLocations();
        console.log(`✅ Found ${locations.length} locations`);
        break;

      case 'appointments':
        const appointments = await client.getAppointments({ limit: 1 });
        console.log(`✅ Found ${appointments.length} appointments`);
        break;

      default:
        console.log('❌ Unknown endpoint');
    }

  } catch (error) {
    console.log(`❌ ${endpoint} test failed:`);
    if (error instanceof Error) {
      console.log(`   ${error.message}`);
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔍 Nookal API Troubleshooting Tool

Usage:
  npm run dev src/troubleshoot.ts                  # Run full troubleshooting
  npm run dev src/troubleshoot.ts --test patients  # Test specific endpoint

Available test endpoints:
  • patients
  • practitioners
  • locations
  • appointments

This tool helps diagnose:
  • Environment setup issues
  • API connectivity problems
  • Authentication errors
  • Common error codes
  • Data access issues
`);
} else if (args.includes('--test')) {
  const endpoint = args[args.indexOf('--test') + 1];
  if (endpoint) {
    loadEnvFile();
    testSpecificEndpoint(endpoint).catch(console.error);
  } else {
    console.error('❌ Please specify an endpoint to test');
  }
} else {
  troubleshoot().catch(console.error);
}
