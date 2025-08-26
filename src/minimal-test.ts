#!/usr/bin/env node

import { loadEnvFile } from './utils.js';

/**
 * Minimal API test to try different parameter combinations and endpoints
 * This helps identify what actually works with your specific API key
 */

async function minimalTest(): Promise<void> {
  loadEnvFile();

  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

  if (!apiKey) {
    console.error('❌ NOOKAL_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🧪 Minimal Nookal API Test\n');
  console.log(`Testing with API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  const tests = [
    // Try patients with no parameters
    {
      name: 'Patients (no params)',
      endpoint: 'getPatients',
      params: {}
    },
    // Try patients with minimal params
    {
      name: 'Patients (with limit)',
      endpoint: 'getPatients',
      params: { limit: 1 }
    },
    // Try appointments with no params
    {
      name: 'Appointments (no params)',
      endpoint: 'getAppointments',
      params: {}
    },
    // Try appointments with minimal date range
    {
      name: 'Appointments (minimal date)',
      endpoint: 'getAppointments',
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    },
    // Try locations
    {
      name: 'Locations',
      endpoint: 'getLocations',
      params: {}
    },
    // Try practitioners
    {
      name: 'Practitioners',
      endpoint: 'getPractitioners',
      params: {}
    },
    // Try a different date format for appointments
    {
      name: 'Appointments (different date format)',
      endpoint: 'getAppointments',
      params: {
        startDate: '2024-01-01 00:00:00',
        endDate: '2024-12-31 23:59:59'
      }
    },
    // Try without date restrictions at all
    {
      name: 'Appointments (very broad)',
      endpoint: 'getAppointments',
      params: {
        startDate: '2020-01-01',
        endDate: '2030-12-31',
        limit: 1
      }
    }
  ];

  let successCount = 0;
  const results = [];

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);

      const url = new URL(`${baseUrl}/${test.endpoint}`);
      url.searchParams.set('api_key', apiKey);

      // Add test parameters
      for (const [key, value] of Object.entries(test.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      }

      console.log(`   URL: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nookal-Minimal-Test/1.0.0'
        }
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawResponse: responseText };
      }

      if (response.ok) {
        if (data.status === 'success') {
          console.log(`   ✅ SUCCESS! Data length: ${Array.isArray(data.data) ? data.data.length : 'N/A'}`);
          console.log(`   📊 Response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
          successCount++;
          results.push({ test: test.name, status: 'SUCCESS', data });
        } else if (data.status === 'failure') {
          console.log(`   ❌ API Error: ${data.details?.errorMessage || 'Unknown'} (${data.details?.errorCode || 'N/A'})`);
          results.push({ test: test.name, status: 'API_ERROR', error: data.details });
        } else {
          console.log(`   ⚠️ Unexpected response: ${JSON.stringify(data).substring(0, 100)}...`);
          results.push({ test: test.name, status: 'UNEXPECTED', data });
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
        results.push({ test: test.name, status: 'HTTP_ERROR', error: `${response.status} ${response.statusText}` });
      }

    } catch (error) {
      console.log(`   💥 Request failed: ${error instanceof Error ? error.message : error}`);
      results.push({ test: test.name, status: 'REQUEST_FAILED', error: error instanceof Error ? error.message : String(error) });
    }

    console.log('');

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('📋 Test Summary:');
  console.log(`• Total tests: ${tests.length}`);
  console.log(`• Successful: ${successCount}`);
  console.log(`• Failed: ${tests.length - successCount}`);
  console.log('');

  // Show any successful responses in detail
  const successful = results.filter(r => r.status === 'SUCCESS');
  if (successful.length > 0) {
    console.log('🎉 Successful Responses:');
    for (const result of successful) {
      console.log(`\n${result.test}:`);
      console.log(JSON.stringify(result.data, null, 2));
    }
  }

  // Show error patterns
  const errors = results.filter(r => r.status === 'API_ERROR');
  if (errors.length > 0) {
    console.log('\n🚨 Error Patterns:');
    const errorCounts = errors.reduce((acc: Record<string, number>, curr) => {
      const errorCode = curr.error?.errorCode || 'UNKNOWN';
      acc[errorCode] = (acc[errorCode] || 0) + 1;
      return acc;
    }, {});

    for (const [code, count] of Object.entries(errorCounts)) {
      console.log(`• ${code}: ${count} occurrences`);
    }
  }

  console.log('\n💡 Next Steps:');
  if (successCount > 0) {
    console.log('• Some endpoints are working! Use the successful ones as a starting point.');
    console.log('• Extract real IDs from successful responses to test other endpoints.');
  } else {
    console.log('• No endpoints returned success - likely an API key permission issue.');
    console.log('• Contact Nookal support to verify API access and permissions.');
    console.log('• Check if your account plan includes API access.');
    console.log('• Ensure your Nookal account has some basic data (patients, appointments, etc.).');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Minimal Nookal API Test

Usage:
  npx tsx src/minimal-test.ts

This script tests various endpoint and parameter combinations to identify:
  • Which endpoints your API key can access
  • What parameter formats work
  • Whether your account has data
  • Specific error patterns

The goal is to find at least one working endpoint that returns real data.
`);
} else {
  minimalTest().catch(console.error);
}
