#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify reverse encoding with proper Latin-1 headers
 */

async function testReverseEncodingWithHeaders() {
  console.log("🧪 Testing Reverse Encoding with Proper Latin-1 Headers\n");
  console.log(
    "Theory: Send Latin-1 encoded content WITH Latin-1 headers so Nookal converts it correctly\n",
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
      description: "Pre-encode café/José to Latin-1 with Latin-1 headers",
    },
    {
      name: "Degree Symbol",
      original: "Temperature: 98.6°F",
      reverseEncoded: utf8ToLatin1("Temperature: 98.6°F"),
      description: "Pre-encode degree symbol with Latin-1 headers",
    },
    {
      name: "Plus-Minus Symbol",
      original: "BP: 120/80 ± 5 mmHg",
      reverseEncoded: utf8ToLatin1("BP: 120/80 ± 5 mmHg"),
      description: "Pre-encode ± symbol with Latin-1 headers",
    },
    {
      name: "Smart Quotes",
      original: 'Patient said "I feel better"',
      reverseEncoded: utf8ToLatin1('Patient said "I feel better"'),
      description: "Pre-encode smart quotes with Latin-1 headers",
    },
    {
      name: "Multiple Symbols",
      original: "François: 45° ± 2, O₂ 98%",
      reverseEncoded: utf8ToLatin1("François: 45° ± 2, O₂ 98%"),
      description: "Multiple symbols with Latin-1 headers",
    },
  ];

  // Create a modified client that sends Latin-1 headers
  const originalMakeRequest = (client as any).makeRequest.bind(client);
  (client as any).makeRequest = async function<T>(
    endpoint: string,
    params?: any,
    options: any = {},
  ): Promise<T> {
    const { method = "GET", body } = options;

    if (method === "POST") {
      // Override headers to use Latin-1 encoding
      const modifiedOptions = {
        ...options,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=iso-8859-1",
          "Accept": "application/json; charset=iso-8859-1",
          "User-Agent": "Nookal-Client/1.0.0",
        },
      };
      return originalMakeRequest(endpoint, params, modifiedOptions);
    }

    return originalMakeRequest(endpoint, params, options);
  };

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

    console.log("🔬 REVERSE ENCODING + LATIN-1 HEADERS TEST RESULTS");
    console.log("═══════════════════════════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[LATIN1 TEST ${i + 1}] ${testCase.reverseEncoded}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(`   Reverse-encoded: "${testCase.reverseEncoded}"`);
      console.log(`   Headers: Content-Type: iso-8859-1, Accept: iso-8859-1`);

      try {
        // Add the note with Latin-1 headers and reverse-encoded text
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
                firstAnswer.answers[0].includes(`[LATIN1 TEST ${i + 1}]`)
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
            `[LATIN1 TEST ${i + 1}] `,
            "",
          );

          // Check if reverse encoding worked (matches original)
          if (noteContent === testCase.original) {
            console.log(
              `   🎉 PERFECT! Latin-1 headers + reverse encoding completely fixed it!`,
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
            console.log(`   ❌ Still corrupted despite Latin-1 headers`);
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
    console.log("📊 LATIN-1 HEADERS + REVERSE ENCODING SUMMARY");
    console.log("══════════════════════════════════════════════");
    console.log(`🎉 Success: ${successCount}/${testCases.length}`);
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    console.log(
      `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 INCREDIBLE! Latin-1 headers + reverse encoding completely solved it!",
      );
      console.log("🛠️  Perfect solution found:");
      console.log("   1. Set headers to charset=iso-8859-1");
      console.log("   2. Pre-encode UTF-8 text as Latin-1 bytes");
      console.log("   3. Let Nookal convert Latin-1 back to proper UTF-8");
      console.log("\n💻 Implementation:");
      console.log("   Headers: 'Content-Type: application/x-www-form-urlencoded; charset=iso-8859-1'");
      console.log("   function preEncodeForNookal(text: string): string {");
      console.log("     const utf8Bytes = new TextEncoder().encode(text);");
      console.log("     return Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');");
      console.log("   }");
    } else if (successCount > failCount) {
      console.log("✅ MUCH BETTER! Latin-1 headers significantly improved results");
      console.log("🛠️  This approach works for most unicode characters");
    } else if (successCount > 0) {
      console.log("🤔 SOME IMPROVEMENT: Latin-1 headers helped some cases");
    } else {
      console.log("😞 NO IMPROVEMENT: Even Latin-1 headers didn't help");
      console.log("🛠️  The server-side corruption may be too complex to reverse");
    }

    // Test with no charset header too
    console.log("\n🔬 BONUS TEST: No charset header (let server assume)");
    console.log("═══════════════════════════════════════════════════");

    // Modify client to send no charset
    (client as any).makeRequest = async function<T>(
      endpoint: string,
      params?: any,
      options: any = {},
    ): Promise<T> {
      const { method = "GET", body } = options;

      if (method === "POST") {
        const modifiedOptions = {
          ...options,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "Nookal-Client/1.0.0",
          },
        };
        return originalMakeRequest(endpoint, params, modifiedOptions);
      }

      return originalMakeRequest(endpoint, params, options);
    };

    // Test one case with no charset
    const testCase = testCases[0]; // Test café
    const testNote = `[NO_CHARSET TEST] ${testCase.reverseEncoded}`;

    console.log(`📝 Testing: ${testCase.name} with no charset header`);
    console.log(`   Reverse-encoded: "${testCase.reverseEncoded}"`);

    await client.addTreatmentNote({
      patientId,
      caseId,
      practitionerId,
      date: formatDateTime(new Date()),
      notes: testNote,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const allNotes2 = await client.getAllTreatmentNotes({ page_length: 50 });
    const ourNote2 = allNotes2.find((note) => {
      if (note.answers && Array.isArray(note.answers)) {
        const firstAnswer = note.answers[0];
        if (firstAnswer && firstAnswer.answers && Array.isArray(firstAnswer.answers)) {
          return firstAnswer.answers[0] && firstAnswer.answers[0].includes(`[NO_CHARSET TEST]`);
        }
      }
      return false;
    });

    if (ourNote2) {
      const retrievedText2 = ourNote2.answers[0].answers[0];
      const noteContent2 = retrievedText2.replace(`[NO_CHARSET TEST] `, "");
      console.log(`   Retrieved: "${noteContent2}"`);

      if (noteContent2 === testCase.original) {
        console.log(`   🎉 PERFECT! No charset header worked too!`);
      } else {
        console.log(`   ❌ No charset header didn't help either`);
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testReverseEncodingWithHeaders().catch(console.error);
}

export { testReverseEncodingWithHeaders };
