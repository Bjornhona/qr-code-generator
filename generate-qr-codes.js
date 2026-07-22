/**
 * Bulk static vCard QR code generator.
 *
 * These QR codes are 100% static: the contact data is embedded directly
 * in the image. There is no server, no account, no subscription, and no
 * expiration date. They will work forever, offline, on any phone.
 *
 * USAGE:
 *   npm install qrcode
 *   node generate-qr-codes.js contacts.csv ./output
 *
 * CSV COLUMNS (header row required):
 *   filename   - output file name, no extension (e.g. "agent_001")
 *   type       - "vcard" or "url" (optional, defaults to "vcard" if blank)
 *   firstName
 *   lastName
 *   org        - company / organization (optional)
 *   title      - job title (optional)
 *   phone      - optional
 *   email      - optional
 *   website    - for type=vcard: contact's website field.
 *                for type=url: this is the URL the QR code encodes.
 *   address    - optional, single string, commas allowed if quoted in CSV
 *
 * For type=vcard rows: filename + firstName are required.
 * For type=url rows: filename + website are required (all other columns ignored).
 */

const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// ---- tiny CSV parser (handles quoted fields with commas) ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const header = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj = {};
      header.forEach((key, idx) => (obj[key] = (r[idx] || "").trim()));
      return obj;
    });
}

// Escape special vCard characters per RFC 6350
function escapeVCard(str = "") {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function normalizeUrl(url = "") {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function buildVCard(row) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];

  const first = escapeVCard(row.firstName || "");
  const last = escapeVCard(row.lastName || "");
  lines.push(`N:${last};${first};;;`);
  lines.push(`FN:${escapeVCard([row.firstName, row.lastName].filter(Boolean).join(" "))}`);

  if (row.org) lines.push(`ORG:${escapeVCard(row.org)}`);
  if (row.title) lines.push(`TITLE:${escapeVCard(row.title)}`);
  if (row.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(row.phone)}`);
  if (row.email) lines.push(`EMAIL:${escapeVCard(row.email)}`);
  if (row.website) lines.push(`URL:${escapeVCard(row.website)}`);
  if (row.address) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(row.address)};;;;`);

  lines.push("END:VCARD");
  return lines.join("\n");
}

async function main() {
  const [, , csvPath, outDir = "./output"] = process.argv;

  if (!csvPath) {
    console.error("Usage: node generate-qr-codes.js <contacts.csv> [outputDir]");
    process.exit(1);
  }

  const csvText = fs.readFileSync(csvPath, "utf8");
  const rows = parseCSV(csvText);

  if (rows.length === 0) {
    console.error("No rows found in CSV.");
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${rows.length} QR codes...`);

  let count = 0;
  for (const row of rows) {
    if (!row.filename) {
      console.warn("Skipping row with no filename:", row);
      continue;
    }

    const type = (row.type || "vcard").trim().toLowerCase();
    let payload;

    if (type === "url") {
      if (!row.website) {
        console.warn(`Skipping "${row.filename}": type=url rows need a website value.`);
        continue;
      }
      payload = normalizeUrl(row.website);
    } else if (type === "vcard") {
      payload = buildVCard(row);
    } else {
      console.warn(`Skipping "${row.filename}": unknown type "${type}" (use "vcard" or "url").`);
      continue;
    }

    const outPath = path.join(outDir, `${row.filename}.png`);

    await QRCode.toFile(outPath, payload, {
      type: "png",
      errorCorrectionLevel: "M", // good balance for vCard-length payloads
      margin: 2,
      width: 1000, // print-quality resolution
    });

    count++;
    if (count % 50 === 0 || count === rows.length) {
      console.log(`  ${count}/${rows.length} done`);
    }
  }

  console.log(`\nDone. ${count} QR codes written to ${path.resolve(outDir)}`);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
