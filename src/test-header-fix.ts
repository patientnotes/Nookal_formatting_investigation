#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Test script to verify if UTF-8 charset headers fix unicode corruption
 */

async function testHeaderFix() {
  console.log("🧪 Testing UTF-8 Header Fix for Unicode Corruption\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Test cases with problematic unicode characters
  const testCases = [
    {
      name: "Smart Quotes",
      text: 'Patient said "I feel better" today.',
      expected: 'Patient said "I feel better" today.',
    },
    {
      name: "Accented Characters",
      text: "Visit to café with Dr. José was naïve but helpful.",
      expected: "Visit to café with Dr. José was naïve but helpful.",
    },
    {
      name: "Degree Symbol",
      text: "Temperature: 98.6°F, angle: 45°",
      expected: "Temperature: 98.6°F, angle: 45°",
    },
    {
      name: "Medical Symbols",
      text: "BP: 120/80 ± 5 mmHg, O₂: 98%",
      expected: "BP: 120/80 ± 5 mmHg, O₂: 98%",
    },
    {
      name: "Bullet Points",
      text: "Treatment:\n• Pain relief\n• Exercise",
      expected: "Treatment:\n• Pain relief\n• Exercise",
    },
  ];

  try {
    // Get test data
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
      console.error("❌ No cases found.");
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

    let successCount = 0;
    let failCount = 0;

    console.log("🔬 HEADER FIX TEST RESULTS");
    console.log("═══════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[HEADER TEST ${i + 1}] ${testCase.text}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Input: "${testCase.text}"`);

      try {
        // Add the note with UTF-8 headers
        await client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes: testNote,
        });

        console.log(`   ✅ Note added successfully`);

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Get all notes to find our test note
        const allNotes = await client.getAllTreatmentNotes({ page_length: 50 });

        // Find our note (look in answers array based on previous discoveries)
        const ourNote = allNotes.find((note) => {
          if (note.answers && Array.isArray(note.answers)) {
            const firstAnswer = note.answers[0];
            if (
              firstAnswer &&
              firstAnswer.answers &&
              Array.isArray(firstAnswer.answers)
            ) {
              return (
                firstAnswer.answers[0] &&
                firstAnswer.answers[0].includes(`[HEADER TEST ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          const matches = retrievedText === testNote;

          console.log(`   Retrieved: "${retrievedText}"`);

          if (matches) {
            console.log(`   ✅ PERFECT MATCH! Unicode preserved correctly`);
            successCount++;
          } else {
            console.log(`   ❌ Corruption detected`);

            // Analyze corruption
            if (retrievedText.includes("Ã")) {
              console.log(
                `   🔍 Corruption type: UTF-8 → Latin-1 → UTF-8 double encoding`,
              );
            } else if (retrievedText.includes("Â")) {
              console.log(`   🔍 Corruption type: Latin-1/UTF-8 confusion`);
            } else if (retrievedText.includes("â€")) {
              console.log(`   🔍 Corruption type: Unicode symbol corruption`);
            } else {
              console.log(`   🔍 Corruption type: Unknown character mangling`);
            }

            failCount++;
          }
        } else {
          console.log(`   ❌ Note not found after adding`);
          failCount++;
        }
      } catch (error) {
        console.log(
          `   ❌ Error: ${error instanceof Error ? error.message : error}`,
        );
        failCount++;
      }

      console.log("");
    }

    // Summary
    console.log("📊 HEADER FIX TEST SUMMARY");
    console.log("═══════════════════════════");
    console.log(`✅ Success: ${successCount}/${testCases.length}`);
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    console.log(
      `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 EXCELLENT! UTF-8 headers completely fixed the unicode corruption issue!",
      );
      console.log("🛠️  The fix was:");
      console.log(
        '   • Content-Type: "application/x-www-form-urlencoded; charset=utf-8"',
      );
      console.log('   • Accept: "application/json; charset=utf-8"');
    } else if (successCount > 0) {
      console.log(
        "🤔 PARTIAL SUCCESS: UTF-8 headers improved but didn't completely fix the issue.",
      );
      console.log(
        "   Additional measures may be needed for full unicode support.",
      );
    } else {
      console.log(
        "😞 NO IMPROVEMENT: UTF-8 headers alone didn't fix the unicode corruption.",
      );
      console.log("   Server-side configuration changes may be required.");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testHeaderFix().catch(console.error);
}

export { testHeaderFix };
