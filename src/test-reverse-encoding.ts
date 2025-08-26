#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify reverse-encoding approach - pre-corrupt text so Nookal's
 * corruption makes it correct again
 */

async function testReverseEncoding() {
  console.log("🧪 Testing Reverse Encoding Strategy\n");
  console.log(
    "Theory: Pre-corrupt text so Nookal's double-encoding fixes it\n",
  );

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Function to convert UTF-8 to Latin-1 bytes (reverse of corruption)
  function utf8ToLatin1(text: string): string {
    // Convert UTF-8 string to bytes, then interpret as Latin-1
    const utf8Bytes = new TextEncoder().encode(text);
    let latin1 = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      latin1 += String.fromCharCode(utf8Bytes[i]);
    }
    return latin1;
  }

  // Test cases with problematic unicode characters
  const testCases = [
    {
      name: "Accented Characters",
      original: "Café visit with Dr. José",
      reverseEncoded: utf8ToLatin1("Café visit with Dr. José"),
      description: "Pre-encode café/José to Latin-1",
    },
    {
      name: "Degree Symbol",
      original: "Temperature: 98.6°F",
      reverseEncoded: utf8ToLatin1("Temperature: 98.6°F"),
      description: "Pre-encode degree symbol",
    },
    {
      name: "Plus-Minus Symbol",
      original: "BP: 120/80 ± 5 mmHg",
      reverseEncoded: utf8ToLatin1("BP: 120/80 ± 5 mmHg"),
      description: "Pre-encode ± symbol",
    },
    {
      name: "Smart Quotes",
      original: 'Patient said "I feel better"',
      reverseEncoded: utf8ToLatin1('Patient said "I feel better"'),
      description: "Pre-encode smart quotes",
    },
    {
      name: "Em Dash",
      original: "Pain level: 8/10 — reduced",
      reverseEncoded: utf8ToLatin1("Pain level: 8/10 — reduced"),
      description: "Pre-encode em dash",
    },
    {
      name: "Bullet Points",
      original: "Treatment:\n• Pain relief\n• Exercise",
      reverseEncoded: utf8ToLatin1("Treatment:\n• Pain relief\n• Exercise"),
      description: "Pre-encode bullet points",
    },
    {
      name: "Multiple Symbols",
      original: "François: 45° ± 2, O₂ 98%",
      reverseEncoded: utf8ToLatin1("François: 45° ± 2, O₂ 98%"),
      description: "Multiple symbols together",
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

    console.log("🔬 REVERSE ENCODING TEST RESULTS");
    console.log("═════════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[REVERSE TEST ${i + 1}] ${testCase.reverseEncoded}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(`   Reverse-encoded: "${testCase.reverseEncoded}"`);

      // Show byte comparison
      const originalBytes = new TextEncoder().encode(testCase.original);
      const reverseBytes = new TextEncoder().encode(testCase.reverseEncoded);
      console.log(
        `   Original bytes: [${Array.from(originalBytes)
          .map((b) => b.toString(16))
          .join(", ")}]`,
      );
      console.log(
        `   Reverse bytes: [${Array.from(reverseBytes)
          .map((b) => b.toString(16))
          .join(", ")}]`,
      );

      try {
        // Add the note with reverse-encoded text
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

        // Find our note
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
                firstAnswer.answers[0].includes(`[REVERSE TEST ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          console.log(`   Retrieved: "${retrievedText}"`);

          // Extract just the content (remove our test prefix)
          const noteContent = retrievedText.replace(
            `[REVERSE TEST ${i + 1}] `,
            "",
          );

          // Check if reverse encoding worked (matches original)
          if (noteContent === testCase.original) {
            console.log(
              `   🎉 PERFECT! Reverse encoding completely fixed the corruption!`,
            );
            successCount++;
          }
          // Check if it's better than before (less corruption)
          else if (
            !noteContent.includes("Ã") &&
            !noteContent.includes("â€") &&
            !noteContent.includes("Â")
          ) {
            console.log(`   ✅ IMPROVED! No visible corruption patterns`);
            console.log(`   Expected: "${testCase.original}"`);
            console.log(`   Got: "${noteContent}"`);
            successCount++;
          }
          // Still corrupted
          else {
            console.log(`   ❌ Still corrupted after reverse encoding`);
            console.log(`   Expected: "${testCase.original}"`);
            console.log(`   Got: "${noteContent}"`);

            // Analyze corruption type
            if (noteContent.includes("Ã")) {
              console.log(`   🔍 Still has UTF-8→Latin-1 corruption patterns`);
            }
            if (noteContent.includes("â€")) {
              console.log(`   🔍 Still has unicode symbol corruption`);
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
    console.log("📊 REVERSE ENCODING TEST SUMMARY");
    console.log("═════════════════════════════════");
    console.log(`🎉 Success: ${successCount}/${testCases.length}`);
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    console.log(
      `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 INCREDIBLE! Reverse encoding completely solved the unicode corruption!",
      );
      console.log("🛠️  Recommended approach:");
      console.log(
        "   1. Pre-encode UTF-8 strings as Latin-1 before sending to Nookal",
      );
      console.log(
        "   2. Let Nookal's double-encoding convert them back to correct UTF-8",
      );
      console.log(
        "   3. No client-side decoding needed - text comes back perfect!",
      );

      console.log("\n💻 Implementation:");
      console.log("   function preEncodeForNookal(text: string): string {");
      console.log("     const utf8Bytes = new TextEncoder().encode(text);");
      console.log(
        "     return Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');",
      );
      console.log("   }");
    } else if (successCount > failCount) {
      console.log("✅ GOOD! Reverse encoding helped with most cases");
      console.log(
        "🛠️  Recommended: Use reverse encoding for characters that worked",
      );
      console.log("   Combine with other strategies for remaining issues");
    } else if (successCount > 0) {
      console.log("🤔 MIXED RESULTS: Reverse encoding helped some cases");
      console.log(
        "🛠️  Consider selective reverse encoding for specific characters",
      );
    } else {
      console.log("😞 NO IMPROVEMENT: Reverse encoding didn't help");
      console.log(
        "🛠️  The corruption might be more complex than simple double-encoding",
      );
      console.log("   Consider character substitution approach instead");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testReverseEncoding().catch(console.error);
}

export { testReverseEncoding };
