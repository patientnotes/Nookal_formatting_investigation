#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify if HTML/Unicode entities work in Nookal notes
 */

async function testUnicodeEntities() {
  console.log("🧪 Testing HTML/Unicode Entity Encoding in Nookal\n");
  console.log("Theory: Use HTML entities to bypass UTF-8 corruption issues\n");

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
      name: "Unicode Codepoint Notation",
      original: "Patient • naïve approach • 45°",
      encoded: "Patient \\u2022 na\\u00EFve approach \\u2022 45\\u00B0",
      description: "Using \\uXXXX Unicode codepoint notation",
    },
    {
      name: "XML Hex Entities",
      original: "François Müller — €500 treatment",
      encoded: "Fran&#x00E7;ois M&#x00FC;ller &#x2014; &#x20AC;500 treatment",
      description: "Using &#xHEX; XML-style hex entities",
    },
    {
      name: "Mixed Entity Approach",
      original: 'Smart "quotes" and café with 45° angle',
      encoded: "Smart &quot;quotes&quot; and caf&#233; with 45&deg; angle",
      description: "Mix of named and numeric entities",
    },
    {
      name: "Medical Entity Symbols",
      original: "BP: 120/80 mmHg ± 5, O₂: 98%, ♀ patient",
      encoded: "BP: 120/80 mmHg &plusmn; 5, O&#x2082;: 98%, &#x2640; patient",
      description: "Medical symbols as HTML entities",
    },
    {
      name: "Common Smart Quotes",
      original: "Patient said \"I feel better\" and 'much stronger'",
      encoded:
        "Patient said &ldquo;I feel better&rdquo; and &lsquo;much stronger&rsquo;",
      description: "Smart quotes as named entities",
    },
    {
      name: "Bullet Point List",
      original: "Treatment plan:\n• Pain medication\n• Physical therapy",
      encoded:
        "Treatment plan:\n&bull; Pain medication\n&bull; Physical therapy",
      description: "Bullet points as named entities",
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
    console.log("══════════════════════════════\n");

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

          // Extract just the content (remove test prefix)
          const noteContent = retrievedText.replace(
            `[ENTITY TEST ${i + 1}] `,
            "",
          );

          // Check if entities were decoded to original characters (best case)
          if (noteContent === testCase.original) {
            console.log(
              `   🎉 EXCELLENT! Entities decoded to correct unicode characters`,
            );
            successCount++;
          }
          // Check if entities were preserved as-is (still useful)
          else if (noteContent === testCase.encoded) {
            console.log(
              `   ✅ GOOD! Entities preserved (can be decoded client-side)`,
            );
            partialCount++;
          }
          // Check for corruption despite entity encoding
          else if (
            noteContent.includes("Ã") ||
            noteContent.includes("â€") ||
            noteContent.includes("Â")
          ) {
            console.log(`   ❌ Still corrupted despite entity encoding`);
            console.log(`   Expected entities: "${testCase.encoded}"`);
            console.log(`   Got corrupted: "${noteContent}"`);
            failCount++;
          }
          // Some other transformation
          else {
            console.log(`   🤔 Entities processed but result unclear`);
            console.log(`   Expected original: "${testCase.original}"`);
            console.log(`   Expected entities: "${testCase.encoded}"`);
            console.log(`   Got: "${noteContent}"`);
            partialCount++;
          }

          // Detailed analysis for educational purposes
          console.log(`   🔍 Analysis:`);
          if (noteContent.includes("&")) {
            console.log(
              `      • Contains ampersand - some entities may be preserved`,
            );
          }
          if (noteContent.includes("&#")) {
            console.log(
              `      • Contains numeric entities - partially preserved`,
            );
          }
          if (
            noteContent.length !== testCase.original.length &&
            noteContent.length !== testCase.encoded.length
          ) {
            console.log(
              `      • Length changed - indicates processing/transformation`,
            );
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
    console.log("📊 ENTITY ENCODING TEST SUMMARY");
    console.log("═══════════════════════════════");
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

    // Detailed recommendations
    if (successCount === testCases.length) {
      console.log(
        "🎉 PERFECT! Nookal automatically decodes HTML/Unicode entities to proper unicode!",
      );
      console.log(
        "🛠️  Recommended approach: Pre-encode unicode characters as HTML entities",
      );
      console.log("   Examples:");
      console.log("     café → caf&#233;");
      console.log("     45° → 45&#176; or 45&deg;");
      console.log("     ± → &plusmn; or &#177;");

      console.log("\n💻 Implementation:");
      console.log(
        "   function encodeUnicodeAsEntities(text: string): string {",
      );
      console.log("     return text");
      console.log("       .replace(/é/g, '&#233;')");
      console.log("       .replace(/°/g, '&deg;')");
      console.log("       .replace(/±/g, '&plusmn;')");
      console.log("       .replace(/•/g, '&bull;')");
      console.log("       .replace(/\"/g, '&ldquo;')");
      console.log("       .replace(/\"/g, '&rdquo;');");
      console.log("   }");
    } else if (totalSuccess === testCases.length) {
      console.log(
        "✅ GREAT! Nookal accepts HTML/Unicode entities (preserves them for client decoding)",
      );
      console.log(
        "🛠️  Recommended approach: Use entities + client-side decoding",
      );
      console.log("   1. Encode unicode as entities before sending");
      console.log("   2. Decode entities after retrieving");
      console.log("   3. This preserves exact character representation");
    } else if (totalSuccess > failCount) {
      console.log(
        "🤔 MIXED RESULTS: Some entity types work better than others",
      );
      console.log("🛠️  Recommended: Use only the successful entity formats");
      console.log(
        "   Analyze which entity types work and create a targeted mapping",
      );
    } else {
      console.log(
        "😞 ENTITIES DON'T HELP: Nookal doesn't process HTML/Unicode entities properly",
      );
      console.log(
        "🛠️  Recommended: Stick with character substitution approach",
      );
      console.log("   HTML entities get corrupted the same way as raw unicode");
    }

    // Specific findings for different entity types
    console.log("\n💡 SPECIFIC ENTITY TYPE ANALYSIS:");
    console.log("═════════════════════════════════");
    console.log(
      "• Numeric entities (&#233;): " +
        (successCount > 0 || partialCount > 0 ? "May work" : "Don't work"),
    );
    console.log(
      "• Named entities (&deg;): " +
        (successCount > 0 || partialCount > 0 ? "May work" : "Don't work"),
    );
    console.log(
      "• Hex entities (&#x00E7;): " +
        (successCount > 0 || partialCount > 0 ? "May work" : "Don't work"),
    );
    console.log(
      "• Unicode notation (\\uXXXX): " +
        (successCount > 0 || partialCount > 0 ? "May work" : "Don't work"),
    );

    if (failCount > 0) {
      console.log("\n⚠️  IMPORTANT FINDING:");
      console.log(
        "   HTML entities are subject to the same UTF-8 double-encoding",
      );
      console.log(
        "   corruption that affects raw unicode characters. This suggests",
      );
      console.log(
        "   the server processes entities as unicode first, then corrupts them.",
      );
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
