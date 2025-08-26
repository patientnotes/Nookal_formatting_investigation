#!/usr/bin/env node

import { loadEnvFile } from './utils.js';

/**
 * Debug script to see raw API responses for treatment notes
 * This will help us understand why notes are being added but not retrieved
 */
async function debugTreatmentNotes(): Promise<void> {
  loadEnvFile();

  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

  if (!apiKey) {
    console.error('❌ NOOKAL_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔍 Debug Treatment Notes API Responses\n');
  console.log(`Testing with API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  // Test 1: Raw getTreatmentNotes request
  console.log('1️⃣ Testing getTreatmentNotes with patient_id=1 (RAW)...');
  try {
    const url1 = `${baseUrl}/getTreatmentNotes?api_key=${encodeURIComponent(apiKey)}&patient_id=1`;
    console.log(`URL: ${url1}`);

    const response1 = await fetch(url1);
    const responseText1 = await response1.text();

    console.log(`Status: ${response1.status} ${response1.statusText}`);
    console.log(`Raw Response: ${responseText1}`);

    try {
      const parsed1 = JSON.parse(responseText1);
      console.log('Parsed Response:');
      console.log(JSON.stringify(parsed1, null, 2));
    } catch (e) {
      console.log('Failed to parse as JSON');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Test 2: Raw getAllTreatmentNotes request
  console.log('2️⃣ Testing getAllTreatmentNotes (RAW)...');
  try {
    const url2 = `${baseUrl}/getAllTreatmentNotes?api_key=${encodeURIComponent(apiKey)}`;
    console.log(`URL: ${url2}`);

    const response2 = await fetch(url2);
    const responseText2 = await response2.text();

    console.log(`Status: ${response2.status} ${response2.statusText}`);
    console.log(`Raw Response: ${responseText2}`);

    try {
      const parsed2 = JSON.parse(responseText2);
      console.log('Parsed Response:');
      console.log(JSON.stringify(parsed2, null, 2));
    } catch (e) {
      console.log('Failed to parse as JSON');
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
  console.log('\n' + '='.repeat(80) + '\n');

  // Test 3: Test different parameter variations
  console.log('3️⃣ Testing parameter variations...');

  const testParams = [
    { name: 'patientID (our current)', params: 'patient_id=1' },
    { name: 'patientId (camelCase)', params: 'patientId=1' },
    { name: 'PatientID (PascalCase)', params: 'PatientID=1' },
    { name: 'id', params: 'id=1' },
    { name: 'with page_length', params: 'patient_id=1&page_length=10' },
    { name: 'with limit', params: 'patient_id=1&limit=10' }
  ];

  for (const test of testParams) {
    try {
      console.log(`Testing ${test.name}: ${test.params}`);
      const url = `${baseUrl}/getTreatmentNotes?api_key=${encodeURIComponent(apiKey)}&${test.params}`;

      const response = await fetch(url);
      const responseText = await response.text();

      console.log(`  Status: ${response.status}`);
      console.log(`  Response length: ${responseText.length} chars`);

      if (responseText.length < 500) {
        console.log(`  Response: ${responseText}`);
      } else {
        console.log(`  Response preview: ${responseText.substring(0, 200)}...`);
      }

    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    console.log('');
  }

  console.log('='.repeat(80) + '\n');

  // Test 4: Add a note and immediately try to retrieve it
  console.log('4️⃣ Adding a note and immediately trying to retrieve it...');

  try {
    // Add note
    console.log('Adding treatment note...');
    const addUrl = `${baseUrl}/addTreatmentNote`;
    const addData = new URLSearchParams({
      api_key: apiKey,
      patient_id: '1',
      case_id: '1',
      practitioner_id: '1',
      date: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ''),
      notes: 'Debug test note added at ' + new Date().toISOString()
    });

    const addResponse = await fetch(addUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: addData
    });

    const addResponseText = await addResponse.text();
    console.log(`Add response: ${addResponseText}`);

    // Wait a moment
    console.log('Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to retrieve immediately
    console.log('Attempting to retrieve notes immediately after adding...');
    const retrieveUrl = `${baseUrl}/getTreatmentNotes?api_key=${encodeURIComponent(apiKey)}&patient_id=1`;
    const retrieveResponse = await fetch(retrieveUrl);
    const retrieveResponseText = await retrieveResponse.text();

    console.log(`Retrieve response: ${retrieveResponseText}`);

  } catch (error) {
    console.error('Add/retrieve test failed:', error);
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Test 5: Check if notes are in a different endpoint structure
  console.log('5️⃣ Checking alternative endpoints...');

  const alternativeEndpoints = [
    'getPatientTreatmentNotes',
    'getTreatmentNote', // singular
    'getClinicalNotes',
    'getPatientNotes',
    'getNotes'
  ];

  for (const endpoint of alternativeEndpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const url = `${baseUrl}/${endpoint}?api_key=${encodeURIComponent(apiKey)}&patient_id=1`;

      const response = await fetch(url);
      const responseText = await response.text();

      console.log(`  Status: ${response.status}`);
      if (response.status === 404) {
        console.log('  Endpoint does not exist');
      } else {
        console.log(`  Response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      }

    } catch (error) {
      console.log(`  Error: ${error}`);
    }
    console.log('');
  }

  console.log('='.repeat(80) + '\n');

  // Test 6: Check the data structure we expect vs reality
  console.log('6️⃣ Analyzing expected vs actual data structure...');
  console.log('Expected structure based on our client:');
  console.log(`{
  "status": "success",
  "data": {
    "api_call": "getTreatmentNotes",
    "results": {
      "treatmentNotes": [...]
    }
  }
}`);

  console.log('\nLet\'s see what we actually get:');
  try {
    const url = `${baseUrl}/getTreatmentNotes?api_key=${encodeURIComponent(apiKey)}&patient_id=1&page_length=50`;
    const response = await fetch(url);
    const responseText = await response.text();

    if (response.ok) {
      const parsed = JSON.parse(responseText);
      console.log('Actual structure:');
      console.log(JSON.stringify(parsed, null, 2));

      // Analyze the structure
      console.log('\nStructure analysis:');
      console.log(`- Status: ${parsed.status}`);
      console.log(`- Has data: ${!!parsed.data}`);
      if (parsed.data) {
        console.log(`- API call: ${parsed.data.api_call}`);
        console.log(`- Has results: ${!!parsed.data.results}`);
        if (parsed.data.results) {
          console.log(`- Results keys: ${Object.keys(parsed.data.results)}`);
          // Look for treatment notes in different keys
          for (const [key, value] of Object.entries(parsed.data.results)) {
            if (Array.isArray(value)) {
              console.log(`- ${key}: Array with ${value.length} items`);
            } else {
              console.log(`- ${key}: ${typeof value}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Structure analysis failed:', error);
  }

  console.log('\n🔍 Debug complete! Check the output above for clues about the treatment notes structure.');
}

// Run the debug script
debugTreatmentNotes().catch(console.error);
