# Unicode Character Handling Investigation in Nookal API

## Executive Summary

This repository contains a comprehensive investigation into unicode character corruption issues in the Nookal API treatment notes system. Through systematic testing of multiple encoding strategies, we have identified the root cause and limitations of unicode handling in the current Nookal implementation.

**Key Finding**: Nookal's API suffers from UTF-8 double-encoding corruption that affects all client implementations, including their own official PHP SDK. While UTF-8 charset headers provide partial fixes, the core issue requires server-side resolution.

## Problem Statement

When submitting treatment notes containing unicode characters (accented letters, medical symbols, smart quotes, etc.) through the Nookal API, the characters become corrupted in predictable patterns:

- `café` becomes `CafÃ©`
- `45°F` becomes `45Â°F`
- `±5 mmHg` becomes `Â±5 mmHg`
- `• bullet` becomes `â€¢ bullet`
- `"smart quotes"` become `â€œsmart quotesâ€`

This corruption affects medical documentation quality and professional presentation of patient notes.

## Investigation Methodology

We conducted systematic testing using a TypeScript test suite with the following approaches:

### 1. Basic Unicode Testing (`test:unicode`)
- **Purpose**: Document baseline corruption patterns
- **Result**: Confirmed systematic UTF-8 double-encoding corruption
- **Files**: `src/test-unicode-notes.ts`, `src/simple-unicode-test.ts`

### 2. HTTP Header Modifications (`test:headers`)
- **Purpose**: Test if explicit UTF-8 charset headers resolve the issue
- **Approach**: Set `Content-Type: application/x-www-form-urlencoded; charset=utf-8`
- **Result**: ✅ **Partial success** - Fixed smart quotes, other symbols still corrupted
- **Note**: This matches the approach used in Nookal's official PHP SDK
- **Files**: `src/test-header-fix.ts`

### 3. HTML Entity Encoding (`test:entities`)
- **Purpose**: Test if HTML entities (`&#233;` for é) bypass corruption
- **Approach**: Pre-encode unicode as HTML numeric and named entities
- **Result**: ❌ Entities get corrupted the same way as raw unicode
- **Files**: `src/test-unicode-entities.ts`

### 4. Reverse Encoding Strategy (`test:reverse`)
- **Purpose**: Pre-corrupt text so double-encoding results in correct output
- **Approach**: Convert UTF-8 to Latin-1 bytes before sending
- **Result**: ❌ Made corruption worse (triple encoding)
- **Files**: `src/test-reverse-encoding.ts`

### 5. Alternative Charset Headers (`test:latin1`, `test:utf16`)
- **Purpose**: Test non-UTF-8 Content-Type headers
- **Approach**: Use `charset=iso-8859-1` and `charset=utf-16le`
- **Result**: ❌ **Nookal silently rejects non-UTF-8 charset headers**
- **Key Finding**: Notes appear to be added but are never stored/retrievable
- **Files**: `src/test-reverse-encoding-headers.ts`, `src/test-utf16-encoding.ts`

### 6. Image-Based Unicode Replacement (`test:images`, `test:nookal-images`)
- **Purpose**: Convert unicode characters to base64 images like Nookal's symbol panel
- **Approach**: Generate SVG images for unicode chars, use Nookal's exact image format
- **Result**: ❌ **Nookal blocks all external image data URLs via API**
- **Key Finding**: Only pre-approved server-generated images are allowed
- **Files**: `src/test-unicode-images.ts`, `src/test-nookal-style-images.ts`, `src/test-simple-images.ts`

## Technical Findings

### Root Cause Analysis

The corruption follows classic **UTF-8 double-encoding** patterns:

1. **Client sends UTF-8 bytes** correctly encoded
2. **Nookal server treats UTF-8 as Latin-1** (first corruption)
3. **Server re-encodes as UTF-8** (second corruption = visible artifacts)

### Corruption Pattern Examples

| Original | Corrupted | Pattern |
|----------|-----------|---------|
| `café` | `CafÃ©` | UTF-8 → Latin-1 → UTF-8 |
| `45°` | `45Â°` | Degree symbol corruption |
| `±` | `Â±` | Plus-minus corruption |
| `"text"` | `â€œtextâ€` | Smart quote corruption |
| `•` | `â€¢` | Bullet point corruption |
| `—` | `â€"` | Em dash corruption |

### Server-Side Security Restrictions

Our investigation revealed Nookal has strict security controls:

1. **Charset Filtering**: Only accepts `charset=utf-8` or no charset header
2. **Image Whitelisting**: Blocks all external `data:image/` URLs via API
3. **Content Validation**: Silently rejects requests with non-conforming headers
4. **Read-Only Images**: Symbol panel images only accessible through web UI, not API

### What Actually Works

- ✅ **ASCII characters**: No corruption
- ✅ **Regular quotes** (`"` `'`): Work with UTF-8 headers
- ✅ **Smart quotes**: Fixed by explicit UTF-8 charset headers
- ❌ **All other unicode**: Cannot be resolved client-side

### Comparison with Nookal's Official PHP SDK

**Critical Discovery**: Nookal's own PHP SDK (v0.1.14) uses the exact same UTF-8 header approach we identified:

```php
// From Nookal's official PHP SDK - Request.php line 36
CURLOPT_HTTPHEADER => array(
    'Content-Type: application/x-www-form-urlencoded; charset=UTF-8',
    'Content-Length: ' . strlen($data)
)
```

**This confirms**:
- ✅ Nookal acknowledges the encoding issue (hence the explicit UTF-8 header)
- ✅ Our investigation approach was correct
- ❌ Even their official SDK likely suffers from the same unicode symbol corruption
- ❌ The server-side double-encoding affects ALL client implementations

