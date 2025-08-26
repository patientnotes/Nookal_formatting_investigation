#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to verify UTF-16 encoding approach for unicode characters
 */

async function testUtf16Encoding() {
  console.log("🧪 Testing UTF-16 Encoding Strategy\n");
  console.log(
    "Theory: Use UTF-16 encoding to bypass Nookal's UTF-8 corruption\n",
  );

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Function to convert text to UTF-16 encoded string
  function textToUtf16(text: string): string {
    // Convert to UTF-16 bytes and then to a string representation
    const utf16Bytes: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // UTF-16 little-endian encoding
      utf16Bytes.push(code & 0xFF);        // low byte
      utf16Bytes.push((code >> 8) & 0xFF); // high byte
    }
    return String.fromCharCode(...utf16Bytes);
  }

  // Function to convert text to UTF-16 hex representation
  function textToUtf16Hex(text: string): string {
    let hex = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      hex += "\\u" + code.toString(16).padStart(4, "0");
    }
    return hex;
  }

  // Function to convert text to UTF-16 base64
  function textToUtf16Base64(text: string): string {
    const utf16Bytes = new Uint16Array(text.length);
    for (let i = 0; i < text.length; i++) {
      utf16Bytes[i] = text.charCodeAt(i);
    }
    const uint8Array = new Uint8Array(utf16Bytes.buffer);
    return btoa(String.fromCharCode(...uint8Array));
  }

  // Test cases with different UTF-16 approaches
  const testCases = [
    {
      name: "UTF-16 Binary Encoding",
      original: "Café visit with Dr. José",
      encoded: textToUtf16("Café visit with Dr. José"),
      description: "Convert to UTF-16 bytes as string",
      approach: "binary"
    },
    {
      name: "UTF-16 Hex Escapes",
      original: "Temperature: 98.6°F",
      encoded: textToUtf16Hex("Temperature: 98.6°F"),
      description: "Use \\uXXXX hex escape sequences",
      approach: "hex"
    },
    {
      name: "UTF-16 Base64",
      original: "BP: 120/80 ± 5 mmHg",
      encoded: `<utf16>${textToUtf16Base64("BP: 120/80 ± 5 mmHg")}</utf16>`,
      description: "Base64 encoded UTF-16 with wrapper tags",
      approach: "base64"
    },
    {
      name: "Unicode Escape Sequences",
      original: 'Patient said "I feel better"',
      encoded: 'Patient said \\u201cI feel better\\u201d',
      description: "Use JavaScript-style unicode escapes",
      approach: "escape"
    },
    {
      name: "Mixed UTF-16 Approach",
      original: "François: 45° ± 2, O₂ 98%",
      encoded: `Fran\\u00e7ois: 45\\u00b0 \\u00b1 2, O\\u2082 98%`,
      description: "Mix ASCII and UTF-16 escapes",
      approach: "mixed"
    }
  ];

  // Create a modified client that sends UTF-16 headers
  const originalMakeRequest = (client as any).makeRequest.bind(client);
  (client as any).makeRequest = async function<T>(
    endpoint: string,
    params?: any,
    options: any = {},
  ): Promise<T> {
    const { method = "GET", body } = options;

    if (method === "POST") {
      // Override headers to indicate UTF-16 content
      const modifiedOptions = {
        ...options,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-16le",
          "Accept": "application/json; charset=utf-8",
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
    let partialCount = 0;
    let failCount = 0;

    console.log("🔬 UTF-16 ENCODING TEST RESULTS");
    console.log("═══════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[UTF16 TEST ${i + 1}] ${testCase.encoded}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Approach: ${testCase.approach}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(`   UTF-16 Encoded: "${testCase.encoded.substring(0, 50)}${testCase.encoded.length > 50 ? '...' : ''}"`);

      try {
        // Add the note with UTF-16 encoding
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
                firstAnswer.answers[0].includes(`[UTF16 TEST ${i + 1}]`)
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
            `[UTF16 TEST ${i + 1}] `,
            "",
          );

          // Check if UTF-16 encoding worked (matches original)
          if (noteContent === testCase.original) {
            console.log(
              `   🎉 PERFECT! UTF-16 encoding completely fixed the corruption!`,
            );
            successCount++;
          }
          // Check if UTF-16 encoding was preserved (could be decoded client-side)
          else if (noteContent === testCase.encoded) {
            console.log(
              `   ✅ GOOD! UTF-16 encoding preserved (can be decoded client-side)`,
            );
            partialCount++;
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
            partialCount++;
          }
          // Still corrupted
          else {
            console.log(`   ❌ Still corrupted despite UTF-16 encoding`);
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
    console.log("📊 UTF-16 ENCODING TEST SUMMARY");
    console.log("═══════════════════════════════");
    console.log(`🎉 Perfect (UTF-16 → unicode): ${successCount}/${testCases.length}`);
    console.log(`✅ Good (UTF-16 preserved): ${partialCount}/${testCases.length}`);
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    const totalSuccess = successCount + partialCount;
    console.log(
      `📈 Success Rate: ${Math.round((totalSuccess / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 INCREDIBLE! UTF-16 encoding completely solved the unicode corruption!",
      );
      console.log("🛠️  Perfect solution found:");
      console.log("   1. Set Content-Type header to charset=utf-16le");
      console.log("   2. Encode unicode characters using UTF-16");
      console.log("   3. Nookal processes UTF-16 correctly!");

      console.log("\n💻 Implementation:");
      console.log("   Headers: 'Content-Type: application/x-www-form-urlencoded; charset=utf-16le'");
      console.log("   function encodeForNookal(text: string): string {");
      console.log("     return text.replace(/[^\\x00-\\x7F]/g, char =>");
      console.log("       '\\\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')");
      console.log("     );");
      console.log("   }");
    } else if (totalSuccess === testCases.length) {
      console.log(
        "✅ GREAT! UTF-16 encoding preserves unicode (decode client-side)",
      );
      console.log("🛠️  Recommended approach: UTF-16 + client-side decoding");
    } else if (totalSuccess > failCount) {
      console.log(
        "🤔 MIXED RESULTS: Some UTF-16 approaches work better than others",
      );
      console.log("🛠️  Use the successful UTF-16 formats only");
    } else {
      console.log(
        "😞 UTF-16 DOESN'T HELP: Nookal doesn't handle UTF-16 properly either",
      );
      console.log("🛠️  Back to character substitution approach");
    }

    // Test without UTF-16 header (standard UTF-8 header with UTF-16 content)
    console.log("\n🔬 BONUS TEST: UTF-16 content with UTF-8 headers");
    console.log("════════════════════════════════════════════════");

    // Reset client to use standard UTF-8 headers
    (client as any).makeRequest = originalMakeRequest;

    const bonusTest = testCases[0]; // Test café with standard headers
    const bonusNote = `[UTF16_NO_HEADER TEST] ${bonusTest.encoded}`;

    console.log(`📝 Testing: ${bonusTest.name} with UTF-8 headers`);
    console.log(`   UTF-16 content: "${bonusTest.encoded}"`);

    try {
      await client.addTreatmentNote({
        patientId,
        caseId,
        practitionerId,
        date: formatDateTime(new Date()),
        notes: bonusNote,
      });

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const allNotes2 = await client.getAllTreatmentNotes({ page_length: 50 });
      const ourNote2 = allNotes2.find((note) => {
        if (note.answers && Array.isArray(note.answers)) {
          const firstAnswer = note.answers[0];
          if (
            firstAnswer &&
            firstAnswer.answers &&
            Array.isArray(firstAnswer.answers)
          ) {
            return (
              firstAnswer.answers[0] &&
              firstAnswer.answers[0].includes(`[UTF16_NO_HEADER TEST]`)
            );
          }
        }
        return false;
      });

      if (ourNote2) {
        const retrievedText2 = ourNote2.answers[0].answers[0];
        const noteContent2 = retrievedText2.replace(
          `[UTF16_NO_HEADER TEST] `,
          "",
        );
        console.log(`   Retrieved: "${noteContent2}"`);

        if (noteContent2 === bonusTest.original) {
          console.log(`   🎉 PERFECT! UTF-16 content with UTF-8 headers worked!`);
        } else if (noteContent2 === bonusTest.encoded) {
          console.log(`   ✅ GOOD! UTF-16 encoding preserved with UTF-8 headers`);
        } else {
          console.log(`   ❌ Still issues with UTF-16 content + UTF-8 headers`);
        }
      } else {
        console.log(`   ❌ UTF-16 content note not found with UTF-8 headers`);
      }
    } catch (error) {
      console.log(`   ❌ Error with UTF-16 content: ${error}`);
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUtf16Encoding().catch(console.error);
}

export { testUtf16Encoding };
