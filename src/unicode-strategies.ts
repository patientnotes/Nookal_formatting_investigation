import { createNookalClientFromEnv } from "./nookal-client";
import { loadEnvFile, formatDateTime } from "./utils";

/**
 * Unicode handling strategies for Nookal API integration
 *
 * Based on analysis of Nookal's behavior:
 * 1. Smart quotes work with UTF-8 headers
 * 2. Unicode symbols get double-encoded (UTF-8 → Latin-1 → UTF-8)
 * 3. Nookal UI uses base64 images for special symbols
 */

// Strategy A: Nookal-style symbol to image mapping
const NOOKAL_SYMBOL_IMAGES: Record<string, string> = {
  // Mathematical symbols
  "π": "data:image/gif;base64,R0lGODdhDwAPAPIHAJCWmc7R0rq/wP///3B5fP7+/lpkaObo6CwAAAAADwAPAAADRDi63F1BiONWIAQATBkkQaEUAtENB2EIjgBYxuoU5qidDBBUjs57tUFBs9ktXAxBjCASlnA0A0aTwSlchYPEusj+vo4EADs=",
  "°": "data:image/gif;base64,R0lGODdhCwAPAPEAANjb3KWqrFpkaP///ywAAAAACwAPAAACJZyPqSYtoYQBAiRpAkSYWu5s3OBlXydpBzYEzUI+iydfVgnnSQEAOw==",
  "±": "data:image/gif;base64,R0lGODdhDwAPAPEAAKCmqO7v8FpkaP///ywAAAAADwAPAAACI5yPqcvtGoAAwQF6nahBeK9ckWQIkESZg6qo7uN+7EPXNlMAADs=",
  "∞": "data:image/gif;base64,R0lGODdhDwAPAPIHAOrs7LzAwenq6////+jq6m12em53erq+wCwAAAAADwAPAAADODi63A4GuAZNnAqece4zm9IJFNgcBZmZTpAqFjbEgza5xGIzeCMUgUXP8QsOJz9DIScbEAzMpiwBADs=",

  // Medical symbols commonly used in notes
  "♀": "data:image/gif;base64,R0lGODlhEAAQAPIBAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH5BAkKAAQALAAAAAAQABAAAAM2SLrc/jDKSVe4OOvNu/9gqARDSYpkaZ5oqq5s275wLM90bd94Lu987//AoHBILBqPyKRyyWw6CwA7",
  "♂": "data:image/gif;base64,R0lGODlhEAAQAPIBAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH5BAkKAAQALAAAAAAQABAAAAM4SLrc/jDKSVe4OOvNu/9gqARDSYpkaZ5oqq5s275wLM90bd94Lu987//AoHBILFqPSJRyyWw6nwwAOw==",
  "†": "data:image/gif;base64,R0lGODlhEAAQAPIBAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH5BAkKAAQALAAAAAAQABAAAAM1SLrc/jDKSVe4OOvNu/9gqARDSYpkaZ5oqq5s275wLM90bd94ru987//AoHBILBqPyKRyyWwCADs="
};

