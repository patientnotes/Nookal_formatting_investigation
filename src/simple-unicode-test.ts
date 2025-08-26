#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Simple single unicode test to debug the note retrieval issue
 */

async function simpleUnicodeTest() {
  console.log("🧪 Simple Unicode Test\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  try {
    // Get first available patient and case for testing
    const patients = await client.getPatients({ page_length: 1 });
    if (patients.length === 0) {
      console.error("❌ No patients found.");
      return;
    }

    const patientId = parseInt(patients[0].ID);
    console.log(
      `✅ Using patient: ${patients[0].FirstName} ${patients[0].LastName} (ID: ${patientId})`,
    );

    const cases = await client.getCases({ patientID: patientId.toString() });
    if (cases.length === 0) {
      console.error("❌ No cases found for patient.");
      return;
    }

    const caseId = parseInt(cases[0].ID);
    console.log(`✅ Using case: ${cases[0].caseTitle} (ID: ${caseId})`);

    const practitioners = await client.getPractitioners();
    if (practitioners.length === 0) {
      console.error("❌ No practitioners found.");
      return;
    }

    const practitionerId = parseInt(practitioners[0].ID);
    console.log(
      `✅ Using practitioner: ${practitioners[0].FirstName} ${practitioners[0].LastName} (ID: ${practitionerId})\n`,
    );

    // Test with a simple unicode string
    const testText = 'Patient said "I feel better" with café treatment.';
    const testNote = `[SIMPLE TEST] ${testText}`;

    console.log(`📝 Adding test note: "${testNote}"`);

    // Add the note
    const addResult = await client.addTreatmentNote({
      patientId,
      caseId,
      practitionerId,
      date: formatDateTime(new Date()),
      notes: testNote,
    });

    console.log(`✅ Note added. Result:`, JSON.stringify(addResult, null, 2));

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get notes for this patient
    console.log(`\n🔍 Retrieving notes for patient ${patientId}...`);
    const retrievedNotes = await client.getTreatmentNotes({
      patientID: patientId.toString(),
    });

    console.log(`📝 Found ${retrievedNotes.length} notes for patient`);

    // Show all notes
    retrievedNotes.forEach((note, idx) => {
      console.log(`\nNote ${idx + 1}:`);
      console.log(`  ID: ${note.ID}`);
      console.log(`  PatientID: ${note.PatientID}`);
      console.log(`  CaseID: ${note.CaseID}`);
      console.log(`  PractitionerID: ${note.PractitionerID}`);
      console.log(`  Date: ${note.Date}`);
      console.log(`  Notes: "${note.Notes}"`);
      console.log(`  Full object:`, JSON.stringify(note, null, 2));
    });

    // Try to find our note
    const ourNote = retrievedNotes.find(
      (note) => note.Notes && note.Notes.includes("[SIMPLE TEST]"),
    );

    if (ourNote) {
      console.log(`\n✅ Found our note!`);
      console.log(`Original: "${testNote}"`);
      console.log(`Retrieved: "${ourNote.Notes}"`);

      if (ourNote.Notes === testNote) {
        console.log(`✅ Perfect match! Unicode preserved correctly`);
      } else {
        console.log(`❌ Mismatch detected!`);
        console.log(
          `Length diff: ${testNote.length} vs ${ourNote.Notes.length}`,
        );

        // Show character by character comparison
        for (
          let i = 0;
          i < Math.max(testNote.length, ourNote.Notes.length);
          i++
        ) {
          const orig = testNote[i] || "END";
          const retr = ourNote.Notes[i] || "END";
          if (orig !== retr) {
            console.log(
              `  Diff at pos ${i}: "${orig}" (${orig.charCodeAt(0)}) vs "${retr}" (${retr.charCodeAt(0)})`,
            );
          }
        }
      }
    } else {
      console.log(`\n❌ Could not find our test note`);
      console.log(`Looking for text containing: "[SIMPLE TEST]"`);

      // Try getting all notes
      console.log(`\n🔍 Checking all notes in system...`);
      const allNotes = await client.getAllTreatmentNotes({ page_length: 50 });
      console.log(`📝 Total notes in system: ${allNotes.length}`);

      const foundInAll = allNotes.find(
        (note) => note.Notes && note.Notes.includes("[SIMPLE TEST]"),
      );

      if (foundInAll) {
        console.log(`✅ Found our note in all notes!`);
        console.log(`Original: "${testNote}"`);
        console.log(`Retrieved: "${foundInAll.Notes}"`);
        console.log(
          `Patient ID mismatch? Our patient: ${patientId}, Note's patient: ${foundInAll.PatientID}`,
        );
      } else {
        console.log(`❌ Note not found in all notes either`);
      }
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleUnicodeTest().catch(console.error);
}

export { simpleUnicodeTest };
