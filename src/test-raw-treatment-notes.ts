#!/usr/bin/env node

import { loadEnvFile } from './nookal-client';

/**
 * Raw API test to see the actual treatment notes response structure
 * This bypasses our client to see exactly what Nookal returns
 */
async function testRawTreatmentNotesAPI(): Promise<void> {
  try {
    loadEnvFile();

    const apiKey = process.env.NOOKAL_API_KEY;
    const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

    if (!apiKey) {
      console.error('❌ NOOKAL_API_KEY not found in environment');
      process.exit(1);
    }

    console.log('🔍 Raw Treatment Notes API Testing\n');
    console.log(`API Key: ${apiKey.substring(0, 8)}...`);
    console.log(`Base URL: ${baseUrl}\n`);

    // First, let's get a patient ID from appointments
    console.log('1️⃣ Getting patient ID from appointments...');
    const appointmentsUrl = new URL(`${baseUrl}/getAppointments`);
    appointmentsUrl.searchParams.set('api_key', apiKey);
    appointmentsUrl.searchParams.set('limit', '1');

    const appointmentsResponse = await fetch(appointmentsUrl.toString());
    const appointmentsData = await appointmentsResponse.json();

    if (!appointmentsData.data?.results?.appointments?.[0]) {
      console.error('❌ No appointments found');
      return;
    }

    const patientId = appointmentsData.data.results.appointments[0].patientID;
    const caseId = appointmentsData.data.results.appointments[0].caseID;
    console.log(`✅ Found patient ID: ${patientId}, case ID: ${caseId}\n`);

    // Test 1: getTreatmentNotes with patient_id
    console.log('2️⃣ Testing getTreatmentNotes endpoint...');
    const treatmentNotesUrl = new URL(`${baseUrl}/getTreatmentNotes`);
    treatmentNotesUrl.searchParams.set('api_key', apiKey);
    treatmentNotesUrl.searchParams.set('patient_id', patientId);

    console.log(`URL: ${treatmentNotesUrl.toString()}`);

    const treatmentNotesResponse = await fetch(treatmentNotesUrl.toString());
    const treatmentNotesText = await treatmentNotesResponse.text();

    console.log('Raw Response:');
    console.log(treatmentNotesText);

    try {
      const treatmentNotesData = JSON.parse(treatmentNotesText);
      console.log('\nParsed Response:');
      console.log(JSON.stringify(treatmentNotesData, null, 2));

      if (treatmentNotesData.data?.results) {
        console.log('\nResults structure:');
        console.log(Object.keys(treatmentNotesData.data.results));
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 2: getAllTreatmentNotes
    console.log('3️⃣ Testing getAllTreatmentNotes endpoint...');
    const allTreatmentNotesUrl = new URL(`${baseUrl}/getAllTreatmentNotes`);
    allTreatmentNotesUrl.searchParams.set('api_key', apiKey);
    allTreatmentNotesUrl.searchParams.set('page_length', '5');

    console.log(`URL: ${allTreatmentNotesUrl.toString()}`);

    const allTreatmentNotesResponse = await fetch(allTreatmentNotesUrl.toString());
    const allTreatmentNotesText = await allTreatmentNotesResponse.text();

    console.log('Raw Response:');
    console.log(allTreatmentNotesText);

    try {
      const allTreatmentNotesData = JSON.parse(allTreatmentNotesText);
      console.log('\nParsed Response:');
      console.log(JSON.stringify(allTreatmentNotesData, null, 2));

      if (allTreatmentNotesData.data?.results) {
        console.log('\nResults structure:');
        console.log(Object.keys(allTreatmentNotesData.data.results));
      }
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 3: Add a treatment note and immediately try to retrieve it
    console.log('4️⃣ Adding a treatment note and checking response...');

    const addNoteUrl = new URL(`${baseUrl}/addTreatmentNote`);
    const addNoteData = new URLSearchParams({
      api_key: apiKey,
      patient_id: patientId,
      case_id: caseId,
      practitioner_id: '1',
      date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      notes: 'Raw API test note - checking response structure',
      appt_id: appointmentsData.data.results.appointments[0].ID
    });

    console.log(`URL: ${addNoteUrl.toString()}`);
    console.log(`Data: ${addNoteData.toString()}`);

    const addNoteResponse = await fetch(addNoteUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Nookal-Raw-Test/1.0.0'
      },
      body: addNoteData
    });

    const addNoteText = await addNoteResponse.text();
    console.log('\nAdd Note Raw Response:');
    console.log(addNoteText);

    try {
      const addNoteData = JSON.parse(addNoteText);
      console.log('\nAdd Note Parsed Response:');
      console.log(JSON.stringify(addNoteData, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse add note JSON response');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 4: Try to get the note we just added
    console.log('5️⃣ Checking for the note we just added...');

    // Wait a moment for the note to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));

    const checkNotesUrl = new URL(`${baseUrl}/getTreatmentNotes`);
    checkNotesUrl.searchParams.set('api_key', apiKey);
    checkNotesUrl.searchParams.set('patient_id', patientId);

    const checkNotesResponse = await fetch(checkNotesUrl.toString());
    const checkNotesText = await checkNotesResponse.text();

    console.log('Check Notes Raw Response:');
    console.log(checkNotesText);

    try {
      const checkNotesData = JSON.parse(checkNotesText);
      console.log('\nCheck Notes Parsed Response:');
      console.log(JSON.stringify(checkNotesData, null, 2));

      // Look for our note
      if (checkNotesData.data?.results) {
        console.log('\n🔍 Analyzing results structure...');
        const results = checkNotesData.data.results;

        for (const [key, value] of Object.entries(results)) {
          console.log(`Key: ${key}, Type: ${typeof value}, Length: ${Array.isArray(value) ? value.length : 'N/A'}`);

          if (Array.isArray(value) && value.length > 0) {
            console.log(`Sample ${key} item:`, JSON.stringify(value[0], null, 2));
          }
        }
      }
    } catch (parseError) {
      console.log('❌ Failed to parse check notes JSON response');
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Test 5: Try different parameter variations
    console.log('6️⃣ Testing parameter variations...');

    const parameterTests = [
      { name: 'With page parameter', params: { patient_id: patientId, page: '1' } },
      { name: 'With page_length parameter', params: { patient_id: patientId, page_length: '10' } },
      { name: 'With both page parameters', params: { patient_id: patientId, page: '1', page_length: '5' } },
    ];

    for (const test of parameterTests) {
      console.log(`\nTesting: ${test.name}`);

      const testUrl = new URL(`${baseUrl}/getTreatmentNotes`);
      testUrl.searchParams.set('api_key', apiKey);

      for (const [key, value] of Object.entries(test.params)) {
        testUrl.searchParams.set(key, value);
      }

      console.log(`URL: ${testUrl.toString()}`);

      try {
        const testResponse = await fetch(testUrl.toString());
        const testText = await testResponse.text();
        const testData = JSON.parse(testText);

        console.log('Status:', testData.status);
        if (testData.data?.results) {
          const results = testData.data.results;
          for (const [key, value] of Object.entries(results)) {
            if (Array.isArray(value)) {
              console.log(`${key}: ${value.length} items`);
            }
          }
        }
        if (testData.details) {
          console.log('Details:', testData.details);
        }
      } catch (error) {
        console.log('❌ Test failed:', error instanceof Error ? error.message : error);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🎉 Raw API testing complete!');
    console.log('\n💡 Key insights:');
    console.log('• Check the actual response structure above');
    console.log('• Look for treatment notes in different result keys');
    console.log('• Note any differences between endpoints');
    console.log('• Verify the data types and array structures');

  } catch (error) {
    console.error('💥 Raw API test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔍 Raw Treatment Notes API Test

Usage:
  npx tsx src/test-raw-