// Strategy B: Safe character substitutions
const SAFE_SUBSTITUTIONS: Record<string, string> = {
  // Smart quotes (already working with headers, but keeping for completeness)
  """: '"',
  """: '"',
  "'": "'",
  "'": "'",

  // Dashes
  "—": " - ", // Em dash
  "–": "-",   // En dash

  // Degree and mathematical symbols
  "°": " degrees",
  "±": "+/-",
  "≤": "<=",
  "≥": ">=",
  "≠": "!=",
  "∞": "infinity",
  "π": "pi",
  "√": "sqrt",
  "²": "^2",
  "³": "^3",
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",

  // Currency symbols
  "€": "EUR",
  "£": "GBP",
  "¢": "cents",
  "¥": "JPY",

  // Bullets and list markers
  "•": "* ",
  "◦": "- ",
  "▪": "- ",
  "▫": "- ",
  "‣": "> ",

  // Medical and scientific symbols
  "℃": "C",
  "℉": "F",
  "μ": "micro",
  "α": "alpha",
  "β": "beta",
  "γ": "gamma",
  "δ": "delta",
  "Ω": "ohm",

  // Subscripts (common in medical notes)
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",

  // Superscripts
  "⁰": "^0",
  "¹": "^1",
  "²": "^2",
  "³": "^3",
  "⁴": "^4",
  "⁵": "^5",
  "⁶": "^6",
  "⁷": "^7",
  "⁸": "^8",
  "⁹": "^9",

  // Common accented characters
  "á": "a", "à": "a", "ä": "a", "â": "a", "ã": "a", "å": "a",
  "é": "e", "è": "e", "ë": "e", "ê": "e",
  "í": "i", "ì": "i", "ï": "i", "î": "i",
  "ó": "o", "ò": "o", "ö": "o", "ô": "o", "õ": "o", "ø": "o",
  "ú": "u", "ù": "u", "ü": "u", "û": "u",
  "ý": "y", "ÿ": "y",
  "ñ": "n", "ç": "c",

  // Capitals
  "Á": "A", "À": "A", "Ä": "A", "Â": "A", "Ã": "A", "Å": "A",
  "É": "E", "È": "E", "Ë": "E", "Ê": "E",
  "Í": "I", "Ì": "I", "Ï": "I", "Î": "I",
  "Ó": "O", "Ò": "O", "Ö": "O", "Ô": "O", "Õ": "O", "Ø": "O",
  "Ú": "U", "Ù": "U", "Ü": "U", "Û": "U",
  "Ý": "Y", "Ÿ": "Y",
  "Ñ": "N", "Ç": "C",
};

// Strategy C: Corruption patterns we've observed
const CORRUPTION_FIXES: Record<string, string> = {
  // UTF-8 → Latin-1 → UTF-8 double encoding fixes
  "CafÃ©": "Café",
  "JosÃ©": "José",
  "naÃ¯ve": "naïve",
  "FranÃ§ois": "François",
  "MÃ¼ller": "Müller",
  "rÃ©sumÃ©": "résumé",

  // Symbol corruption fixes
  "Â°": "°",
  "Â±": "±",
  "â€¢": "•",
  "â€"": "—",
  "â€"": "–",
  "â‚¬": "€",
  "Oâ‚‚": "O₂",
  "COâ‚‚": "CO₂",
  "H₂O": "H₂O",

  // Quote corruption fixes
  "â€œ": """,
  "â€": """,
  "â€™": "'",
  "â€˜": "'",
};

/**
 * Strategy A: Convert unicode symbols to Nookal-style base64 images
 */
export function convertSymbolsToImages(text: string): string {
  let result = text;

  for (const [symbol, imageData] of Object.entries(NOOKAL_SYMBOL_IMAGES)) {
    const regex = new RegExp(escapeRegExp(symbol), 'g');
    const imgTag = `<img src="${imageData}" alt="${symbol}" />`;
    result = result.replace(regex, imgTag);
  }

  return result;
}

/**
 * Strategy B: Replace unicode characters with safe ASCII alternatives
 */
export function sanitiseUnicodeForNookal(text: string): string {
  let result = text;

  // Apply substitutions
  for (const [unicode, replacement] of Object.entries(SAFE_SUBSTITUTIONS)) {
    const regex = new RegExp(escapeRegExp(unicode), 'g');
    result = result.replace(regex, replacement);
  }

  // Normalize remaining combining characters
  result = result.normalize('NFKD');
  result = result.replace(/[\u0300-\u036f]/g, ''); // Remove combining diacritics

  // Remove any remaining problematic unicode
  result = result.replace(/[^\x00-\x7F]/g, '?'); // Replace non-ASCII with ?

  return result;
}

/**
 * Strategy C: Fix corrupted text after retrieving from Nookal
 */
