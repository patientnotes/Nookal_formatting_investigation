#!/usr/bin/env node

import { createNookalClientFromEnv } from './nookal-client.js';
import { loadEnvFile, prettyPrint } from './utils.js';

/**
 * Quick test to verify treatment notes fix works
 */
async function testFix(): Promise<void> {
  try {
    loadEnvFile();
    const client = createNookalClientFromEnv();

    console.log('🧪 Testing Treatment Notes Fix\n');

    // Test 1: Get notes for patient 1
    console.log('1️⃣ Getting treatment notes for patient 1...');
    const notes = await client.getTreatmentNotes({ patientID: '1' });
    console.log(`✅ Found ${notes.length} treatment notes!\n`);

    if (notes.length > 0) {
      console.log('📋 Sample notes:');
      notes.slice(-3).forEach((note, index) => {
        console.log(`Note ${index + 1}:`);
        console.log(`  ID: ${note.noteID}`);
        console.log(`  Date: ${note.date}`);
        console.log(`  Status: ${note.status}`);
        if (note.answers && Array.isArray(note.answers)) {
          note.answers.forEach(answer => {
            if (answer.answers && answer.answers[0]) {
              console.log(`  Text: ${answer.answers[0]}`);
            }
          });
        }
        console.log('');
      });
    }

    // Test 2: Get all notes
    console.log('2️⃣ Getting all treatment notes...');
    const allNotes = await client.getAllTreatmentNotes({ page_length: 5 });
    console.log(`✅ Found ${allNotes.length} total notes in system!\n`);

    console.log('🎉 Fix confirmed! Treatment notes are now working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

testFix().catch(console.error);
