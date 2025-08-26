#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Test script using Nookal's exact image format with proper alt text patterns
 */

async function testNookalStyleImages() {
  console.log("🧪 Testing Nookal-Style Images with Proper Alt Text\n");
  console.log(
    "Theory: Alt text must match a substring of the base64 image data\n",
  );

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Using actual Nookal image data with matching alt text
  const nookalStyleImages = {
    diamond: {
      src: "data:image/gif;base64,R0lGODdhDwAPAPIHAOrs7LzAwenq6////+jq6m12em53erq+wCwAAAAADwAPAAADODi63A4GuAZNnAqece4zm9IJFNgcBZmZTpAqFjbEgza5xGIzeCMUgUXP8QsOJz9DIScbEAzMpiwBADs=",
      alt: "+jq6m12em53erq+wCwAAAAADwAPAAADODi63A4Gu",
      char: "◇",
    },
    // Let's create more by extracting alt from other Nookal images we've seen
    symbol1: {
      src: "data:image/gif;base64,R0lGODdhDwAPAPIHAJCWmc7R0rq/wP///3B5fP7+/lpkaObo6CwAAAAADwAPAAADRDi63F1BiONWIAQATBkkQaEUAtENB2EIjgBYxuoU5qidDBBUjs57tUFBs9ktXAxBjCASlnA0A0aTwSlchYPEusj+vo4EADs=",
      alt: "lpkaObo6CwAAAAADwAPAAADRDi63F1BiONWIAQAT",
      char: "•",
    },
    symbol2: {
      src: "data:image/gif;base64,R0lGODdhDwAPAPEAAKCmqO7v8FpkaP///ywAAAAADwAPAAACI5yPqcvtGoAAwQF6nahBeK9ckWQIkESZg6qo7uN+7EPXNlMAADs=",
      alt: "ywAAAAADwAPAAACI5yPqcvtGoAAwQF6nahBeK9ck",
      char: "○",
    },
    symbol3: {
      src: "data:image/gif;base64,R0lGODdhCwAPAPEAANjb3KWqrFpkaP///ywAAAAACwAPAAACJZyPqSYtoYQBAiRpAkSYWu5s3OBlXydpBzYEzUI+iydfVgnnSQEAOw==",
      alt: "ywAAAAACwAPAAACJZyPqSYtoYQBAiRpAkSYWu5s3",
      char: "±",
    },
  };

  // Test cases using Nookal's exact format
  const testCases = [
    {
      name: "Diamond Symbol",
      original: "Treatment plan ◇ follow-up",
      withNookalImage: `Treatment plan <img src="${nookalStyleImages.diamond.src}" alt="${nookalStyleImages.diamond.alt}" /> follow-up`,
      description: "Using exact diamond image from Nookal",
    },
    {
      name: "Bullet Point",
      original: "Symptoms: • Pain • Swelling",
      withNookalImage: `Symptoms: <img src="${nookalStyleImages.symbol1.src}" alt="${nookalStyleImages.symbol1.alt}" /> Pain <img src="${nookalStyleImages.symbol1.src}" alt="${nookalStyleImages.symbol1.alt}" /> Swelling`,
      description: "Using Nookal bullet image",
    },
    {
      name: "Plus-Minus Symbol",
      original: "BP: 120 ± 5 mmHg",
      withNookalImage: `BP: 120 <img src="${nookalStyleImages.symbol3.src}" alt="${nookalStyleImages.symbol3.alt}" /> 5 mmHg`,
      description: "Using Nookal plus-minus image",
    },
    {
      name: "Control Test - Text Only",
      original: "No symbols here",
      withNookalImage: "No symbols here",
      description: "Control test without images",
    },
    {
      name: "Mixed Symbols",
      original: "Plan: ◇ Check BP ± 5 • Follow up",
      withNookalImage: `Plan: <img src="${nookalStyleImages.diamond.src}" alt="${nookalStyleImages.diamond.alt}" /> Check BP <img src="${nookalStyleImages.symbol3.src}" alt="${nookalStyleImages.symbol3.alt}" /> 5 <img src="${nookalStyleImages.symbol1.src}" alt="${nookalStyleImages.symbol1.alt}" /> Follow up`,
      description: "Multiple Nookal-style symbols",
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

    let successCount = 0;
    let partialCount = 0;
    let failCount = 0;

    console.log("🔬 NOOKAL-STYLE IMAGE TEST RESULTS");
    console.log("══════════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[NOOKAL IMG ${i + 1}] ${testCase.withNookalImage}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(
        `   With Nookal Images: "${testCase.withNookalImage.substring(0, 80)}${testCase.withNookalImage.length > 80 ? "..." : ""}"`,
      );

      try {
        await client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes: testNote,
        });

        console.log(`   ✅ Note added successfully`);
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
                firstAnswer.answers[0].includes(`[NOOKAL IMG ${i + 1}]`)
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

          const noteContent = retrievedText.replace(
            `[NOOKAL IMG ${i + 1}] `,
            "",
          );

          // Check if Nookal-style images were preserved
          if (
            noteContent.includes('<img src="data:image/gif;base64,') &&
            noteContent.includes("alt=")
          ) {
            console.log(
              `   🎉 EXCELLENT! Nookal-style images preserved perfectly!`,
            );

            // Count preserved images
            const imageCount = (noteContent.match(/<img[^>]*>/g) || []).length;
            console.log(
              `   📊 ${imageCount} image(s) preserved with proper alt text`,
            );
            successCount++;
          }
          // Check if images were partially preserved
          else if (
            noteContent.includes("<img") ||
            noteContent.includes("data:image")
          ) {
            console.log(`   ✅ GOOD! Some image elements detected`);
            partialCount++;
          }
          // Check if content matches exactly (for text-only test)
          else if (noteContent === testCase.withNookalImage) {
            console.log(`   ✅ PERFECT! Text content preserved exactly`);
            successCount++;
          } else {
            console.log(`   ❌ Content was modified or corrupted`);
            console.log(`   Expected: "${testCase.withNookalImage}"`);
            console.log(`   Got: "${noteContent}"`);
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
    console.log("📊 NOOKAL-STYLE IMAGE TEST SUMMARY");
    console.log("══════════════════════════════════");
    console.log(
      `🎉 Perfect (images work): ${successCount}/${testCases.length}`,
    );
    console.log(
      `✅ Partial (some success): ${partialCount}/${testCases.length}`,
    );
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    const totalSuccess = successCount + partialCount;
    console.log(
      `📈 Success Rate: ${Math.round((totalSuccess / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log("🎉 BREAKTHROUGH! Nookal-style images work perfectly!");
      console.log("🛠️  Key Discovery: Alt text must match base64 substring");
      console.log("💡 Implementation Strategy:");
      console.log("   1. Use Nookal's existing image library");
      console.log("   2. Match alt text to base64 substring pattern");
      console.log("   3. Create mapping of unicode → Nookal images");
      console.log("   4. Fallback to text substitution for unmapped chars");

      console.log("\n💻 Production Implementation:");
      console.log("   const nookalImageMap = {");
      console.log(
        "     '◇': { src: 'data:image/gif;base64,...', alt: '...' },",
      );
      console.log(
        "     '•': { src: 'data:image/gif;base64,...', alt: '...' },",
      );
      console.log("     '±': { src: 'data:image/gif;base64,...', alt: '...' }");
      console.log("   };");
    } else if (totalSuccess > failCount) {
      console.log("✅ PROMISING! Some Nookal-style images work");
      console.log("🔍 Next: Analyze which alt text patterns succeed");
      console.log("💡 Refine the alt text generation algorithm");
    } else if (totalSuccess > 0) {
      console.log("🤔 MIXED RESULTS: Partial success with Nookal images");
      console.log("🔍 The alt text pattern might need fine-tuning");
    } else {
      console.log("😞 Nookal-style images still blocked");
      console.log("🔍 Security restrictions may be tighter than expected");
      console.log(
        "💡 Consider requesting Nookal's official image API documentation",
      );
    }

    // Analysis of alt text patterns
    console.log("\n🔍 ALT TEXT PATTERN ANALYSIS:");
    console.log("════════════════════════════");
    Object.entries(nookalStyleImages).forEach(([key, img]) => {
      const base64Data = img.src.split(",")[1];
      const altInBase64 = base64Data.includes(img.alt.replace(/[+]/g, ""));
      console.log(
        `${key}: Alt text found in base64: ${altInBase64 ? "✅" : "❌"}`,
      );
      console.log(`   Alt: "${img.alt}"`);
      console.log(
        `   Base64 length: ${base64Data.length}, Alt length: ${img.alt.length}`,
      );
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testNookalStyleImages().catch(console.error);
}

export { testNookalStyleImages };
