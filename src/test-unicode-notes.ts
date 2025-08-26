#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify unicode/UTF-8 character handling in treatment notes.
 * This tests various problematic unicode characters that might cause encoding issues.
 */

async function testUnicodeNotes() {
  console.log(
    "🧪 Testing Unicode/UTF-8 Character Handling in Treatment Notes\n",
  );

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Test cases with various unicode characters that commonly cause issues
  const unicodeTestCases = [
    {
      name: "Smart Quotes",
      text: "Patient said \"I feel much better\" and 'the pain is gone'.",
      description: "Curly quotes that often get corrupted as â€œâ€",
    },
    {
      name: "Accented Characters",
      text: "Café visit with Dr. José. Patient's naïve approach to physiotherapy improved significantly.",
      description: "Common accented characters in names and words",
    },
    {
      name: "Em Dash and En Dash",
      text: "Pain level: 8/10 — reduced from 9/10. Treatment period: 2–3 weeks.",
      description: 'Long dashes that often corrupt to â€"',
    },
    {
      name: "Degree Symbol",
      text: "Knee flexion: 45° (improved from 30°). Temperature: 98.6°F.",
      description: "Degree symbols commonly used in medical notes",
    },
    {
      name: "Bullet Points",
      text: "Treatment plan:\n• Physiotherapy sessions\n• Pain medication\n• Follow-up appointment",
      description: "Bullet points that might corrupt",
    },
    {
      name: "Clinical Symbols",
      text: "BP: 120/80 mmHg ± 5. Heart rate: 72 bpm. O₂ saturation: 98%.",
      description: "Plus-minus, subscripts, and medical symbols",
    },
    {
      name: "International Characters",
      text: "Patient: François Müller. Diagnosis: Sciatique (français). Behandlung auf Deutsch.",
      description: "Mixed international characters",
    },
    {
      name: "HTML-like Content",
      text: "Patient reports <improvement> in symptoms. Progress: good & steady.",
      description: "Characters that might be HTML-encoded",
    },
    {
      name: "Newlines and Tabs",
      text: "Assessment:\n\tPain level decreased\n\tMobility improved\n\tRecommend continued treatment",
      description: "Whitespace characters that might be encoded",
    },
    {
      name: "Mixed Complex Case",
      text: 'Knee â€œbit betterâ€ post-steroid injection (21/5), not fully resolved, pain still present, esp. EOD after âˆ†WB/activities.\n\nRecent trip: 7 days in Lyon, daily 20â‚¬25,000 steps incl. hills â€" symptoms manageable.\n\nSwimming (outdoor pool) well tolerated.\n\nNoticed soreness/ache in popliteal fossa, particularly post-increased activity/yesterday.\n\nFunctional improvement: now able to almost sit cross-legged (was unable prior to injection); still sore at extreme end of range.',
      description: "Real-world example with multiple unicode corruption issues",
    },
  ];

  let successCount = 0;
  let failureCount = 0;
  const results: Array<{
    name: string;
    original: string;
    retrieved: string;
    matches: boolean;
    corruption?: string;
  }> = [];

  console.log("Getting test data (first patient and case)...");

  try {
    // Get first available patient and case for testing
    const patients = await client.getPatients({ page_length: 1 });
    if (patients.length === 0) {
      console.error(
        "❌ No patients found. Please ensure you have patients in your Nookal system.",
      );
      return;
    }

    const patientId = parseInt(patients[0].ID);
    console.log(
      `✅ Using patient: ${patients[0].FirstName} ${patients[0].LastName} (ID: ${patientId})`,
    );

    const cases = await client.getCases({ patientID: patientId.toString() });
    if (cases.length === 0) {
      console.error(
        "❌ No cases found for patient. Please ensure the patient has cases.",
      );
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

    // Test each unicode case
    for (let i = 0; i < unicodeTestCases.length; i++) {
      const testCase = unicodeTestCases[i];
      console.log(
        `📝 Test ${i + 1}/${unicodeTestCases.length}: ${testCase.name}`,
      );
      console.log(`   Description: ${testCase.description}`);
      console.log(
        `   Original: "${testCase.text.substring(0, 50)}${testCase.text.length > 50 ? "..." : ""}"`,
      );

      try {
        // Add the note
        const testNote = `[UNICODE TEST ${i + 1}] ${testCase.text}`;

        await client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes: testNote,
        });

        console.log(`   ✅ Note added successfully`);

        // Wait a moment for the note to be processed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Retrieve all notes for this patient to find our test note
        const retrievedNotes = await client.getTreatmentNotes({
          patientID: patientId.toString(),
        });

        console.log(
          `   🔍 Retrieved ${retrievedNotes.length} notes for patient ${patientId}`,
        );

        // Debug: show the first few characters of each note
        if (retrievedNotes.length > 0) {
          console.log(`   📋 Recent notes preview:`);
          retrievedNotes.slice(0, 3).forEach((note, idx) => {
            console.log(
              `      ${idx + 1}: Full note object:`,
              JSON.stringify(note, null, 2),
            );
            const preview = note.Notes
              ? note.Notes.substring(0, 60) + "..."
              : "No notes";
            console.log(`      ${idx + 1}: Notes field: "${preview}"`);
          });
        }

        // Find our test note (should be the most recent one with our prefix)
        const ourNote = retrievedNotes.find(
          (note) =>
            note.Notes && note.Notes.includes(`[UNICODE TEST ${i + 1}]`),
        );

        if (!ourNote) {
          console.log(`   ❌ Could not find our test note in retrieved notes`);
          console.log(`   🔍 Looking for: "[UNICODE TEST ${i + 1}]"`);

          // Try getting all notes instead to see if it's a scoping issue
          const allNotes = await client.getAllTreatmentNotes({
            page_length: 50,
          });
          console.log(`   📝 Total notes in system: ${allNotes.length}`);

          // Debug: show structure of latest all notes
          if (allNotes.length > 0) {
            console.log(`   📋 Latest all notes preview:`);
            allNotes.slice(-3).forEach((note, idx) => {
              console.log(
                `      Recent ${idx + 1}: Full note object:`,
                JSON.stringify(note, null, 2),
              );
              const preview = note.Notes
                ? note.Notes.substring(0, 60) + "..."
                : "No notes";
              console.log(`      Recent ${idx + 1}: Notes field: "${preview}"`);
            });
          }

          const foundInAll = allNotes.find(
            (note) =>
              note.Notes && note.Notes.includes(`[UNICODE TEST ${i + 1}]`),
          );

          if (foundInAll) {
            console.log(
              `   ✅ Found our note in all notes! Issue is with patient-specific retrieval.`,
            );
            // Use the note we found
            const retrievedText = foundInAll.Notes;
            const matches = retrievedText === testNote;

            if (matches) {
              console.log(`   ✅ Perfect match! Unicode preserved correctly`);
              successCount++;
            } else {
              console.log(`   ❌ Mismatch detected!`);
              console.log(`   Expected: "${testNote}"`);
              console.log(`   Got:      "${retrievedText}"`);

              // Analyse the differences
              const corruption = analyseCorruption(testNote, retrievedText);
              console.log(`   Corruption: ${corruption}`);
              failureCount++;
            }

            results.push({
              name: testCase.name,
              original: testNote,
              retrieved: retrievedText,
              matches,
              ...(matches
                ? {}
                : { corruption: analyseCorruption(testNote, retrievedText) }),
            });
            continue;
          }

          failureCount++;
          results.push({
            name: testCase.name,
            original: testNote,
            retrieved: "NOT FOUND",
            matches: false,
            corruption: "Note not found after adding",
          });
          continue;
        }

        const retrievedText = ourNote.Notes;
        const matches = retrievedText === testNote;

        if (matches) {
          console.log(`   ✅ Perfect match! Unicode preserved correctly`);
          successCount++;
        } else {
          console.log(`   ❌ Mismatch detected!`);
          console.log(`   Expected: "${testNote}"`);
          console.log(`   Got:      "${retrievedText}"`);

          // Analyse the differences
          const corruption = analyseCorruption(testNote, retrievedText);
          console.log(`   Corruption: ${corruption}`);
          failureCount++;
        }

        results.push({
          name: testCase.name,
          original: testNote,
          retrieved: retrievedText,
          matches,
          ...(matches
            ? {}
            : { corruption: analyseCorruption(testNote, retrievedText) }),
        });
      } catch (error) {
        console.log(
          `   ❌ Error: ${error instanceof Error ? error.message : error}`,
        );
        failureCount++;
        results.push({
          name: testCase.name,
          original: testCase.text,
          retrieved: "ERROR",
          matches: false,
          corruption: `Error: ${error instanceof Error ? error.message : error}`,
        });
      }

      console.log("");
    }

    // Summary
    console.log("📊 UNICODE TEST SUMMARY");
    console.log("═══════════════════════");
    console.log(`✅ Successful: ${successCount}/${unicodeTestCases.length}`);
    console.log(`❌ Failed: ${failureCount}/${unicodeTestCases.length}`);
    console.log(
      `📈 Success Rate: ${Math.round((successCount / unicodeTestCases.length) * 100)}%\n`,
    );

    // Detailed results
    if (failureCount > 0) {
      console.log("🔍 DETAILED FAILURE ANALYSIS");
      console.log("════════════════════════════");

      const corruptionPatterns = new Map<string, number>();

      results.forEach((result, index) => {
        if (!result.matches) {
          console.log(`\n${index + 1}. ${result.name}:`);
          if (result.corruption) {
            console.log(`   Issue: ${result.corruption}`);

            // Track corruption patterns
            const pattern = result.corruption.split(":")[0];
            corruptionPatterns.set(
              pattern,
              (corruptionPatterns.get(pattern) || 0) + 1,
            );
          }
          if (
            result.retrieved !== "ERROR" &&
            result.retrieved !== "NOT FOUND"
          ) {
            console.log(
              `   Original: "${result.original.substring(0, 100)}${result.original.length > 100 ? "..." : ""}"`,
            );
            console.log(
              `   Received: "${result.retrieved.substring(0, 100)}${result.retrieved.length > 100 ? "..." : ""}"`,
            );
          }
        }
      });

      console.log("\n📈 CORRUPTION PATTERNS:");
      corruptionPatterns.forEach((count, pattern) => {
        console.log(`   ${pattern}: ${count} occurrence(s)`);
      });
    }

    console.log("\n🎯 RECOMMENDATIONS:");
    if (successCount === unicodeTestCases.length) {
      console.log(
        "✅ All unicode tests passed! Your system handles UTF-8 correctly.",
      );
    } else {
      console.log("❌ Unicode corruption detected. Consider:");
      console.log(
        "   1. Check database character encoding (should be utf8mb4)",
      );
      console.log("   2. Verify API request/response encoding");
      console.log("   3. Review client-side character handling");
      console.log("   4. Test with different Content-Type headers");
    }
  } catch (error) {
    console.error("❌ Failed to run unicode tests:", error);
  }
}

