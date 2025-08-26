#!/usr/bin/env node

import { loadEnvFile } from './nookal-client';

/**
 * Test different parameter combinations for getTreatmentNotes endpoint
 * to understand what parameters it requires
 */

async function testTreatmentNotesParameters(): Promise<void> {
  loadEnvFile();

  const apiKey = process.env.NOOKAL_API_KEY;
  const baseUrl = process.env.NOOKAL_BASE_URL || 'https://api.nookal.com/production/v2';

  if (!apiKey) {
    console.error('❌ NOOKAL_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🧪 Testing Treatment Notes Parameters\n');
  console.log(`API Key: ${apiKey.substring(0, 8)}...`);
  console.log(`Base URL: ${baseUrl}\n`);

  // Known IDs from our successful API calls
  const knownIds = {
    patientID: '1',
    patientID2: '2',
    practitionerID: '1',
    locationID: '1',
    caseID: '1',
    caseID2: '2',
    appointmentID: '1',
    appointmentID2: '2',
    noteID: '7' // We know this exists from adding a note
  };

  console.log('🔍 Known IDs from working endpoints:');
  for (const [key, value] of Object.entries(knownIds)) {
    console.log(`  • ${key}: ${value}`);
  }
  console.log('
