# Nookal API CLI Usage Guide

Welcome to the Nookal API CLI! This interactive command-line interface lets you explore and interact with your Nookal data easily.

## Starting the CLI

```bash
npm run cli
```

You'll see the prompt:
```
🏥 Nookal API CLI
Type "help" for available commands or "exit" to quit

nookal>
```

## Basic Commands

### Getting Help
```
nookal> help
```
Shows all available commands with examples.

### Listing Data

**List all patients:**
```
nookal> list patients
```
Shows all patients with their IDs, names, emails, and phone numbers.

**List practitioners:**
```
nookal> list practitioners
```
Shows all practitioners with their specialties and contact info.

**List locations:**
```
nookal> list locations
```
Shows all clinic locations.

**List appointments:**
```
nookal> list appointments
```
Shows recent appointments with patient/practitioner IDs.

**List all cases:**
```
nookal> list cases
```
Shows all patient cases.

### Getting Specific Data

**Get treatment notes for a patient:**
```
nookal> get notes 1
```
Shows all treatment notes for patient ID 1.

**Get all treatment notes:**
```
nookal> get all-notes
```
Shows all treatment notes in the system.

**Get patient details:**
```
nookal> get patient 1
```
Shows detailed information for patient ID 1.

**Get cases for a patient:**
```
nookal> get cases 1
```
Shows all cases for patient ID 1.

### Adding Treatment Notes

```
nookal> add note 1 1 1 Patient shows excellent progress with treatment
```
Adds a treatment note for:
- Patient ID: 1
- Case ID: 1  
- Practitioner ID: 1
- Notes: "Patient shows excellent progress with treatment"

### Searching

**Search patients by name or email:**
```
nookal> search patients john
nookal> search patients smith  
nookal> search patients john@example.com
```

## Common Workflow Examples

### 1. Find a Patient and View Their Treatment Notes

```bash
# Start the CLI
npm run cli

# List all patients to find the one you want
nookal> list patients

# Get treatment notes for patient ID 1
nookal> get notes 1

# Exit when done
nookal> exit
```

### 2. Add a Treatment Note

```bash
# List patients to find IDs
nookal> list patients

# List cases to find case IDs  
nookal> list cases

# List practitioners to find practitioner IDs
nookal> list practitioners

# Add a treatment note
nookal> add note 1 1 1 Patient responded well to today's session. Recommend continuing current treatment plan.

# Verify it was added
nookal> get notes 1
```

### 3. Review Today's Appointments and Add Notes

```bash
# See today's appointments
nookal> list appointments

# For each appointment, you can:
# 1. Get the patient's existing notes
nookal> get notes 2

# 2. Add new treatment notes
nookal> add note 2 2 1 Completed physiotherapy session. Patient mobility improved significantly.
```

## Pro Tips

### Using Show Commands
After running `list patients`, you can use:
```
nookal> show patients        # Shows the cached list
nookal> show patient 0       # Shows detailed info for patient at index 0
```

### Quick Reference for IDs
- Patient IDs: Use `list patients` to see all patient IDs
- Case IDs: Use `list cases` or `get cases <patient_id>` to find case IDs
- Practitioner IDs: Use `list practitioners` to see practitioner IDs
- Appointment IDs: Use `list appointments` to see appointment IDs

### Treatment Note Requirements
To add a treatment note, you need:
- **Patient ID**: The patient the note is for
- **Case ID**: The case this note belongs to (each patient can have multiple cases)
- **Practitioner ID**: The practitioner creating the note
- **Notes**: The actual treatment note text

### Finding Case IDs
Cases are created automatically when appointments are made. To find the right case ID:
```
nookal> get cases 1    # Get all cases for patient ID 1
```
Most patients will have a "General" case with ID matching their patient ID.

## Error Handling

If you get errors:
- **Patient not found**: Check the patient ID with `list patients`
- **Case not found**: Check case IDs with `get cases <patient_id>`
- **Invalid parameters**: Follow the exact format shown in examples

## Exiting the CLI

```
nookal> exit
```
or
```
nookal> quit
```
or press `Ctrl+C`

## Advanced Usage

### Pagination
The CLI automatically limits results for performance:
- Patients: 50 per page
- Appointments: 20 per page  
- Treatment notes: 20 per page
- Cases: 50 per page

### Date Formats
Treatment notes are automatically timestamped when you add them.

### Multiple Word Notes
You can add notes with multiple words without quotes:
```
nookal> add note 1 1 1 This is a long treatment note with multiple words and it works fine
```

## Troubleshooting

### No Treatment Notes Showing
If `get notes <patient_id>` returns 0 notes:
1. Make sure you're using the correct patient ID
2. Try `get all-notes` to see if there are any notes in the system
3. Add a test note and verify it appears

### Empty Lists
If lists are empty:
- Make sure your API key has the correct permissions
- Check that your Nookal account has data in these areas
- Try the basic endpoints first (patients, practitioners, locations)

### Connection Issues
- Verify your `.env` file has the correct `NOOKAL_API_KEY`
- Check your internet connection
- Ensure your API key is active and not expired

Happy exploring! 🏥