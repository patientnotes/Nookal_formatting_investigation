#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, prettyPrint, formatDate, formatDateTime } from "./nookal-client;

/**
 * Treatment Notes Example Script
 * Demonstrates how to query and modify patient treatment notes using the Nookal API
 */
async function treatmentNotesExample(): Promise<void> {
  try {
    // Load environment variables
    loadEnvFile();

    // Create client
    const client = createNookalClientFromEnv();

    console.log("📝 Treatment Notes Management Demo\n");

    // Example 1: Get patient data (which includes treatment notes)
    console.log("1️⃣ Fetching patient data with treatment notes...");
    try {
      const patients = await client.getTreatmentNotes({
        patientID: "1", // Replace with actual patient ID
        limit: 1,
      });

      if (patients.length > 0) {
        console.log(
          `Found patient: ${patients[0].FirstName} ${patients[0].LastName}`,
        );
        console.log("Patient data (may include treatment notes):");
        console.log(prettyPrint(patients[0]));
      } else {
        console.log("No patients found with that ID");
      }
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching patient data:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 2: Add a new treatment note
    console.log("2️⃣ Adding a new treatment note...");
    try {
      const currentDateTime = formatDateTime(new Date());

      const noteResult = await client.addTreatmentNote({
        patientId: 123, // Replace with actual patient ID
        caseId: 456, // Replace with actual case ID
        practitionerId: 789, // Replace with actual practitioner ID
        date: currentDateTime,
        notes: `Treatment session on ${formatDate(new Date())}. Patient reports improvement in mobility and reduction in pain levels. Continuing with current physiotherapy regime. Next appointment scheduled for follow-up assessment.`,
        apptId: 101112, // Optional: Replace with actual appointment ID
      });

      console.log("✅ Treatment note added successfully:");
      console.log(prettyPrint(noteResult));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error adding treatment note:",
        error instanceof Error ? error.message : error,
      );
      console.log(
        "💡 Note: Make sure to use valid patient, case, and practitioner IDs\n",
      );
    }

    // Example 3: Add multiple treatment notes for a case
    console.log("3️⃣ Adding multiple treatment notes for comprehensive care...");
    try {
      const treatmentPlan = [
        {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-10 09:00:00",
          notes:
            "Initial assessment completed. Patient presents with chronic lower back pain. Developed treatment plan focusing on strengthening exercises and manual therapy.",
        },
        {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-12 14:30:00",
          notes:
            "Session 2: Introduced core strengthening exercises. Patient responded well to manual therapy. Pain level decreased from 7/10 to 5/10.",
        },
        {
          patientId: 123,
          caseId: 456,
          practitionerId: 789,
          date: "2024-01-15 10:15:00",
          notes:
            "Session 3: Patient showing excellent progress. Pain reduced to 3/10. Increased exercise difficulty. Patient educated on home exercise programme.",
        },
      ];

      for (const [index, note] of treatmentPlan.entries()) {
        try {
          const result = await client.addTreatmentNote(note);
          console.log(
            `✅ Added treatment note ${index + 1}/${treatmentPlan.length}`,
          );

          // Small delay between requests to be respectful to the API
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(
            `❌ Error adding note ${index + 1}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error in bulk note addition:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 4: Search for patients by practitioner to add notes
    console.log("4️⃣ Finding patients for a specific practitioner...");
    try {
      const practitionerPatients = await client.getTreatmentNotes({
        practitionerID: "789", // Replace with actual practitioner ID
        limit: 5,
      });

      console.log(
        `Found ${practitionerPatients.length} patients for practitioner:`,
      );

      for (const patient of practitionerPatients) {
        console.log(
          `- ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`,
        );
      }
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching practitioner patients:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 5: Demonstrate error handling for invalid data
    console.log("5️⃣ Demonstrating error handling...");
    try {
      await client.addTreatmentNote({
        patientId: -1, // Invalid patient ID
        caseId: -1, // Invalid case ID
        practitionerId: -1, // Invalid practitioner ID
        date: "invalid-date", // Invalid date format
        notes: "",
      });
    } catch (error) {
      console.log("✅ Error handling working correctly:");
      console.error(
        "Expected error:",
        error instanceof Error ? error.message : error,
      );
      console.log("\n");
    }

    console.log("🎉 Treatment notes demo completed successfully!");
    console.log("\n📋 Summary of operations:");
    console.log("• Retrieved patient data (including treatment notes)");
    console.log("• Added individual treatment notes");
    console.log("• Added multiple notes for comprehensive care");
    console.log("• Searched patients by practitioner");
    console.log("• Demonstrated proper error handling");
  } catch (error) {
    console.error(
      "💥 Fatal error in treatment notes demo:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

/**
 * Utility function to create a treatment note with current timestamp
 */
async function addCurrentTreatmentNote(
  client: ReturnType<typeof createNookalClientFromEnv>,
  patientId: number,
  caseId: number,
  practitionerId: number,
  notes: string,
  apptId?: number,
): Promise<void> {
  try {
    const result = await client.addTreatmentNote({
      patientId,
      caseId,
      practitionerId,
      date: formatDateTime(new Date()),
      notes,
      ...(apptId && { apptId }),
    });

    console.log(
      `✅ Added note for patient ${patientId}: "${notes.substring(0, 50)}..."`,
    );
    return result;
  } catch (error) {
    console.error(
      `❌ Failed to add note for patient ${patientId}:`,
      error instanceof Error ? error.message : error,
    );
    throw error;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
📝 Treatment Notes Management Example

Usage:
  npm run dev src/treatment-notes-example.ts

This script demonstrates:
  • Retrieving patient data (which includes treatment notes)
  • Adding individual treatment notes
  • Adding multiple notes for comprehensive care documentation
  • Searching for patients by practitioner
  • Proper error handling for invalid data

Environment Setup:
  1. Copy .env.example to .env
  2. Add your NOOKAL_API_KEY
  3. Update patient, case, and practitioner IDs in the script

Note: Make sure to use valid IDs from your Nookal system, as the examples use placeholder values.
`);
} else {
  treatmentNotesExample().catch(console.error);
}

export { addCurrentTreatmentNote };
