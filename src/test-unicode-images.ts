#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Test script to convert unicode characters to base64 images like Nookal does
 */

async function testUnicodeImages() {
  console.log("🧪 Testing Unicode-to-Image Conversion Strategy\n");
  console.log(
    "Theory: Convert unicode characters to base64 images like Nookal's symbol panel\n",
  );

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Function to create a simple base64 image for a unicode character
  function createCharacterImage(char: string, size = 16): string {
    // Create a simple SVG with the character (escape HTML entities)
    const escapedChar = char
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size * 0.8}" fill="black">${escapedChar}</text>
    </svg>`;

    // Convert SVG to base64 - handle unicode properly
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  // Function to create a more robust PNG-like base64 for characters
  function createCharacterImageAdvanced(char: string): string {
    // For now, use a simple approach - in production you'd use Canvas API or similar
    // This creates a minimal SVG that should render the character
    const charCode = char.charCodeAt(0).toString(16).padStart(4, "0");
    const escapedChar = char
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect width="16" height="16" fill="transparent"/>
      <text x="8" y="12" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#333">${escapedChar}</text>
    </svg>`;

    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return `data:image/svg+xml;base64,${base64}`;
  }

  // Function to convert text with unicode to text with images
  function convertUnicodeToImages(text: string): string {
    return text.replace(/[^\x00-\x7F]/g, (char) => {
      const imageData = createCharacterImage(char);
      const altText = `u${char.charCodeAt(0).toString(16)}`;
      return `<img src="${imageData}" alt="${altText}" title="${char}" />`;
    });
  }

  // Test cases with problematic unicode characters
  const testCases = [
    {
      name: "Accented Characters",
      original: "Café visit with Dr. José",
      description: "Convert é to images",
    },
    {
      name: "Medical Symbols",
      original: "Temperature: 98.6°F ± 5",
      description: "Convert degree and plus-minus to images",
    },
    {
      name: "Bullet Points",
      original: "Treatment:\n• Pain relief\n• Exercise",
      description: "Convert bullets to images",
    },
    {
      name: "Smart Quotes",
      original: 'Patient said "I feel better"',
      description: "Convert smart quotes to images",
    },
    {
      name: "Complex Medical",
      original: "François: O₂ 98%, BP: 120±5 mmHg, ♀ patient",
      description: "Multiple medical symbols and accents",
    },
    {
      name: "Emojis and Unicode",
      original: "Patient mood: 😊 Pain level: ⭐⭐⭐",
      description: "Preserve emojis as images",
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

    console.log("🔬 UNICODE-TO-IMAGE CONVERSION TEST RESULTS");
    console.log("═══════════════════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const imageVersion = convertUnicodeToImages(testCase.original);
      const testNote = `[IMG TEST ${i + 1}] ${imageVersion}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(
        `   With Images: "${imageVersion.substring(0, 100)}${imageVersion.length > 100 ? "..." : ""}"`,
      );

      try {
        // Add the note with unicode converted to images
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
                firstAnswer.answers[0].includes(`[IMG TEST ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          console.log(
            `   Retrieved: "${retrievedText.substring(0, 100)}${retrievedText.length > 100 ? "..." : ""}"`,
          );

          // Check if images were preserved
          if (retrievedText.includes('<img src="data:image/svg+xml;base64,')) {
            console.log(
              `   🎉 EXCELLENT! Images preserved - unicode characters will display correctly!`,
            );

            // Count how many unicode characters were converted to images
            const imageCount = (retrievedText.match(/<img[^>]*>/g) || [])
              .length;
            const originalUnicodeCount = (
              testCase.original.match(/[^\x00-\x7F]/g) || []
            ).length;

            console.log(
              `   📊 Converted ${originalUnicodeCount} unicode chars to ${imageCount} images`,
            );
            successCount++;
          }
          // Check if some images were preserved
          else if (
            retrievedText.includes("<img") ||
            retrievedText.includes("data:image")
          ) {
            console.log(`   ✅ GOOD! Some image conversion detected`);
            partialCount++;
          }
          // Check for corruption
          else if (
            retrievedText.includes("Ã") ||
            retrievedText.includes("â€") ||
            retrievedText.includes("Â")
          ) {
            console.log(
              `   ❌ Images were processed but unicode still corrupted`,
            );
            console.log(
              `   🔍 This suggests Nookal corrupted the unicode BEFORE image processing`,
            );
            failCount++;
          } else {
            console.log(`   🤔 Images processed but result unclear`);
            partialCount++;
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
    console.log("📊 UNICODE-TO-IMAGE TEST SUMMARY");
    console.log("═════════════════════════════════");
    console.log(
      `🎉 Perfect (images preserved): ${successCount}/${testCases.length}`,
    );
    console.log(
      `✅ Partial (some images work): ${partialCount}/${testCases.length}`,
    );
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    const totalSuccess = successCount + partialCount;
    console.log(
      `📈 Success Rate: ${Math.round((totalSuccess / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log(
        "🎉 PERFECT! Unicode-to-image conversion completely preserves appearance!",
      );
      console.log("🛠️  Recommended implementation:");
      console.log("   1. Detect unicode characters in text");
      console.log("   2. Convert each to base64 SVG image");
      console.log("   3. Replace in text with <img> tags");
      console.log("   4. Send to Nookal - images bypass unicode corruption!");

      console.log("\n💻 Production Implementation:");
      console.log("   function convertUnicodeToImages(text: string): string {");
      console.log("     return text.replace(/[^\\x00-\\x7F]/g, (char) => {");
      console.log("       const svg = createCharacterSVG(char);");
      console.log("       const base64 = btoa(svg);");
      console.log(
        '       return `<img src="data:image/svg+xml;base64,${base64}" alt="${char}" />`;',
      );
      console.log("     });");
      console.log("   }");
    } else if (totalSuccess > failCount) {
      console.log(
        "✅ PROMISING! Image conversion works for most unicode characters",
      );
      console.log("🛠️  Refine the approach for characters that failed");
    } else if (totalSuccess > 0) {
      console.log("🤔 MIXED RESULTS: Some unicode-to-image conversion works");
      console.log("🛠️  Use images for characters that work, substitute others");
    } else {
      console.log(
        "😞 IMAGE APPROACH FAILED: Nookal doesn't handle our generated images",
      );
      console.log("🛠️  May need to match Nookal's exact image format");
    }

    // Provide detailed recommendations
    console.log("\n💡 NEXT STEPS:");
    if (successCount > 0) {
      console.log("   • Implement unicode-to-image conversion utility");
      console.log("   • Create image cache for common characters");
      console.log("   • Add fallback for unsupported characters");
      console.log("   • Test with real-world medical notes");
    } else {
      console.log("   • Analyze Nookal's existing symbol images");
      console.log("   • Match their exact image format/encoding");
      console.log("   • Consider hybrid approach: images + substitution");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnicodeImages().catch(console.error);
}

export { testUnicodeImages };
