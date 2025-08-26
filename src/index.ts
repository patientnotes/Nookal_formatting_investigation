#!/usr/bin/env node

import { NookalClient, createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile, prettyPrint, getDateRange, formatDate } from "./utils.js";

/**
 * Example usage of the Nookal API client
 */
async function main(): Promise<void> {
  try {
    // Load environment variables
    loadEnvFile();

    // Create client from environment variables
    const client = createNookalClientFromEnv();

    console.log("🚀 Nookal API Client Demo\n");

    // Example 1: Get all patients
    console.log("📋 Fetching all patients...");
    try {
      const patients = await client.getPatients({ limit: 5 });
      console.log(`Found ${patients.length} patients:`);
      console.log(prettyPrint(patients));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching patients:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 2: Search for a specific patient by email
    console.log("🔍 Searching for patient by email...");
    try {
      const patientsByEmail = await client.getPatients({
        email: "patient@example.com",
      });
      console.log("Patients found by email:");
      console.log(prettyPrint(patientsByEmail));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error searching patients by email:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 3: Get practitioners
    console.log("👩‍⚕️ Fetching practitioners...");
    try {
      const practitioners = await client.getPractitioners();
      console.log(`Found ${practitioners.length} practitioners:`);
      console.log(prettyPrint(practitioners));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching practitioners:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 4: Get locations
    console.log("🏢 Fetching locations...");
    try {
      const locations = await client.getLocations();
      console.log(`Found ${locations.length} locations:`);
      console.log(prettyPrint(locations));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching locations:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 5: Get appointments for today
    console.log("📅 Fetching today's appointments...");
    try {
      const todayRange = getDateRange("today");
      const todaysAppointments = await client.getAppointments({
        startDate: todayRange.startDate,
        endDate: todayRange.endDate,
        limit: 10,
      });
      console.log(`Found ${todaysAppointments.length} appointments for today:`);
      console.log(prettyPrint(todaysAppointments));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching appointments:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 6: Get appointments for this week
    console.log("📊 Fetching this week's appointments...");
    try {
      const weekRange = getDateRange("thisWeek");
      const weekAppointments = await client.getAppointments({
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
      });
      console.log(
        `Found ${weekAppointments.length} appointments this week (${weekRange.startDate} to ${weekRange.endDate}):`,
      );
      console.log(prettyPrint(weekAppointments));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching weekly appointments:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 7: Custom endpoint usage
    console.log("🔧 Using custom endpoint...");
    try {
      // This demonstrates how to use endpoints not explicitly implemented
      const customData = await client.customEndpoint("getServices", {
        limit: 5,
      });
      console.log("Custom endpoint data:");
      console.log(prettyPrint(customData));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error with custom endpoint:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 8: Get treatment notes (via patients endpoint)
    console.log("📝 Fetching treatment notes...");
    try {
      const treatmentNotes = await client.getTreatmentNotes({
        patientID: "1", // Replace with actual patient ID
        limit: 5,
      });
      console.log("Treatment notes (patient data):");
      console.log(prettyPrint(treatmentNotes));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching treatment notes:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example 9: Add a treatment note
    console.log("✏️ Adding treatment note...");
    try {
      const noteResult = await client.addTreatmentNote({
        patientId: 1, // Replace with actual patient ID
        caseId: 1, // Replace with actual case ID
        practitionerId: 1, // Replace with actual practitioner ID
        date: "2024-01-15 10:30:00",
        notes:
          "Patient reported improvement in symptoms. Continuing current treatment plan.",
        apptId: 123, // Optional appointment ID
      });
      console.log("Treatment note added successfully:");
      console.log(prettyPrint(noteResult));
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error adding treatment note:",
        error instanceof Error ? error.message : error,
      );
    }

    console.log("✅ Demo completed successfully!");
  } catch (error) {
    console.error(
      "💥 Fatal error:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }
}

/**
 * Advanced usage examples
 */
async function advancedExamples(): Promise<void> {
  console.log("\n🎯 Advanced Usage Examples\n");

  try {
    loadEnvFile();
    const client = createNookalClientFromEnv();

    // Example: Get appointments for a specific practitioner this month
    console.log("👨‍⚕️ Getting practitioner appointments for this month...");
    try {
      const monthRange = getDateRange("thisMonth");
      const practitionerAppointments = await client.getAppointments({
        practitionerID: "1", // Replace with actual practitioner ID
        startDate: monthRange.startDate,
        endDate: monthRange.endDate,
      });
      console.log(
        `Practitioner appointments this month: ${practitionerAppointments.length}`,
      );
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching practitioner appointments:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example: Search patients by name
    console.log("👤 Searching patients by name...");
    try {
      const patientsByName = await client.getPatients({
        firstName: "John",
        lastName: "Smith",
      });
      console.log(`Found ${patientsByName.length} patients named John Smith`);
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error searching patients by name:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example: Get only practitioners available for online booking
    console.log("💻 Getting online booking practitioners...");
    try {
      const onlinePractitioners = await client.getPractitioners({
        showInOnlineBooking: true,
      });
      console.log(
        `Found ${onlinePractitioners.length} practitioners available for online booking`,
      );
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error fetching online practitioners:",
        error instanceof Error ? error.message : error,
      );
    }

    // Example: Add treatment notes for multiple appointments
    console.log("📋 Adding multiple treatment notes...");
    try {
      const notes = [
        {
          patientId: 1,
          caseId: 1,
          practitionerId: 1,
          date: "2024-01-10 09:00:00",
          notes: "Initial consultation completed. Diagnosis: Lower back pain.",
        },
        {
          patientId: 1,
          caseId: 1,
          practitionerId: 1,
          date: "2024-01-12 14:30:00",
          notes:
            "Follow-up session. Patient showing good progress with prescribed exercises.",
        },
      ];

      for (const note of notes) {
        const result = await client.addTreatmentNote(note);
        console.log(`Added note for ${note.date}: Success`);
      }
      console.log("\n");
    } catch (error) {
      console.error(
        "❌ Error adding multiple treatment notes:",
        error instanceof Error ? error.message : error,
      );
    }
  } catch (error) {
    console.error(
      "💥 Advanced examples error:",
      error instanceof Error ? error.message : error,
    );
  }
}

// Run examples based on command line arguments
const args = process.argv.slice(2);

if (args.includes("--advanced") || args.includes("-a")) {
  main()
    .then(() => advancedExamples())
    .catch(console.error);
} else if (args.includes("--help") || args.includes("-h")) {
  console.log(`
🏥 Nookal API Client

Usage:
  npm run dev                 Run basic examples
  npm run dev -- --advanced  Run basic + advanced examples
  npm run dev -- --help      Show this help

Environment Setup:
  1. Copy .env.example to .env
  2. Add your NOOKAL_API_KEY
  3. Optionally modify NOOKAL_BASE_URL

Examples:
  - Get patients, practitioners, locations
  - Search by email, name, date ranges
  - Query appointments by date/practitioner
  - Get and add treatment notes
  - Use custom endpoints
`);
} else {
  main().catch(console.error);
}
