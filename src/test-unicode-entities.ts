#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify if HTML/Unicode entities work in Nookal notes
 */

async function testUnicodeEntities() {
  console.log("🧪 Testing HTML/Unicode Entity Encoding in Nookal\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Test cases with different entity encoding approaches
  const testCases = [
    {
      name: "HTML Numeric Entities",
      original: "Café visit with Dr. José at 45°",
      encoded: "Caf&#233; visit with Dr. Jos&#233; at 45&#176;",
      description: "Using &#xxx; HTML numeric entities",
    },
    {
      name: "HTML Named Entities",
      original: "Temperature: 98.6°F ± 5 degrees",
      encoded: "Temperature: 98.6&deg;F &plusmn; 5 degrees",
      description: "Using &name; HTML named entities",
    },
    {
      name: "Unicode Codepoint Tags",
      original: "Patient • naïve approach • 45°",
      encoded: "Patient <U+2022> na<U+00EF>ve approach <U+2022> 45<U+00B0>",
      description: "Using <U+xxxx> Unicode codepoint notation",
    },
    {
      name: "XML Unicode Entities",
      original: "François Müller — €500 treatment",
      encoded: "Fran&#x00E7;ois M&#x00FC;ller &#x2014; &#x20AC;500 treatment",
      description: "Using &#xHEX; XML-style hex entities",
    },
    {
      name: "Mixed Approach",
      original: 'Smart "quotes" and café with 45° angle',
      encoded: "Smart &quot;quotes&quot; and caf&#233; with 45&deg; angle",
      description: "Mix of named and numeric entities",
    },
    {
      name: "Medical Symbols",
      original: "BP: 120/80 mmHg ± 5, O₂: 98%, ♀ patient",
      encoded: "BP: 120/80 mmHg &plusmn; 5, O&#x2082;: 98%, &#x2640; patient",
      description: "Medical symbols as entities",
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
    let partialCount = 0;
    let failCount = 0;

    console.log("🔬 UNICODE ENTITY TEST RESULTS");
    console.log("═══════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[ENTITY TEST ${i + 1}] ${testCase.encoded}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(`   Encoded: "${testCase.encoded}"`);

      try {
        // Add the note with entity encoding
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
                firstAnswer.answers[0].includes(`[ENTITY TEST ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          console.log(`   Retrieved: "${retrievedText}"`);

          // Check if entities were decoded to original characters
          if (
            retrievedText.includes(
              testCase.original.substring(testCase.original.indexOf(" ") + 1),
            )
          ) {
            console.log(
              `   🎉 EXCELLENT! Entities decoded to correct unicode characters`,
            );
            successCount++;
          }
          // Check if entities were preserved as-is (still functional)
          else if (
            retrievedText.includes(
              testCase.encoded.substring(testCase.encoded.indexOf(" ") + 1),
            )
          ) {
            console.log(
              `   ✅ GOOD! Entities preserved (could be decoded client-side)`,
            );
            partialCount++;
          }
          // Check for corruption
          else if (
            retrievedText.includes("Ã") ||
            retrievedText.includes("â€") ||
            retrievedText.includes("Â")
          ) {
            console.log(`   ❌ Still corrupted despite entity encoding`);
            failCount++;
          } else {
            console.log(`   🤔 Entities processed but result unclear`);
            partialCount++;
          }

          // Show detailed comparison
          const noteContent = retrievedText.replace(
            `[ENTITY TEST ${i + 1}] `,
            "",
          );
          console.log(`   Expected original: "${testCase.original}"`);
          console.log(`   Expected encoded: "${testCase.encoded}"`);
          console.log(`   Actual result: "${noteContent}"`);
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
    console.log("📊 ENTITY ENCODING TEST SUMMARY");
    console.log("════════════════════════════════");
    console.log(
      `🎉 Perfect (entities → unicode): ${successCount}/${testCases.length}`,
    );
    console.log(
      `✅ Good (entities preserved): ${partialCount}/${testCases.length}`,
    );
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    const totalSuccess = successCount + partialCount;
    console.log(
      `📈 Success Rate: ${Math.round((totalSuccess / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 PERFECT! Nookal automatically decodes HTML/Unicode entities to proper unicode!",
      );
      console.log(
        "🛠️  Recommended approach: Pre-encode unicode characters as HTML entities",
      );
      console.log("   Example: café → caf&#233;, 45° → 45&#176;");
    } else if (totalSuccess === testCases.length) {
      console.log(
        "✅ GREAT! Nookal accepts HTML/Unicode entities (preserves them for client decoding)",
      );
      console.log(
        "🛠️  Recommended approach: Use entities + client-side decoding",
      );
    } else if (totalSuccess > failCount) {
      console.log(
        "🤔 MIXED RESULTS: Some entity types work better than others",
      );
      console.log("🛠️  Recommended: Use the successful entity formats only");
    } else {
      console.log(
        "😞 ENTITIES DON'T HELP: Nookal doesn't process HTML/Unicode entities",
      );
      console.log(
        "🛠️  Recommended: Stick with character substitution approach",
      );
    }

    // Provide specific recommendations based on results
    console.log("\n💡 SPECIFIC RECOMMENDATIONS:");
    if (successCount > 0) {
      console.log("   • Use HTML entities for special characters");
      console.log("   • Nookal converts them to proper unicode");
    }
    if (partialCount > 0) {
      console.log("   • Entities are preserved - decode them in your client");
      console.log(
        "   • Create utility function to convert entities back to unicode",
      );
    }
    if (failCount > 0) {
      console.log("   • Some approaches still cause corruption");
      console.log("   • Avoid entity types that failed");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnicodeEntities().catch(console.error);
}

export { testUnicodeEntities };
