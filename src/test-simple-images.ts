#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Test script with simple, minimal images similar to what Nookal actually uses
 */

async function testSimpleImages() {
  console.log("🧪 Testing Simple Image Approach\n");
  console.log("Theory: Use minimal images like Nookal's own symbol panel\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  // Much simpler image data - based on what we saw from Nookal
  const simpleImages = {
    degree:
      "data:image/gif;base64,R0lGODdhDwAPAPEAAKKoqu7v8FpkaP///ywAAAAADwAPAAACK5yPqcsp7aCYUz1zVQAChPEEHQJ4Jcidh/CJk4cCRrnJJGts3Qf1/g9kFAAAOw==",
    bullet:
      "data:image/gif;base64,R0lGODdhDwAPAPIHAJCWmc7R0rq/wP///3B5fP7+/lpkaObo6CwAAAAADwAPAAADRDi63F1BiONWIAQATBkkQaEUAtENB2EIjgBYxuoU5qidDBBUjs57tUFBs9ktXAxBjCASlnA0A0aTwSlchYPEusj+vo4EADs=",
    plusminus:
      "data:image/gif;base64,R0lGODdhCwAPAPEAANjb3KWqrFpkaP///ywAAAAACwAPAAACJZyPqSYtoYQBAiRpAkSYWu5s3OBlXydpBzYEzUI+iydfVgnnSQEAOw==",
  };

  // Test cases with simple replacements
  const testCases = [
    {
      name: "Simple Degree Symbol",
      original: "Temperature: 98.6°F",
      withImages: `Temperature: 98.6<img src="${simpleImages.degree}" alt="degree" />F`,
      description: "Replace degree with minimal GIF",
    },
    {
      name: "Simple Bullet Point",
      original: "Treatment: • Rest",
      withImages: `Treatment: <img src="${simpleImages.bullet}" alt="bullet" /> Rest`,
      description: "Replace bullet with minimal GIF",
    },
    {
      name: "Simple Plus-Minus",
      original: "BP: 120 ± 5 mmHg",
      withImages: `BP: 120 <img src="${simpleImages.plusminus}" alt="plusminus" /> 5 mmHg`,
      description: "Replace ± with minimal GIF",
    },
    {
      name: "Text Only Test",
      original: "No special characters here",
      withImages: "No special characters here",
      description: "Control test with no images",
    },
    {
      name: "Mixed Content",
      original: "Patient: café visit, temp 98.6°",
      withImages: `Patient: cafe visit, temp 98.6<img src="${simpleImages.degree}" alt="degree" />`,
      description: "Mix of substitution and images",
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
    let failCount = 0;

    console.log("🔬 SIMPLE IMAGE TEST RESULTS");
    console.log("════════════════════════════\n");

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const testNote = `[SIMPLE IMG ${i + 1}] ${testCase.withImages}`;

      console.log(`📝 Test ${i + 1}: ${testCase.name}`);
      console.log(`   Description: ${testCase.description}`);
      console.log(`   Original: "${testCase.original}"`);
      console.log(`   With Images: "${testCase.withImages}"`);

      try {
        await client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes: testNote,
        });

        console.log(`   ✅ Note added successfully`);
        await new Promise((resolve) => setTimeout(resolve, 1000));

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
                firstAnswer.answers[0].includes(`[SIMPLE IMG ${i + 1}]`)
              );
            }
          }
          return false;
        });

        if (ourNote) {
          const retrievedText = ourNote.answers[0].answers[0];
          console.log(`   Retrieved: "${retrievedText}"`);

          const noteContent = retrievedText.replace(
            `[SIMPLE IMG ${i + 1}] `,
            "",
          );

          if (noteContent.includes('<img src="data:image/')) {
            console.log(`   🎉 SUCCESS! Images preserved in Nookal!`);
            successCount++;
          } else if (noteContent === testCase.withImages) {
            console.log(`   ✅ PERFECT! Content exactly as sent`);
            successCount++;
          } else {
            console.log(`   ❌ Content modified by Nookal`);
            console.log(`   Expected: "${testCase.withImages}"`);
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
    console.log("📊 SIMPLE IMAGE TEST SUMMARY");
    console.log("════════════════════════════");
    console.log(`✅ Success: ${successCount}/${testCases.length}`);
    console.log(`❌ Failed: ${failCount}/${testCases.length}`);
    console.log(
      `📈 Success Rate: ${Math.round((successCount / testCases.length) * 100)}%\n`,
    );

    if (successCount === testCases.length) {
      console.log("🎉 EXCELLENT! Simple images work perfectly!");
      console.log(
        "💡 Recommendation: Use minimal GIF images for unicode characters",
      );
      console.log("   • Copy Nookal's existing image format");
      console.log("   • Create library of common character images");
      console.log("   • Fallback to text substitution for unsupported chars");
    } else if (successCount > 0) {
      console.log("✅ PARTIAL SUCCESS! Some simple images work");
      console.log("💡 Recommendation: Use working image formats only");
    } else {
      console.log("😞 Simple images still don't work");
      console.log("💡 Next: Analyze exact format of Nookal's working images");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSimpleImages().catch(console.error);
}

export { testSimpleImages };
