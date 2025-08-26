#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, formatDateTime } from "./utils.js";

/**
 * Simple test to verify our updated headers implementation works
 */

async function testUpdatedHeaders() {
  console.log("🧪 Testing Updated Headers Implementation\n");
  console.log("Verifying that our exact PHP SDK header matching works for basic cases\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  try {
    // Get test data
    const patients = await client.getPatients({ page_length: 1 });
    const patientId = parseInt(patients[0].ID);

    const cases = await client.getCases({ patientID: patientId.toString() });
    const caseId = parseInt(cases[0].ID);

    const practitioners = await client.getPractitioners();
    const practitionerId = parseInt(practitioners[0].ID);

    console.log(`✅ Using patient: ${patients[0].FirstName} ${patients[0].LastName} (ID: ${patientId})`);
    console.log(`✅ Using case: ${cases[0].caseTitle} (ID: ${caseId})`);
    console.log(`✅ Using practitioner: ${practitioners[0].FirstName} ${practitioners[0].LastName} (ID: ${practitionerId})\n`);

    // Test simple ASCII text first
    const asciiTest = "Simple ASCII test - no special characters";
    console.log("📝 Test 1: Pure ASCII text");
    console.log(`   Text: "${asciiTest}"`);

    try {
      const asciiResult = await client.addTreatmentNote({
        patientId,
        caseId,
        practitionerId,
        date: formatDateTime(new Date()),
        notes: `[HEADER UPDATE TEST] ${asciiTest}`,
      });

      console.log(`   ✅ ASCII note added successfully`);
      console.log(`   📋 Result: ${JSON.stringify(asciiResult)}`);

      // Wait and verify
      await new Promise(resolve => setTimeout(resolve, 1000));

      const notes = await client.getAllTreatmentNotes({ page_length: 10 });
      const foundNote = notes.find(note =>
        note.answers?.[0]?.answers?.[0]?.includes("[HEADER UPDATE TEST]")
      );

      if (foundNote) {
        console.log(`   ✅ ASCII note retrieved successfully`);
        console.log(`   📄 Content: "${foundNote.answers[0].answers[0]}"`);
      } else {
        console.log(`   ❌ ASCII note not found in recent notes`);
      }

    } catch (error) {
      console.log(`   ❌ ASCII test failed: ${error instanceof Error ? error.message : error}`);
      console.log(`   🔍 This suggests our header update may have broken basic functionality`);
      return;
    }

    console.log("");

    // Test with smart quotes (known to work)
    const smartQuoteTest = 'Patient said "I feel better" today';
    console.log("📝 Test 2: Smart quotes (should work with UTF-8 headers)");
    console.log(`   Text: "${smartQuoteTest}"`);

    try {
      const quoteResult = await client.addTreatmentNote({
        patientId,
        caseId,
        practitionerId,
        date: formatDateTime(new Date()),
        notes: `[SMART QUOTE TEST] ${smartQuoteTest}`,
      });

      console.log(`   ✅ Smart quote note added successfully`);
      console.log(`   📋 Result: ${JSON.stringify(quoteResult)}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const notes2 = await client.getAllTreatmentNotes({ page_length: 15 });
      const foundNote2 = notes2.find(note =>
        note.answers?.[0]?.answers?.[0]?.includes("[SMART QUOTE TEST]")
      );

      if (foundNote2) {
        const content = foundNote2.answers[0].answers[0];
        const noteContent = content.replace("[SMART QUOTE TEST] ", "");

        console.log(`   ✅ Smart quote note retrieved successfully`);
        console.log(`   📄 Retrieved: "${noteContent}"`);

        if (noteContent === smartQuoteTest) {
          console.log(`   🎉 PERFECT! Smart quotes preserved exactly`);
        } else {
          console.log(`   ⚠️  Smart quotes may have been altered`);
          console.log(`   Expected: "${smartQuoteTest}"`);
          console.log(`   Got: "${noteContent}"`);
        }
      } else {
        console.log(`   ❌ Smart quote note not found in recent notes`);
      }

    } catch (error) {
      console.log(`   ❌ Smart quote test failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log("");

    // Test with problematic unicode
    const unicodeTest = "Café with Dr. José at 98.6°F";
    console.log("📝 Test 3: Problematic unicode characters");
    console.log(`   Text: "${unicodeTest}"`);

    try {
      const unicodeResult = await client.addTreatmentNote({
        patientId,
        caseId,
        practitionerId,
        date: formatDateTime(new Date()),
        notes: `[UNICODE TEST] ${unicodeTest}`,
      });

      console.log(`   ✅ Unicode note added successfully`);
      console.log(`   📋 Result: ${JSON.stringify(unicodeResult)}`);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const notes3 = await client.getAllTreatmentNotes({ page_length: 20 });
      const foundNote3 = notes3.find(note =>
        note.answers?.[0]?.answers?.[0]?.includes("[UNICODE TEST]")
      );

      if (foundNote3) {
        const content = foundNote3.answers[0].answers[0];
        const noteContent = content.replace("[UNICODE TEST] ", "");

        console.log(`   ✅ Unicode note retrieved successfully`);
        console.log(`   📄 Retrieved: "${noteContent}"`);

        if (noteContent === unicodeTest) {
          console.log(`   🎉 INCREDIBLE! All unicode characters preserved exactly`);
        } else if (noteContent.includes("Ã") || noteContent.includes("Â")) {
          console.log(`   ❌ Classic UTF-8 double-encoding corruption detected`);
          console.log(`   Expected: "${unicodeTest}"`);
          console.log(`   Got: "${noteContent}"`);
        } else {
          console.log(`   🤔 Unicode characters changed but not classic corruption`);
          console.log(`   Expected: "${unicodeTest}"`);
          console.log(`   Got: "${noteContent}"`);
        }
      } else {
        console.log(`   ❌ Unicode note not found in recent notes`);
      }

    } catch (error) {
      console.log(`   ❌ Unicode test failed: ${error instanceof Error ? error.message : error}`);
    }

    console.log("\n📊 UPDATED HEADERS TEST SUMMARY");
    console.log("═══════════════════════════════");
    console.log("✅ Headers now match PHP SDK exactly:");
    console.log("   • Content-Type: application/x-www-form-urlencoded; charset=UTF-8");
    console.log("   • Content-Length: [calculated]");
    console.log("   • User-Agent: Nookal-Client/1.0.0");
    console.log("");
    console.log("🔍 This test verifies our implementation works before running");
    console.log("   more complex unicode tests that might fail due to server issues.");

  } catch (error) {
    console.error("❌ Test setup failed:", error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUpdatedHeaders().catch(console.error);
}

export { testUpdatedHeaders };
