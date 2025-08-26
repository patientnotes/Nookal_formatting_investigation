#!/usr/bin/env node

import { loadEnvFile } from './utils.js';

/**
 * Discovery script to find treatment notes endpoints
 * Tests various potential REST endpoints for treatment notes
 */

async function discoverTreatmentNotesEndpoints(): Promise<void> {
  loadEnvFile();

  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

  if (!apiKey) {
    console.error('❌ NOOKAL_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔍 Discovering Treatment Notes Endpoints\n');
  console.log(`Testing with API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  // Potential treatment notes endpoints to test
  const potentialEndpoints = [
    // Direct treatment note endpoints
    'getTreatmentNotes',
    'getClinicalNotes',
    'getPatientNotes',
    'getNotes',
    'getConsultationNotes',
    'getMedicalNotes',
    'getSessionNotes',

    // Case-related endpoints (treatment notes are often linked to cases)
    'getCases',
    'getPatientCases',
    'getCaseNotes',
    'getCaseHistory',

    // Consultation/session related
    'getConsultations',
    'getSessions',
    'getPatientHistory',

    // Invoice related (sometimes notes are in billing data)
    'getInvoices',
    'getInvoiceItems',

    // Appointment related (notes might be in appointment details)
    'getAppointmentDetails',
    'getAppointmentNotes',

    // Patient file related
    'getPatientFiles',
    'getPatientDocuments',
    'getPatientRecord',

    // Service/treatment related
    'getServices',
    'getTreatments',
    'getPatientServices'
  ];

  const successfulEndpoints = [];
  const errorPatterns: Record<string, number> = {};

  // Test each potential endpoint
  for (const endpoint of potentialEndpoints) {
    try {
      console.log(`🧪 Testing: ${endpoint}`);

      const url = new URL(`${baseUrl}/${endpoint}`);
      url.searchParams.set('api_key', apiKey);

      // Add some common parameters that might be needed
      if (endpoint.includes('Patient') || endpoint.includes('Case')) {
        url.searchParams.set('patientID', '1'); // Use the patient ID we know exists
      }

      if (endpoint.includes('Case')) {
        url.searchParams.set('caseID', '1'); // Use the case ID from appointments
      }

      if (endpoint.includes('Appointment')) {
        url.searchParams.set('appointmentID', '1');
      }

      console.log(`   URL: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Nookal-Treatment-Notes-Discovery/1.0.0'
        }
      });

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        data = { rawResponse: responseText.substring(0, 200) };
      }

      if (response.ok) {
        if (data.status === 'success') {
          console.log(`   ✅ SUCCESS!`);
          console.log(`   📊 Data structure: ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
          successfulEndpoints.push({
            endpoint,
            url: url.toString(),
            data: data
          });
        } else if (data.status === 'failure') {
          console.log(`   ❌ API Error: ${data.details?.errorMessage || 'Unknown'} (${data.details?.errorCode || 'N/A'})`);
          const errorCode = data.details?.errorCode || 'UNKNOWN';
          errorPatterns[errorCode] = (errorPatterns[errorCode] || 0) + 1;
        } else {
          console.log(`   ⚠️ Unexpected response: ${JSON.stringify(data).substring(0, 100)}...`);
        }
      } else {
        console.log(`   ❌ HTTP Error: ${response.status} ${response.statusText}`);
        if (response.status === 404) {
          console.log(`   💡 Endpoint doesn't exist`);
        }
      }

    } catch (error) {
      console.log(`   💥 Request failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log('');

    // Small delay to be respectful
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Summary
  console.log('📋 Discovery Summary:');
  console.log(`• Total endpoints tested: ${potentialEndpoints.length}`);
  console.log(`• Successful endpoints: ${successfulEndpoints.length}`);
  console.log(`• Failed endpoints: ${potentialEndpoints.length - successfulEndpoints.length}`);
  console.log('');

  // Show successful endpoints
  if (successfulEndpoints.length > 0) {
    console.log('🎉 Working Endpoints:');
    for (const result of successfulEndpoints) {
      console.log(`\n${result.endpoint}:`);
      console.log(`   URL: ${result.url}`);
      console.log(`   Response structure:`);

      // Look for treatment note related fields
      const dataStr = JSON.stringify(result.data);
      const hasNotes = dataStr.toLowerCase().includes('note') ||
                      dataStr.toLowerCase().includes('clinical') ||
                      dataStr.toLowerCase().includes('treatment');

      if (hasNotes) {
        console.log(`   🔍 CONTAINS NOTE-RELATED DATA!`);
      }

      console.log(`   ${JSON.stringify(result.data, null, 2).substring(0, 800)}...`);
    }
  }

  // Show error patterns
  if (Object.keys(errorPatterns).length > 0) {
    console.log('\n🚨 Error Patterns:');
    for (const [code, count] of Object.entries(errorPatterns)) {
      console.log(`• ${code}: ${count} occurrences`);
    }
  }

  // Test with different parameter combinations for promising endpoints
  if (successfulEndpoints.length > 0) {
    console.log('\n🔬 Testing parameter variations for successful endpoints...');

    for (const endpoint of successfulEndpoints) {
      await testParameterVariations(endpoint.endpoint, apiKey, baseUrl);
    }
  }

  console.log('\n💡 Next Steps:');
  console.log('• Check the GraphQL endpoint for treatment notes');
  console.log('• Look for treatment notes in case or consultation data');
  console.log('• Treatment notes might be a separate API version or require different authentication');
  console.log('• Contact Nookal support about REST endpoints for treatment notes');
}

async function testParameterVariations(endpoint: string, apiKey: string, baseUrl: string): Promise<void> {
  console.log(`\n🧬 Testing ${endpoint} with different parameters...`);

  const paramVariations = [
    { name: 'No extra params', params: {} },
    { name: 'With patient ID', params: { patientID: '1' } },
    { name: 'With case ID', params: { caseID: '1' } },
    { name: 'With practitioner ID', params: { practitionerID: '1' } },
    { name: 'With appointment ID', params: { appointmentID: '1' } },
    { name: 'With all IDs', params: { patientID: '1', caseID: '1', practitionerID: '1', appointmentID: '1' } },
    { name: 'With date range', params: { startDate: '2025-01-01', endDate: '2025-12-31' } },
    { name: 'With limit', params: { limit: '10' } }
  ];

  for (const variation of paramVariations) {
    try {
      const url = new URL(`${baseUrl}/${endpoint}`);
      url.searchParams.set('api_key', apiKey);

      for (const [key, value] of Object.entries(variation.params)) {
        url.searchParams.set(key, value);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (response.ok && data.status === 'success') {
        console.log(`   ✅ ${variation.name}: Success`);

        // Look for note-related fields more deeply
        const dataStr = JSON.stringify(data);
        const noteFields = findNoteFields(data);

        if (noteFields.length > 0) {
          console.log(`   🔍 Found note fields: ${noteFields.join(', ')}`);
        }

        // Show data size
        const resultCount = getResultCount(data);
        if (resultCount !== null) {
          console.log(`   📊 Results: ${resultCount} items`);
        }
      } else {
        console.log(`   ❌ ${variation.name}: ${data.details?.errorMessage || 'Failed'}`);
      }

    } catch (error) {
      console.log(`   💥 ${variation.name}: Request failed`);
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

function findNoteFields(obj: any, path = ''): string[] {
  const noteFields: string[] = [];

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (key.toLowerCase().includes('note') ||
          key.toLowerCase().includes('clinical') ||
          key.toLowerCase().includes('treatment') ||
          key.toLowerCase().includes('consultation')) {
        noteFields.push(currentPath);
      }

      if (typeof value === 'object' && value !== null) {
        noteFields.push(...findNoteFields(value, currentPath));
      }
    }
  }

  return noteFields;
}

function getResultCount(data: any): number | null {
  // Try to find result count in common places
  if (data.details?.totalItems) return parseInt(data.details.totalItems);
  if (data.details?.currentItems) return data.details.currentItems;
  if (data.data?.results) {
    const results = data.data.results;
    for (const key of Object.keys(results)) {
      if (Array.isArray(results[key])) {
        return results[key].length;
      }
    }
  }
  return null;
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔍 Treatment Notes Endpoint Discovery

Usage:
  npx tsx src/discover-treatment-notes.ts

This script attempts to discover REST endpoints for treatment notes by:
  • Testing common endpoint naming patterns
  • Trying different parameter combinations
  • Looking for note-related fields in responses
  • Identifying working endpoints that might contain treatment data

The goal is to find how to access treatment notes via REST API.
`);
} else {
  discoverTreatmentNotesEndpoints().catch(console.error);
}
