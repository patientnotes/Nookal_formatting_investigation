#!/usr/bin/env node

import { createNookalClientFromEnv } from "./nookal-client.js";
import { loadEnvFile } from "./utils.js";

async function checkRecentNotes() {
  console.log("🔍 Checking Recent Notes to Debug Latin-1 Test\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  try {
    const notes = await client.getAllTreatmentNotes({ page_length: 20 });
    console.log(`📝 Found ${notes.length} total notes\n`);

    console.log("🔬 Last 10 notes (most recent first):");
    console.log("═════════════════════════════════════\n");

    const recentNotes = notes.slice(-10).reverse();

    recentNotes.forEach((note, i) => {
      const content = note.answers?.[0]?.answers?.[0] || "No content";
      const noteId = note.noteID || "No ID";
      const date = note.date || "No date";

      console.log(`${i + 1}. Note ID: ${noteId} | Date: ${date}`);
      console.log(`   Content: "${content}"`);
      console.log(`   Length: ${content.length} chars`);

      // Check for our test patterns
      const hasUnicodeTest = content.includes("UNICODE TEST");
      const hasHeaderTest = content.includes("HEADER TEST");
      const hasEntityTest = content.includes("ENTITY TEST");
      const hasReverseTest = content.includes("REVERSE TEST");
      const hasLatin1Test = content.includes("LATIN1 TEST");
      const hasNoCharsetTest = content.includes("NO_CHARSET TEST");

      if (hasUnicodeTest || hasHeaderTest || hasEntityTest || hasReverseTest || hasLatin1Test || hasNoCharsetTest) {
        console.log(`   🧪 TEST NOTE DETECTED!`);
        if (hasLatin1Test) console.log(`      → Latin-1 test found!`);
        if (hasNoCharsetTest) console.log(`      → No-charset test found!`);
      }

      // Check for corruption patterns
      const hasUtf8Corruption = content.includes("Ã") || content.includes("â€") || content.includes("Â");
      if (hasUtf8Corruption) {
        console.log(`   ⚠️  UTF-8 corruption detected`);
      }

      console.log("");
    });

    // Specifically search for Latin-1 test notes
    console.log("🎯 Searching specifically for Latin-1 test notes:");
    console.log("═════════════════════════════════════════════════");

    const latin1Notes = notes.filter(note => {
      const content = note.answers?.[0]?.answers?.[0] || "";
      return content.includes("LATIN1 TEST") || content.includes("NO_CHARSET TEST");
    });

    if (latin1Notes.length > 0) {
      console.log(`✅ Found ${latin1Notes.length} Latin-1 test notes!`);
      latin1Notes.forEach((note, i) => {
        const content = note.answers?.[0]?.answers?.[0] || "";
        console.log(`   ${i + 1}. "${content}"`);
      });
    } else {
      console.log("❌ No Latin-1 test notes found");
      console.log("   This means either:");
      console.log("   • The notes weren't actually created");
      console.log("   • They were created but the content is too corrupted to match");
      console.log("   • There's a delay in indexing/retrieval");
    }

  } catch (error) {
    console.error("❌ Failed to check notes:", error);
  }
}

// Run the check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRecentNotes().catch(console.error);
}

export { checkRecentNotes };
