#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, prettyPrint, formatDate, formatDateTime } from "./utils";
import { testUnicodeNotes } from "./test-unicode-notes.js";
import * as readline from "readline";

interface CliContext {
  client: ReturnType<typeof createNookalClientFromEnv>;
  patients: any[];
  practitioners: any[];
  locations: any[];
  appointments: any[];
  cases: any[];
}

class NookalCLI {
  private rl: readline.Interface;
  private context: CliContext;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "nookal> ",
    });

    loadEnvFile();
    this.context = {
      client: createNookalClientFromEnv(),
      patients: [],
      practitioners: [],
      locations: [],
      appointments: [],
      cases: [],
    };
  }

  async start(): Promise<void> {
    console.log("🏥 Nookal API CLI");
    console.log('Type "help" for available commands or "exit" to quit\n');

    this.showPrompt();

    this.rl.on("line", async (input) => {
      const line = input.trim();
      if (line) {
        await this.processCommand(line);
      }
      this.showPrompt();
    });

    this.rl.on("close", () => {
      console.log("\nGoodbye! 👋");
      process.exit(0);
    });
  }

  private showPrompt(): void {
    this.rl.prompt();
  }

  private async processCommand(input: string): Promise<void> {
    const parts = input.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case "help":
          this.showHelp();
          break;

        case "list":
          await this.handleListCommand(args);
          break;

        case "get":
          await this.handleGetCommand(args);
          break;

        case "add":
          await this.handleAddCommand(args);
          break;

        case "search":
          await this.handleSearchCommand(args);
          break;

        case "show":
          await this.handleShowCommand(args);
          break;

        case "test":
          await this.handleTestCommand(args);
          break;

        case "clear":
          console.clear();
          break;

        case "exit":
        case "quit":
          this.rl.close();
          break;

        default:
          console.log(`❌ Unknown command: ${command}`);
          console.log('Type "help" for available commands');
      }
    } catch (error) {
      console.error(
        "❌ Error:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  private showHelp(): void {
    console.log(`
📋 Available Commands:

📊 Listing Data:
  list patients           - List all patients
  list practitioners      - List all practitioners
  list locations         - List all locations
  list appointments      - List appointments
  list cases             - List all cases

🔍 Getting Specific Data:
  get patient <id>       - Get specific patient details
  get notes <patient_id> - Get treatment notes for patient
  get all-notes          - Get all treatment notes
  get cases <patient_id> - Get cases for patient
  get appointment <id>   - Get specific appointment

🔎 Searching:
  search patients <term> - Search patients by name/email

📝 Adding Data:
  add note <patient_id> <case_id> <practitioner_id> <notes>
                        - Add treatment note

🧪 Testing:
  test unicode          - Test unicode/UTF-8 character handling
  test headers          - Test UTF-8 header fix for unicode corruption
  test entities         - Test HTML/Unicode entity encoding
  test reverse          - Test reverse encoding strategy
  test latin1           - Test reverse encoding with Latin-1 headers
  test utf16            - Test UTF-16 encoding strategy
  test images           - Test unicode-to-image conversion
  test simple-images    - Test simple minimal images
  test nookal-images    - Test Nookal-style images with proper alt text
  test php-sdk          - Test exact PHP SDK mimicry approach

📋 Display:
  show patients         - Show cached patient list
  show <type> <index>   - Show item at index from cached list

🛠️  Utility:
  clear                 - Clear screen
  help                  - Show this help
  exit/quit            - Exit CLI

💡 Examples:
  list patients
  get notes 1
  add note 1 1 1 "Patient shows good progress"
  search patients smith
  show patients
  show patient 0
`);
  }

  private async handleListCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(
        "❌ Please specify what to list: patients, practitioners, locations, appointments, cases",
      );
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "patients":
        console.log("📋 Loading patients...");
        this.context.patients = await this.context.client.getPatients({
          page_length: 50,
        });
        console.log(`\n✅ Found ${this.context.patients.length} patients:\n`);
        this.context.patients.forEach((patient, index) => {
          console.log(
            `${index}: ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`,
          );
          if (patient.Email) console.log(`   📧 ${patient.Email}`);
          if (patient.Mobile) console.log(`   📱 ${patient.Mobile}`);
          console.log("");
        });
        break;

      case "practitioners":
        console.log("👩‍⚕️ Loading practitioners...");
        this.context.practitioners =
          await this.context.client.getPractitioners();
        console.log(
          `\n✅ Found ${this.context.practitioners.length} practitioners:\n`,
        );
        this.context.practitioners.forEach((prac, index) => {
          console.log(
            `${index}: ${prac.FirstName} ${prac.LastName} (ID: ${prac.ID})`,
          );
          console.log(`   🏥 ${prac.Speciality || "General"}`);
          if (prac.Email) console.log(`   📧 ${prac.Email}`);
          console.log("");
        });
        break;

      case "locations":
        console.log("🏢 Loading locations...");
        this.context.locations = await this.context.client.getLocations();
        console.log(`\n✅ Found ${this.context.locations.length} locations:\n`);
        this.context.locations.forEach((loc, index) => {
          console.log(`${index}: ${loc.Name} (ID: ${loc.ID})`);
          if (loc.AddressLine1) console.log(`   📍 ${loc.AddressLine1}`);
          if (loc.Phone || loc.Telephone)
            console.log(`   📞 ${loc.Phone || loc.Telephone}`);
          console.log("");
        });
        break;

      case "appointments":
        console.log("📅 Loading appointments...");
        this.context.appointments = await this.context.client.getAppointments({
          page_length: 20,
        });
        console.log(
          `\n✅ Found ${this.context.appointments.length} appointments:\n`,
        );
        this.context.appointments.forEach((appt, index) => {
          console.log(
            `${index}: ${appt.appointmentDate} ${appt.appointmentStartTime} (ID: ${appt.ID})`,
          );
          console.log(
            `   👤 Patient: ${appt.patientID} | 👩‍⚕️ Practitioner: ${appt.practitionerID}`,
          );
          console.log(`   📁 Case: ${appt.caseID} | 📊 Status: ${appt.status}`);
          console.log("");
        });
        break;

      case "cases":
        console.log("📁 Loading all cases...");
        this.context.cases = await this.context.client.getAllCases({
          page_length: 50,
        });
        console.log(`\n✅ Found ${this.context.cases.length} cases:\n`);
        this.context.cases.forEach((case_item, index) => {
          console.log(`${index}: ${case_item.caseTitle} (ID: ${case_item.ID})`);
          console.log(
            `   👤 Patient: ${case_item.patientID} | 👩‍⚕️ Provider: ${case_item.providerName}`,
          );
          console.log(`   📊 Status: ${case_item.status}`);
          if (case_item.Notes) console.log(`   📝 ${case_item.Notes}`);
          console.log("");
        });
        break;

      default:
        console.log(
          "❌ Unknown list type. Available: patients, practitioners, locations, appointments, cases",
        );
    }
  }

  private async handleGetCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(
        "❌ Please specify what to get: patient, notes, all-notes, cases, appointment",
      );
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "patient":
        if (args.length < 2) {
          console.log("❌ Please provide patient ID: get patient <id>");
          return;
        }
        const patientId = args[1];
        console.log(`👤 Getting patient ${patientId}...`);
        const patients = await this.context.client.getPatients({
          patientID: patientId,
        });
        if (patients.length > 0) {
          console.log("\n✅ Patient details:");
          console.log(prettyPrint(patients[0]));
        } else {
          console.log("❌ Patient not found");
        }
        break;

      case "notes":
        if (args.length < 2) {
          console.log("❌ Please provide patient ID: get notes <patient_id>");
          return;
        }
        const notePatientId = args[1];
        console.log(
          `📝 Getting treatment notes for patient ${notePatientId}...`,
        );
        const notes = await this.context.client.getTreatmentNotes({
          patientID: notePatientId,
        });
        console.log(`\n✅ Found ${notes.length} treatment notes:\n`);
        if (notes.length === 0) {
          console.log("   No treatment notes found for this patient.");
        } else {
          notes.forEach((note, index) => {
            console.log(`Note ${index + 1}:`);
            console.log(prettyPrint(note));
            console.log("");
          });
        }
        break;

      case "all-notes":
        console.log("📝 Getting all treatment notes...");
        const allNotes = await this.context.client.getAllTreatmentNotes({
          page_length: 20,
        });
        console.log(`\n✅ Found ${allNotes.length} treatment notes total:\n`);
        if (allNotes.length === 0) {
          console.log("   No treatment notes found in the system.");
        } else {
          allNotes.forEach((note, index) => {
            console.log(`Note ${index + 1}:`);
            console.log(prettyPrint(note));
            console.log("");
          });
        }
        break;

      case "cases":
        if (args.length < 2) {
          console.log("❌ Please provide patient ID: get cases <patient_id>");
          return;
        }
        const casePatientId = args[1];
        console.log(`📁 Getting cases for patient ${casePatientId}...`);
        const patientCases = await this.context.client.getCases({
          patientID: casePatientId,
        });
        console.log(`\n✅ Found ${patientCases.length} cases:\n`);
        patientCases.forEach((case_item, index) => {
          console.log(`Case ${index + 1}:`);
          console.log(prettyPrint(case_item));
          console.log("");
        });
        break;

      case "appointment":
        if (args.length < 2) {
          console.log("❌ Please provide appointment ID: get appointment <id>");
          return;
        }
        const apptId = args[1];
        console.log(`📅 Getting appointment ${apptId}...`);
        const appointments = await this.context.client.getAppointments({
          appointmentID: apptId,
        });
        if (appointments.length > 0) {
          console.log("\n✅ Appointment details:");
          console.log(prettyPrint(appointments[0]));
        } else {
          console.log("❌ Appointment not found");
        }
        break;

      default:
        console.log(
          "❌ Unknown get type. Available: patient, notes, all-notes, cases, appointment",
        );
    }
  }

  private async handleAddCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log("❌ Please specify what to add: note");
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "note":
        if (args.length < 5) {
          console.log(
            "❌ Usage: add note <patient_id> <case_id> <practitioner_id> <notes...>",
          );
          console.log(
            "💡 Example: add note 1 1 1 Patient shows good progress with treatment",
          );
          return;
        }

        const patientId = parseInt(args[1]);
        const caseId = parseInt(args[2]);
        const practitionerId = parseInt(args[3]);
        const notes = args.slice(4).join(" ");

        console.log("📝 Adding treatment note...");
        const result = await this.context.client.addTreatmentNote({
          patientId,
          caseId,
          practitionerId,
          date: formatDateTime(new Date()),
          notes,
        });

        console.log("✅ Treatment note added successfully!");
        console.log(`📋 Note ID: ${JSON.stringify(result)}`);
        break;

      default:
        console.log("❌ Unknown add type. Available: note");
    }
  }

  private async handleSearchCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log("❌ Please specify what to search: patients");
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "patients":
        if (args.length < 2) {
          console.log("❌ Please provide search term: search patients <term>");
          return;
        }

        const searchTerm = args.slice(1).join(" ");
        console.log(`🔍 Searching patients for: "${searchTerm}"`);

        // Search by email if it looks like an email
        if (searchTerm.includes("@")) {
          const patients = await this.context.client.getPatients({
            email: searchTerm,
          });
          console.log(`\n✅ Found ${patients.length} patients by email:\n`);
          patients.forEach((patient, index) => {
            console.log(
              `${index}: ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`,
            );
            console.log(`   📧 ${patient.Email}`);
            console.log("");
          });
        } else {
          // For now, get all patients and filter (could be improved with search API)
          const allPatients = await this.context.client.getPatients({
            page_length: 100,
          });
          const filtered = allPatients.filter(
            (p) =>
              p.FirstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.LastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.Email?.toLowerCase().includes(searchTerm.toLowerCase()),
          );

          console.log(
            `\n✅ Found ${filtered.length} patients matching "${searchTerm}":\n`,
          );
          filtered.forEach((patient, index) => {
            console.log(
              `${index}: ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`,
            );
            if (patient.Email) console.log(`   📧 ${patient.Email}`);
            console.log("");
          });
        }
        break;

      default:
        console.log("❌ Unknown search type. Available: patients");
    }
  }

  private async handleShowCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(
        "❌ Usage: show <type> [index] or show patients/practitioners/locations/appointments/cases",
      );
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "patients":
        if (this.context.patients.length === 0) {
          console.log('❌ No patients cached. Run "list patients" first.');
          return;
        }

        if (args.length > 1) {
          const index = parseInt(args[1]);
          if (index >= 0 && index < this.context.patients.length) {
            console.log(`👤 Patient ${index}:`);
            console.log(prettyPrint(this.context.patients[index]));
          } else {
            console.log(
              `❌ Invalid index. Available: 0-${this.context.patients.length - 1}`,
            );
          }
        } else {
          console.log(`📋 Cached ${this.context.patients.length} patients:`);
          this.context.patients.forEach((patient, index) => {
            console.log(
              `${index}: ${patient.FirstName} ${patient.LastName} (ID: ${patient.ID})`,
            );
          });
        }
        break;

      case "practitioners":
      case "locations":
      case "appointments":
      case "cases":
        console.log(
          `💡 Use "list ${type}" to see available items, then "show ${type} <index>" for details`,
        );
        break;

      default:
        console.log(
          "❌ Unknown show type. Available: patients, practitioners, locations, appointments, cases",
        );
    }
  }

  private async handleTestCommand(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(
        "❌ Please specify what to test: unicode, headers, entities, reverse, latin1, utf16, images, simple-images, nookal-images, php-sdk",
      );
      return;
    }

    const type = args[0].toLowerCase();

    switch (type) {
      case "unicode":
        console.log("🧪 Running unicode character encoding tests...\n");
        await testUnicodeNotes();
        break;

      case "headers":
        console.log("🧪 Testing UTF-8 header fix for unicode corruption...\n");
        const { testHeaderFix } = await import("./test-header-fix.js");
        await testHeaderFix();
        break;

      case "entities":
        console.log("🧪 Testing HTML/Unicode entity encoding...\n");
        const { testUnicodeEntities } = await import(
          "./test-unicode-entities.js"
        );
        await testUnicodeEntities();
        break;

      case "reverse":
        console.log("🧪 Testing reverse encoding strategy...\n");
        const { testReverseEncoding } = await import(
          "./test-reverse-encoding.js"
        );
        await testReverseEncoding();
        break;

      case "latin1":
        console.log("🧪 Testing reverse encoding with Latin-1 headers...\n");
        const { testReverseEncodingWithHeaders } = await import(
          "./test-reverse-encoding-headers.js"
        );
        await testReverseEncodingWithHeaders();
        break;

      case "utf16":
        console.log("🧪 Testing UTF-16 encoding strategy...\n");
        const { testUtf16Encoding } = await import("./test-utf16-encoding.js");
        await testUtf16Encoding();
        break;

      case "images":
        console.log("🧪 Testing unicode-to-image conversion...\n");
        const { testUnicodeImages } = await import("./test-unicode-images.js");
        await testUnicodeImages();
        break;

      case "simple-images":
        console.log("🧪 Testing simple minimal images...\n");
        const { testSimpleImages } = await import("./test-simple-images.js");
        await testSimpleImages();
        break;

      case "nookal-images":
        console.log("🧪 Testing Nookal-style images with proper alt text...\n");
        const { testNookalStyleImages } = await import(
          "./test-nookal-style-images.js"
        );
        await testNookalStyleImages();
        break;

      case "php-sdk":
        console.log("🧪 Testing exact PHP SDK mimicry approach...\n");
        const { testPhpSdkMimicry } = await import("./test-php-sdk-mimicry.js");
        await testPhpSdkMimicry();
        break;

      default:
        console.log(
          "❌ Unknown test type. Available: unicode, headers, entities, reverse, latin1, utf16, images, simple-images, nookal-images, php-sdk",
        );
    }
  }
}

// Start the CLI if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new NookalCLI();
  cli.start().catch(console.error);
}

export { NookalCLI };