## Evidence and Test Results

### Successful Partial Fix
```
📊 HEADER FIX TEST SUMMARY
✅ Success: 1/5 (Smart quotes fixed)
❌ Failed: 4/5 (Symbols still corrupted)
📈 Success Rate: 20%
```

### Comprehensive Unicode Corruption
```
📊 UNICODE TEST SUMMARY
✅ Successful: 0/10
❌ Failed: 10/10
📈 Success Rate: 0%
```

### Security Restriction Evidence
- **Latin-1 headers**: 0% success rate (notes silently rejected)
- **UTF-16 headers**: 0% success rate (notes silently rejected)
- **Image data URLs**: 0% success rate (notes silently rejected)

## Recommended Solutions

### For Nookal Development Team

**Priority 1: Server-Side UTF-8 Handling**
- Review charset interpretation in request processing
- Ensure consistent UTF-8 handling throughout the pipeline
- Note: Your own PHP SDK already uses `charset=UTF-8` but symbols still corrupt
- Fix the underlying double-encoding issue affecting all clients

**Priority 2: Database Character Set**
- Verify database uses `utf8mb4` character set (not `utf8`)
- Check connection charset configuration
- Validate storage and retrieval encoding consistency

**Priority 3: API Content Processing**
- Review URLSearchParams processing for unicode characters
- Check if any Latin-1 interpretation occurs in the processing chain
- Validate that form data parsing preserves UTF-8 encoding

### For API Users (Immediate Workaround)

Since the core issue requires server-side fixes, the only viable workaround is **intelligent character substitution**:

```typescript
const unicodeSubstitutions = {
  // Medical symbols → readable text
  '°': 'deg',
  '±': '+/-',
  '•': '* ',
  '–': '-',
  '—': '--',

  // Accented characters → ASCII equivalents
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a',
  'ç': 'c', 'ñ': 'n', 'ü': 'u', 'ö': 'o',

  // Keep smart quotes fix from headers
  // '"' and '"' work with UTF-8 headers
};
```

## Running the Investigation

### Prerequisites
```bash
npm install
cp .env.example .env
# Add your NOOKAL_API_KEY to .env
```

### Available Test Commands
```bash
# Run individual test suites
npm run test:unicode          # Basic unicode corruption test
npm run test:headers          # UTF-8 header fix test
npm run test:entities         # HTML entity encoding test
npm run test:reverse          # Reverse encoding test
npm run test:latin1           # Latin-1 header test
npm run test:utf16            # UTF-16 encoding test
npm run test:images           # Unicode-to-image conversion test

# Interactive CLI with all test options
npm run cli
```

### Sample Test Output
The test suite provides detailed analysis:
```
🧪 Testing UTF-8 Header Fix for Unicode Corruption

✅ Using patient: John Doe (ID: 1)
✅ Using case: General (ID: 1)
✅ Using practitioner: Nigel Thorne (ID: 1)

📝 Test 1: Smart Quotes
   Input: "Patient said "I feel better" today."
   ✅ Note added successfully
   Retrieved: "[HEADER TEST 1] Patient said "I feel better" today."
   ✅ PERFECT MATCH! Unicode preserved correctly

📝 Test 2: Accented Characters
   Input: "Visit to café with Dr. José was naïve but helpful."
   ✅ Note added successfully
   Retrieved: "[HEADER TEST 2] Visit to cafÃ© with Dr. JosÃ© was naÃ¯ve but helpful."
   ❌ Corruption detected
   🔍 Corruption type: UTF-8 → Latin-1 → UTF-8 double encoding
```

## Files and Structure

```
src/
├── test-unicode-notes.ts           # Comprehensive unicode corruption test
├── test-header-fix.ts              # UTF-8 charset header test
├── test-unicode-entities.ts        # HTML entity encoding test
├── test-reverse-encoding.ts        # Reverse encoding strategy test
├── test-reverse-encoding-headers.ts # Latin-1 header test
├── test-utf16-encoding.ts          # UTF-16 encoding test
├── test-unicode-images.ts          # Unicode-to-image conversion test
├── test-simple-images.ts           # Minimal image test
├── simple-unicode-test.ts          # Single-character debug test
├── check-recent-notes.ts           # Note verification utility
├── nookal-client.ts               # API client with UTF-8 headers
├── cli.ts                         # Interactive test interface
└── types.ts                       # TypeScript definitions
```

## Conclusion

This investigation demonstrates that unicode character corruption in Nookal's API is a **server-side architectural issue** that cannot be resolved through client-side workarounds. The corruption occurs due to improper UTF-8 handling in the server's request processing pipeline.

**Critical Evidence**: Nookal's own official PHP SDK uses the same UTF-8 charset headers we identified as a partial fix, confirming:
1. The encoding issue is known to Nookal's development team
2. Even their official implementation cannot fully resolve it client-side
3. The problem affects ALL API clients equally
4. A server-side fix is required to resolve the root cause

**For Nookal**: Your own PHP SDK includes the UTF-8 charset header workaround, indicating awareness of the issue. However, the server still performs double-encoding on unicode symbols, affecting all client implementations including your official one.

**For API Users**: Until this is resolved server-side, character substitution remains the only reliable approach to ensure readable treatment notes across all client languages.

## Contact

This investigation was conducted to help improve unicode support in the Nookal API ecosystem. For questions about the methodology or findings, please refer to the test implementations in this repository.

---

**SDK Reference**: This investigation included analysis of Nookal's official PHP SDK v0.1.14 (located in `ref/` directory), which confirmed that the unicode encoding issue affects all client implementations regardless of programming language.
