# QR code generator

Bulk generator for **static** QR codes from a CSV file. Contact data (or a URL) is embedded directly in each PNG — no server, account, or expiration. Codes work offline forever.

## Setup

Requires [Node.js](https://nodejs.org/). Install the dependency once:

```bash
npm install
```

## Generate QR codes

```bash
node generate-qr-codes.js contacts.sample.csv ./output
```

- First argument: path to your CSV file
- Second argument: output folder for PNG files (created if missing; defaults to `./output`)

Use your own CSV the same way, for example:

```bash
node generate-qr-codes.js my-projects.csv ./output
```

## CSV format

The first row must be a header. Supported columns:

| Column     | Required when        | Description |
|------------|----------------------|-------------|
| `filename` | always               | Output file name without extension (e.g. `agent_001` → `agent_001.png`) |
| `type`     | optional             | `vcard` (default) or `url` |
| `firstName`| `type=vcard`         | Contact first name |
| `lastName` | optional             | Contact last name |
| `org`      | optional             | Company / organization |
| `title`    | optional             | Job title |
| `phone`    | optional             | Phone number |
| `email`    | optional             | Email address |
| `website`  | `type=url` (required); optional for vCard | For `url`: the link to encode. For `vcard`: contact website field |
| `address`  | optional             | Single string; quote the field if it contains commas |

See `contacts.sample.csv` (vCard examples) and `my-projects.csv` (URL examples).

## Output

PNG files are written to the output folder at 1000×1000 px, suitable for print.
