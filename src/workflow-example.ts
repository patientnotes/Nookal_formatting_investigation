#!/usr/bin/env node

import { createNookalClientFromEnv } from './nookal-client.js';
import { loadEnvFile, prettyPrint, getDateRange, formatDate } from './utils.js';

/**
 * Workflow example: Query appointments -> Get patient -> Get treatment notes
 * This follows a logical data flow to find working endpoints and real IDs
 */
async function workflowExample(): Promise<void> {
  try {
    // Load environment variables
    loadEnvFile();

    // Create client
    const client = createNookalClientFromEnv();

    console.log('🔄 Nookal API Workflow Example\n');
    console.log('Following the data flow: Appointments → Patient → Treatment Notes\n');

    // Step 1: Try to get appointments with a broad date range
    console.log('1️⃣ Step 1: Querying for appointments...');
    let appointments = [];

    try {
      // Try today first
      const todayRange = getDateRange('today');
      appointments = await client.getAppointments({
        startDate: todayRange.startDate,
        endDate: todayRange.endDate
      });

      if (appointments.length === 0) {
        console.log('   No appointments found for today, trying this week...');
        const weekRange = getDateRange('thisWeek');
        appointments = await client.getAppointments({
          startDate: weekRange.startDate,
          endDate: weekRange.endDate
        });
      }

      if (appointments.length === 0) {
        console.log('   No appointments this week, trying this month...');
        const monthRange = getDateRange('thisMonth');
        appointments = await client.getAppointments({
          startDate: monthRange.startDate,
          endDate: monthRange.endDate
        });
      }

      if (appointments.length === 0) {
        console.log('   No appointments this month, trying last month...');
        const lastMonthRange = getDateRange('lastMonth');
        appointments = await client.getAppointments({
          startDate: lastMonthRange.startDate,
          endDate: lastMonthRange.endDate
        });
      }

      if (appointments.length > 0) {
        console.log(`   ✅ Found ${appointments.length} appointments!`);
        console.log(`   📋 First appointment details:`);
        console.log(`      • ID: ${appointments[0].ID}`);
        console.log(`      • Patient ID: ${appointments[0].PatientID}`);
        console.log(`      • Practitioner ID: ${appointments[0].PractitionerID}`);
        console.log(`      • Start Time: ${appointments[0].StartTime}`);
        console.log(`      • Status: ${appointments[0].Status}`);
        console.log('');
      } else {
        console.log('   ❌ No appointments found in any date range');
        console.log('   💡 Try adding some appointments to your Nookal account first\n');
        return;
      }

    } catch (error) {
      console.log(`   ❌ Failed to get appointments: ${error instanceof Error ? error.message : error}`);
      console.log('   💡 This might indicate API access issues or no appointment data\n');
      return;
    }

    // Step 2: Get patient details from the first appointment
    console.log('2️⃣ Step 2: Getting patient details from first appointment...');
    const firstAppointment = appointments[0];
    const patientId = firstAppointment.PatientID;

    try {
      const patients = await client.getPatients({ patientID: patientId });

      if (patients.length > 0) {
        const patient = patients[0];
        console.log(`   ✅ Found patient: ${patient.FirstName} ${patient.LastName}`);
        console.log(`   📋 Patient details:`);
        console.log(`      • ID: ${patient.ID}`);
        console.log(`      • Email: ${patient.Email || 'Not provided'}`);
        console.log(`      • Phone: ${patient.Mobile || patient.Phone || 'Not provided'}`);
        console.log(`      • Date of Birth: ${patient.DateOfBirth || 'Not provided'}`);
        console.log('');

        // Show full patient data to see if treatment notes are included
        console.log('   📄 Full patient data (checking for treatment notes):');
        console.log(prettyPrint(patient));
        console.log('');

      } else {
        console.log(`   ❌ No patient found with ID: ${patientId}`);
        console.log('   💡 The appointment might reference a deleted patient\n');
        return;
      }

    } catch (error) {
      console.log(`   ❌ Failed to get patient: ${error instanceof Error ? error.message : error}`);
      console.log('   💡 This might indicate insufficient permissions for patient data\n');
      return;
    }

    // Step 3: Try to get treatment notes for this patient
    console.log('3️⃣ Step 3: Attempting to get treatment notes...');

    try {
      // Method 1: Try getTreatmentNotes (which calls getPatients)
      console.log('   Method 1: Using getTreatmentNotes...');
      const treatmentNotesData = await client.getTreatmentNotes({
        patientID: patientId
      });

      if (treatmentNotesData.length > 0) {
        console.log(`   ✅ Retrieved patient data (may contain treatment notes)`);
        console.log('   📋 Checking for treatment note fields...');

        const patient = treatmentNotesData[0];
        const possibleNoteFields = Object.keys(patient).filter(key =>
          key.toLowerCase().includes('note') ||
          key.toLowerCase().includes('treatment') ||
          key.toLowerCase().includes('clinical')
        );

        if (possibleNoteFields.length > 0) {
          console.log('   🔍 Found potential treatment note fields:');
          for (const field of possibleNoteFields) {
            console.log(`      • ${field}: ${patient[field as keyof typeof patient]}`);
          }
        } else {
          console.log('   ℹ️ No obvious treatment note fields found in patient data');
        }
        console.log('');
      }

    } catch (error) {
      console.log(`   ❌ Failed to get treatment notes: ${error instanceof Error ? error.message : error}`);
    }

    // Step 4: Try to add a treatment note if we have the required IDs
    console.log('4️⃣ Step 4: Attempting to add a test treatment note...');

    try {
      const noteResult = await client.addTreatmentNote({
        patientId: parseInt(patientId),
        caseId: 1, // We need a real case ID - this might fail
        practitionerId: parseInt(firstAppointment.PractitionerID),
        date: formatDate(new Date()) + ' 12:00:00',
        notes: `Test note added via API on ${formatDate(new Date())}. Patient seen for follow-up.`,
        apptId: parseInt(firstAppointment.ID)
      });

      console.log('   ✅ Treatment note added successfully!');
      console.log('   📋 Result:');
      console.log(prettyPrint(noteResult));
      console.log('');

    } catch (error) {
      console.log(`   ❌ Failed to add treatment note: ${error instanceof Error ? error.message : error}`);
      console.log('   💡 This often fails due to invalid case ID or insufficient permissions');
      console.log('   💡 You may need to get the correct case ID from your Nookal account\n');
    }

    // Step 5: Try other endpoints with the real IDs we found
    console.log('5️⃣ Step 5: Testing other endpoints with real IDs...');

    // Try to get the specific practitioner
    try {
      const practitioners = await client.getPractitioners({
        practitionerID: firstAppointment.PractitionerID
      });

      if (practitioners.length > 0) {
        const practitioner = practitioners[0];
        console.log(`   ✅ Found practitioner: ${practitioner.FirstName} ${practitioner.LastName}`);
        console.log(`      • Title: ${practitioner.Title || 'Not specified'}`);
        console.log(`      • Speciality: ${practitioner.Speciality || 'Not specified'}`);
      }

    } catch (error) {
      console.log(`   ❌ Failed to get practitioner: ${error instanceof Error ? error.message : error}`);
    }

    // Try to get locations
    try {
      const locations = await client.getLocations({
        locationID: firstAppointment.LocationID
      });

      if (locations.length > 0) {
        const location = locations[0];
        console.log(`   ✅ Found location: ${location.Name}`);
        console.log(`      • Address: ${location.Address || 'Not provided'}`);
      }

    } catch (error) {
      console.log(`   ❌ Failed to get location: ${error instanceof Error ? error.message : error}`);
    }

    console.log('\n🎉 Workflow completed!');
    console.log('\n📊 Summary:');
    console.log('• Successfully found appointment data');
    console.log('• Retrieved patient information');
    console.log('• Identified working API endpoints');
    console.log('• Real IDs can now be used for further testing');

  } catch (error) {
    console.error('💥 Workflow failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Alternative approach: Try different date ranges to find appointments
 */
async function findAppointmentsInRange(): Promise<void> {
  console.log('🔍 Searching for appointments across different date ranges...\n');

  try {
    loadEnvFile();
    const client = createNookalClientFromEnv();

    const ranges = [
      { name: 'Today', ...getDateRange('today') },
      { name: 'Yesterday', ...getDateRange('yesterday') },
      { name: 'This Week', ...getDateRange('thisWeek') },
      { name: 'Last Week', ...getDateRange('lastWeek') },
      { name: 'This Month', ...getDateRange('thisMonth') },
      { name: 'Last Month', ...getDateRange('lastMonth') }
    ];

    for (const range of ranges) {
      try {
        console.log(`📅 Checking ${range.name} (${range.startDate} to ${range.endDate})...`);
        const appointments = await client.getAppointments({
          startDate: range.startDate,
          endDate: range.endDate,
          limit: 5
        });

        console.log(`   Found ${appointments.length} appointments`);
        if (appointments.length > 0) {
          console.log('   Sample appointments:');
          for (const apt of appointments.slice(0, 3)) {
            console.log(`   • ${apt.StartTime} - Patient: ${apt.PatientID}, Status: ${apt.Status}`);
          }
        }
        console.log('');

      } catch (error) {
        console.log(`   ❌ Error: ${error instanceof Error ? error.message : error}\n`);
      }
    }

  } catch (error) {
    console.error('💥 Search failed:', error instanceof Error ? error.message : error);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔄 Nookal API Workflow Example

Usage:
  npm run dev src/workflow-example.ts           # Run full workflow
  npm run dev src/workflow-example.ts --search  # Search for appointments only

This script demonstrates:
  • Finding appointments across multiple date ranges
  • Using real appointment data to get patient information
  • Attempting to access treatment notes
  • Testing API endpoints with valid IDs
  • Providing troubleshooting information

The workflow follows logical data relationships:
  Appointments → Patient → Treatment Notes → Related Data
`);
} else if (args.includes('--search')) {
  findAppointmentsInRange().catch(console.error);
} else {
  workflowExample().catch(console.error);
}