/**
 * Analyse the differences between original and retrieved text to identify corruption patterns
 */
function analyseCorruption(original: string, retrieved: string): string {
  if (retrieved === "ERROR") return "API Error";
  if (retrieved === "NOT FOUND") return "Note not found";

  // Common corruption patterns
  const patterns = [
    { from: '"', to: "â€œ", name: "Smart quote corruption" },
    { from: '"', to: "â€", name: "Smart quote corruption" },
    { from: "—", to: 'â€"', name: "Em dash corruption" },
    { from: "–", to: 'â€"', name: "En dash corruption" },
    { from: "°", to: "Â°", name: "Degree symbol corruption" },
    { from: "±", to: "Â±", name: "Plus-minus corruption" },
    { from: "€", to: "â‚¬", name: "Euro symbol corruption" },
    { from: "•", to: "â€¢", name: "Bullet point corruption" },
  ];

  for (const pattern of patterns) {
    if (original.includes(pattern.from) && retrieved.includes(pattern.to)) {
      return pattern.name;
    }
  }

  // Check for general encoding issues
  if (retrieved.includes("â€")) {
    return "UTF-8 encoding corruption (â€ pattern)";
  }

  if (retrieved.includes("Â")) {
    return "Latin-1/UTF-8 confusion (Â pattern)";
  }

  // Check for HTML encoding
  if (
    retrieved.includes("&lt;") ||
    retrieved.includes("&gt;") ||
    retrieved.includes("&amp;")
  ) {
    return "HTML entity encoding";
  }

  // Length difference might indicate character encoding issues
  if (original.length !== retrieved.length) {
    return `Length mismatch (${original.length} vs ${retrieved.length})`;
  }

  return "Unknown character corruption";
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnicodeNotes().catch(console.error);
}

export { testUnicodeNotes };