export function fixCorruptedText(text: string): string {
  let result = text;

  for (const [corrupted, fixed] of Object.entries(CORRUPTION_FIXES)) {
    const regex = new RegExp(escapeRegExp(corrupted), 'g');
    result = result.replace(regex, fixed);
  }

  return result;
}

/**
 * Hybrid Strategy: Preserve what works, fix what doesn't
 * - Keep smart quotes (they work with headers)
 * - Convert symbols to safe alternatives
 * - Preserve basic accented characters but provide fallbacks
 */
export function hybridUnicodeStrategy(text: string): string {
  let result = text;

  // Keep these characters that work with UTF-8 headers
  const workingChars = ['"', '"', "'", "'"];

  // Apply safe substitutions for everything else
  for (const [unicode, replacement] of Object.entries(SAFE_SUBSTITUTIONS)) {
    if (!workingChars.includes(unicode)) {
      const regex = new RegExp(escapeRegExp(unicode), 'g');
      result = result.replace(regex, replacement);
    }
  }

  return result;
}

/**
 * Detect if text contains potentially problematic unicode
 */
export function hasProblematicUnicode(text: string): boolean {
  // Check for non-ASCII characters that aren't smart quotes
  const problematicPattern = /[^\x00-\x7F""'']/;
  return problematicPattern.test(text);
}

/**
 * Analyse corruption in retrieved text
 */
export function analyseCorruption(original: string, retrieved: string): {
  isCorrupted: boolean;
  corruptionType: string;
  suggestions: string[];
} {
  if (original === retrieved) {
    return {
      isCorrupted: false,
      corruptionType: "none",
      suggestions: []
    };
  }

  const suggestions: string[] = [];
  let corruptionType = "unknown";

  // Check for UTF-8 double encoding
  if (retrieved.includes("Ã")) {
    corruptionType = "utf8-double-encoding";
    suggestions.push("Use sanitiseUnicodeForNookal() before sending");
    suggestions.push("Apply fixCorruptedText() after retrieving");
  }

  // Check for symbol corruption
  if (retrieved.includes("Â") || retrieved.includes("â€")) {
    corruptionType = "symbol-corruption";
    suggestions.push("Use hybridUnicodeStrategy() or convertSymbolsToImages()");
  }

  // Check for HTML entity encoding
  if (retrieved.includes("&lt;") || retrieved.includes("&amp;")) {
    corruptionType = "html-entities";
    suggestions.push("HTML entities detected - server is encoding HTML");
  }

  // Check for length differences
  if (retrieved.length !== original.length) {
    suggestions.push("Character length mismatch detected");
  }

  return {
    isCorrupted: true,
    corruptionType,
    suggestions
  };
}

/**
 * Test all strategies with sample text
 */
export async function testAllStrategies(): Promise<void> {
  console.log("🧪 Testing All Unicode Strategies\n");

  loadEnvFile();
  const client = createNookalClientFromEnv();

  const testText = 'Patient visited café, temperature 98.6°F, BP 120/80 ± 5 mmHg, said "feeling better"';

  console.log(`Original text: "${testText}"\n`);

  const strategies = [
    { name: "Raw (no processing)", process: (t: string) => t },
    { name: "Safe substitutions", process: sanitiseUnicodeForNookal },
    { name: "Hybrid strategy", process: hybridUnicodeStrategy },
    { name: "Symbol to images", process: convertSymbolsToImages }
  ];

  try {
    // Get test data
    const patients = await client.getPatients({ page_length: 1 });
    if (patients.length === 0) {
      console.error("❌ No patients found.");
      return;
    }

    const patientId = parseInt(patients[0].ID);
    const cases = await client.getCases({ patientID: patientId.toString() });
    const caseId = parseInt(cases[0].ID);
    const practitioners = await client.getPractitioners();
    const practitionerId = parseInt(practitioners[0].ID);

    console.log(`✅ Testing with patient ${patients[0].FirstName} ${patients[0].LastName}\n`);

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const processedText = strategy.process(testText);
      const testNote = `[
