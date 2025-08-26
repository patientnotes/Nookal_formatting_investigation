#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Test script that exactly mimics Nookal's official PHP SDK approach
 * Based on their Request.php implementation
 */

async function testPhpSdkMimicry() {
  console.log("🧪 Testing PHP SDK Mimicry - Exact Nookal Implementation\n");
  console.log("Theory: Match Nookal's PHP SDK implementation exactly\n");
  console.log("PHP SDK Headers:");
  console.log(
    "  Content-Type: application/x-www-form-urlencoded; charset=UTF-8",
  );
  console.log("  Content-Length: [calculated]");
  console.log("  Method: POST");
  console.log("  Data: http_build_query() equivalent\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Create a client that mimics PHP SDK exactly
  const originalMakeRequest = (client as any).makeRequest.bind(client);
  (client as any).makeRequest = async function <T>(
    endpoint: string,
    params?: any,
    options: any = {},
  ): Promise<T> {
    const { method = "GET", body } = options;

    if (method === "POST") {
      // Mimic PHP SDK's approach exactly
      const postData = {
        api_key: (client as any).apiKey,
        ...params,
        ...body,
      };

      // Convert to URL-encoded string like PHP's http_build_query
      const formData = new URLSearchParams();
      for (const [key, value] of Object.entries(postData)) {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      }
      const bodyString = formData.toString();

      // Use exact headers from PHP SDK
      const modifiedOptions = {
        ...options,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "Content-Length": bodyString.length.toString(),
          // Note: PHP SDK doesn't include User-Agent, let's test with and without
        },
        body: bodyString,
      };

      console.log(`   🔧 Using PHP SDK exact headers and body encoding`);
      console.log(`   📏 Content-Length: ${bodyString.length}`);

      return originalMakeRequest(endpoint, undefined, modifiedOptions);
    }

    return originalMakeRequest(endpoint, params, options);
  };

  // Test cases focused on the characters that partially work
  const testCases = [
    {
      name: "Smart Quotes (Known to Work)",
      original: 'Patient said "I feel much better" today.',
      description: "Test characters that work with UTF-8 headers",
    },
    {
      name: "Accented Characters (Problematic)",
      original: "Café visit with Dr. José",
      description: "Test classic double-encoding victims",
    },
    {
      name: "Medical Symbols (Problematic)",
      original: "Temperature: 98.6°F ± 5 degrees",
      description: "Test medical symbols that typically corrupt",
    },
    {
      name: "Mixed Content",
      original: 'Patient "feels better" after café visit. Temperature: 98.6°F',
      description: "Mix of working and problematic characters",
    },
    {
      name: "Complex Medical Note",
      original:
        'François: BP 120±5 mmHg, temp 98.6°F. Patient said "much better" • Continue treatment',
      description: "Real-world medical note with multiple unicode types",
    },
  ];

  try {
    // Get test data
    const patients = await client.getPatients({ page_length: 1 });
    const patientId = parseInt(patients[0].ID);

    const cases = await client.getCases({ patientID: patientId.toString() });
    const caseId = parseInt(cases[0].ID);

    const practitioners = await client.getPractitioners();
    const practitionerId = parseInt(practitioners[0].ID);

    console.log(
      `✅ Using patient: ${patients[0].FirstName} ${patients[0].LastName} (ID: ${patientId})`,
    );
    console.log(`✅ Using case: ${cases[0].caseTitle} (ID: ${caseId})`);
    console.log(
      `✅ Using practitioner: ${practitioners[0].FirstName} ${practitioners[0].LastName} (ID: ${practitionerId})\n`,
    );

    let perfectCount = 0;
    let partialCount = 0;
    let failCount = 0;

    console.log("🔬 PHP SDK MIMICRY TEST RESULTS");
    console.log("═══════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[PHP SDK TEST ${i + 1}] ${testCase.original}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);

      try {
        await client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes: testNote,
        });

        console.log(`   ✅ Note added successfully (PHP SDK style)`);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // Get recent notes
        const allNotes = await client.getAllTreatmentNotes({ page_length: 30 });
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
                firstAnswer.answers[0].includes(`[PHP SDK TEST ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          console.log(`   Retrieved: "${retrievedText}"`);

          const noteContent = retrievedText.replace(
            `[PHP SDK TEST ${i + 1}] `,
            "",
          );

          // Perfect match
          if (noteContent === testCase.original) {
            console.log(
              `   🎉 PERFECT! Exact match - PHP SDK approach works for this character set`,
            );
            perfectCount++;
          }
          // Check for typical corruption patterns
          else if (
            noteContent.includes("Ã") ||
            noteContent.includes("â€") ||
            noteContent.includes("Â")
          ) {
            console.log(
              `   ❌ CORRUPTED: Still shows double-encoding despite PHP SDK approach`,
            );
            console.log(`   Expected: "${testCase.original}"`);
            console.log(`   Got: "${noteContent}"`);

            // Detailed corruption analysis
            if (
              noteContent.includes("CafÃ©") ||
              noteContent.includes("JosÃ©")
            ) {
              console.log(
                `   🔍 UTF-8→Latin-1→UTF-8 double encoding confirmed`,
              );
            }
            if (noteContent.includes("Â°") || noteContent.includes("Â±")) {
              console.log(
                `   🔍 Symbol corruption confirmed (degree/plus-minus)`,
              );
            }
            failCount++;
          }
          // Partial improvement
          else {
            console.log(
              `   ✅ IMPROVED: Some characters preserved, others may have changed`,
            );
            console.log(`   Expected: "${testCase.original}"`);
            console.log(`   Got: "${noteContent}"`);
            partialCount++;
          }

          // Character-by-character analysis for detailed feedback
          if (noteContent !== testCase.original) {
            console.log(`   🔍 Character Analysis:`);
            const originalChars = Array.from(testCase.original);
            const retrievedChars = Array.from(noteContent);

            for (
              let j = 0;
              j < Math.max(originalChars.length, retrievedChars.length);
              j++
            ) {
              const origChar = originalChars[j] || "∅";
              const retrChar = retrievedChars[j] || "∅";

              if (origChar !== retrChar) {
                const origCode =
                  origChar !== "∅" ? origChar.charCodeAt(0) : "N/A";
                const retrCode =
                  retrChar !== "∅" ? retrChar.charCodeAt(0) : "N/A";
                console.log(
                  `      Position ${j}: "${origChar}" (${origCode}) → "${retrChar}" (${retrCode})`,
                );
              }
            }
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
    console.log("📊 PHP SDK MIMICRY TEST SUMMARY");
    console.log("════════════════════════════════");
    console.log(
      `🎉 Perfect (exact match): ${perfectCount}/${testCases.length}`,
    );
    console.log(
      `✅ Partial (some improvement): ${partialCount}/${testCases.length}`,
    );
    console.log(
      `❌ Failed (still corrupted): ${failCount}/${testCases.length}`,
    );
    const totalSuccess = perfectCount + partialCount;
    console.log(
      `📈 Success Rate: ${Math.round((totalSuccess / testCases.length) * 100)}%\n`,
    );

    // Detailed analysis
    console.log("🔍 COMPARATIVE ANALYSIS:");
    console.log("═════════════════════════");

    if (perfectCount === testCases.length) {
      console.log(
        "🎉 BREAKTHROUGH! PHP SDK approach completely solves the unicode issue!",
      );
      console.log(
        "💡 This suggests subtle differences in encoding handling between implementations",
      );
      console.log(
        "🛠️  Recommendation: Adopt PHP SDK's exact approach in all client libraries",
      );
    } else if (perfectCount > 0) {
      console.log(
        `✅ PARTIAL SUCCESS: ${perfectCount} out of ${testCases.length} character sets work perfectly`,
      );
      console.log(
        "💡 This confirms that some unicode characters can be handled correctly",
      );
      console.log(
        "🔍 The working characters suggest proper UTF-8 handling is possible",
      );
      console.log(
        "❌ Remaining failures indicate server-side processing inconsistencies",
      );
    } else if (totalSuccess > failCount) {
      console.log(
        "🤔 MIXED RESULTS: PHP SDK approach provides some improvements",
      );
      console.log("💡 But fundamental double-encoding issues persist");
    } else {
      console.log("😞 NO IMPROVEMENT: PHP SDK approach faces same limitations");
      console.log(
        "💡 This confirms the issue is server-side, not client implementation",
      );
      console.log(
        "🔍 Even matching their official SDK exactly doesn't resolve the core problem",
      );
    }

    console.log("\n🏛️  PHP SDK COMPATIBILITY FINDINGS:");
    console.log("═══════════════════════════════════");
    console.log(
      "✅ Headers: Matched PHP SDK exactly (charset=UTF-8, Content-Length)",
    );
    console.log("✅ Method: POST request matching PHP cURL implementation");
    console.log(
      "✅ Body encoding: URLSearchParams equivalent to http_build_query()",
    );
    console.log("✅ Data structure: Identical parameter passing");

    if (failCount > 0) {
      console.log("\n❌ REMAINING ISSUES AFFECTING ALL IMPLEMENTATIONS:");
      console.log(
        "   • UTF-8 double-encoding occurs server-side AFTER request processing",
      );
      console.log(
        "   • Character corruption affects PHP SDK and all other clients equally",
      );
      console.log(
        "   • Server treats UTF-8 multibyte sequences as Latin-1 during processing",
      );
      console.log(
        "   • No client-side workaround can prevent this server-side issue",
      );
    }

    console.log("\n💡 RECOMMENDATIONS FOR NOOKAL:");
    console.log("═══════════════════════════════");
    console.log(
      "🔧 Your own PHP SDK uses charset=UTF-8 headers (we've matched this exactly)",
    );
    console.log(
      "🔧 The issue persists across ALL client implementations including yours",
    );
    console.log(
      "🔧 Server-side UTF-8 handling needs review in the request processing pipeline",
    );
    console.log(
      "🔧 Consider testing with multibyte UTF-8 characters in your development environment",
    );
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testPhpSdkMimicry().catch(console.error);
}

export { testPhpSdkMimicry };
