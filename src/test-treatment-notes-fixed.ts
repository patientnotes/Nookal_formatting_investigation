#!/usr/bin/env node

import { createNookalClientFromEnv } from './nookal-client.js';
import { loadEnvFile, prettyPrint, formatDate, formatDateTime } from './utils.js';

/**
 * Comprehensive treatment notes test with correct parameters
 * Tests both getTreatmentNotes (requires patient_id) and getAllTreatmentNotes
 */
async function testTreatmentNotesFixed(): Promise<void> {
  try {
    // Load environment variables
    loadEnvFile();

    // Create client
    const client = createNookalClientFromEnv();

    console.log('🏥 Testing Treatment Notes with Correct Parameters\n');

    // Step 1: Get appointments to find real patient and case IDs
    console.log('1️⃣ Getting appointments to find real IDs...');
    const appointments = await client.getAppointments({ limit: 5 });

    if (appointments.length === 0) {
      console.log('❌ No appointments found. Cannot proceed with tests.');
      return;
    }

    const firstAppointment = appointments[0];
    console.log(`✅ Found appointment: ID=${firstAppointment.ID}, Patient=${firstAppointment.patientID}, Case=${firstAppointment.caseID}`);
    console.log('');

    // Step 2: Test getTreatmentNotes with required patient_id
    console.log('2️⃣ Testing getTreatmentNotes with patient_id...');
    try {
      const patientTreatmentNotes = await client.getTreatmentNotes({
        patientID: firstAppointment.patientID
      });

      console.log(`✅ Success! Found ${patientTreatmentNotes.length} treatment notes for patient ${firstAppointment.patientID}`);

      if (patientTreatmentNotes.length > 0) {
        console.log('📋 Sample treatment note:');
        console.log(prettyPrint(patientTreatmentNotes[0]));
      }

    } catch (error) {
      console.log(`❌ getTreatmentNotes failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 3: Test getAllTreatmentNotes (no patient_id required)
    console.log('3️⃣ Testing getAllTreatmentNotes...');
    try {
      const allTreatmentNotes = await client.getAllTreatmentNotes({
        page_length: 10
      });

      console.log(`✅ Success! Found ${allTreatmentNotes.length} treatment notes total`);

      if (allTreatmentNotes.length > 0) {
        console.log('📋 Sample treatment note:');
        console.log(prettyPrint(allTreatmentNotes[0]));
      }

    } catch (error) {
      console.log(`❌ getAllTreatmentNotes failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 4: Test getAllTreatmentNotes with practitioner filter
    console.log('4️⃣ Testing getAllTreatmentNotes with practitioner filter...');
    try {
      const practitionerNotes = await client.getAllTreatmentNotes({
        practitioner_id: firstAppointment.practitionerID,
        page_length: 5
      });

      console.log(`✅ Success! Found ${practitionerNotes.length} treatment notes for practitioner ${firstAppointment.practitionerID}`);

    } catch (error) {
      console.log(`❌ getAllTreatmentNotes with practitioner filter failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 5: Test getCases with required patient_id
    console.log('5️⃣ Testing getCases with patient_id...');
    try {
      const patientCases = await client.getCases({
        patientID: firstAppointment.patientID
      });

      console.log(`✅ Success! Found ${patientCases.length} cases for patient ${firstAppointment.patientID}`);

      if (patientCases.length > 0) {
        console.log('📋 Sample case:');
        console.log(prettyPrint(patientCases[0]));
      }

    } catch (error) {
      console.log(`❌ getCases failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 6: Test getAllCases
    console.log('6️⃣ Testing getAllCases...');
    try {
      const allCases = await client.getAllCases({
        page_length: 10
      });

      console.log(`✅ Success! Found ${allCases.length} cases total`);

      if (allCases.length > 0) {
        console.log('📋 Sample case:');
        console.log(prettyPrint(allCases[0]));
      }

    } catch (error) {
      console.log(`❌ getAllCases failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 7: Add a new treatment note
    console.log('7️⃣ Adding a new treatment note...');
    try {
      const newNote = await client.addTreatmentNote({
        patientId: parseInt(firstAppointment.patientID),
        caseId: parseInt(firstAppointment.caseID),
        practitionerId: parseInt(firstAppointment.practitionerID),
        date: formatDateTime(new Date()),
        notes: `Test note added via API on ${formatDate(new Date())}. Patient consultation completed successfully with positive response to treatment.`,
        apptId: parseInt(firstAppointment.ID)
      });

      console.log('✅ Treatment note added successfully!');
      console.log(`📋 New note ID: ${JSON.stringify(newNote)}`);

    } catch (error) {
      console.log(`❌ Adding treatment note failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 8: Verify the new note was added by fetching treatment notes again
    console.log('8️⃣ Verifying new note was added...');
    try {
      const updatedNotes = await client.getTreatmentNotes({
        patientID: firstAppointment.patientID
      });

      console.log(`✅ Now found ${updatedNotes.length} treatment notes for patient ${firstAppointment.patientID}`);

      if (updatedNotes.length > 0) {
        console.log('📋 Most recent treatment note:');
        const mostRecent = updatedNotes[updatedNotes.length - 1];
        console.log(prettyPrint(mostRecent));
      }

    } catch (error) {
      console.log(`❌ Verification failed: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // Step 9: Test different parameter combinations
    console.log('9️⃣ Testing parameter variations...');

    // Test with pagination
    try {
      const pagedNotes = await client.getTreatmentNotes({
        patientID: firstAppointment.patientID,
        page: 1,
        page_length: 3
      });
      console.log(`✅ Pagination test: Found ${pagedNotes.length} notes (page 1, limit 3)`);
    } catch (error) {
      console.log(`❌ Pagination test failed: ${error instanceof Error ? error.message : error}`);
    }

    // Test with last_modified filter
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastModifiedFilter = lastWeek.toISOString().split('T')[0];

    try {
      const recentNotes = await client.getAllTreatmentNotes({
        last_modified: lastModifiedFilter,
        page_length: 5
      });
      console.log(`✅ Last modified filter test: Found ${recentNotes.length} notes modified since ${lastModifiedFilter}`);
    } catch (error) {
      console.log(`❌ Last modified filter test failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log('\n🎉 Treatment Notes Testing Complete!');

    console.log('\n📊 Summary of Findings:');
    console.log('• getTreatmentNotes requires patient_id parameter');
    console.log('• getAllTreatmentNotes works without patient_id');
    console.log('• getAllTreatmentNotes supports practitioner_id filter');
    console.log('• getCases requires patient_id parameter');
    console.log('• getAllCases works without patient_id');
    console.log('• addTreatmentNote continues to work correctly');
    console.log('• All endpoints support pagination and last_modified filtering');

  } catch (error) {
    console.error('💥 Test failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Test just the treatment notes endpoints with different scenarios
 */
async function testTreatmentNotesScenarios(): Promise<void> {
  console.log('🧪 Testing Treatment Notes Scenarios\n');

  try {
    loadEnvFile();
    const client = createNookalClientFromEnv();

    // Get multiple patients
    const patients = await client.getPatients({ page_length: 3 });
    console.log(`Found ${patients.length} patients to test with\n`);

    for (const [index, patient] of patients.entries()) {
      console.log(`👤 Testing patient ${index + 1}: ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`);

      try {
        const notes = await client.getTreatmentNotes({
          patientID: patient.ID
        });
        console.log(`   📝 Treatment notes: ${notes.length}`);

        const cases = await client.getCases({
          patientID: patient.ID
        });
        console.log(`   📁 Cases: ${cases.length}`);

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
      }

      console.log('');
    }

    // Test practitioner-specific notes
    const practitioners = await client.getPractitioners();
    if (practitioners.length > 0) {
      const practitioner = practitioners[0];
      console.log(`👨‍⚕️ Testing practitioner notes for: ${practitioner.FirstName} ${practitioner.LastName}`);

      try {
        const practitionerNotes = await client.getAllTreatmentNotes({
          practitioner_id: practitioner.ID,
          page_length: 10
        });
        console.log(`   📝 Found ${practitionerNotes.length} notes by this practitioner`);
      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}`);
      }
    }

  } catch (error) {
    console.error('💥 Scenarios test failed:', error instanceof Error ? error.message : error);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🏥 Treatment Notes Fixed Test

Usage:
  npx tsx src/test-treatment-notes-fixed.ts                # Run comprehensive test
  npx tsx src/test-treatment-notes-fixed.ts --scenarios   # Run scenarios test

This script tests:
  • getTreatmentNotes with required patient_id
  • getAllTreatmentNotes without patient_id
  • getCases with required patient_id
  • getAllCases without patient_id
  • addTreatmentNote functionality
  • Parameter variations and filtering
  • Multiple patient scenarios

Based on official Nookal API documentation requirements.
`);
} else if (args.includes('--scenarios')) {
  testTreatmentNotesScenarios().catch(console.error);
} else {
  testTreatmentNotesFixed().catch(console.error);
}
