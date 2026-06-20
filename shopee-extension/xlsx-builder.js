// Pure-JS XLSX builder (no external deps).
// Uses ZIP STORED (no compression) — valid xlsx that Excel/LibreOffice accepts.

// ── CRC32 ─────────────────────────────────────────────────────────────────────
const _CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
    }
    return t;
})();

function _crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ _CRC_TABLE[(c ^ bytes[i]) & 0xFF];
    return (c ^ 0xFFFFFFFF) >>> 0;
}

// ── ZIP (STORED) ───────────────────────────────────────────────────────────────
function _buildZip(fileMap) {
    const enc = new TextEncoder();
    const entries = [];
    const localChunks = [];
    let offset = 0;

    for (const [name, content] of Object.entries(fileMap)) {
        const nameB  = enc.encode(name);
        const dataB  = typeof content === 'string' ? enc.encode(content) : content;
        const crc    = _crc32(dataB);
        const size   = dataB.length;

        const lh = new DataView(new ArrayBuffer(30 + nameB.length));
        lh.setUint32(0,  0x04034b50, true);
        lh.setUint16(4,  20, true);
        lh.setUint16(6,  0,  true);
        lh.setUint16(8,  0,  true); // STORED
        lh.setUint16(10, 0,  true);
        lh.setUint16(12, 0,  true);
        lh.setUint32(14, crc,  true);
        lh.setUint32(18, size, true);
        lh.setUint32(22, size, true);
        lh.setUint16(26, nameB.length, true);
        lh.setUint16(28, 0, true);
        new Uint8Array(lh.buffer).set(nameB, 30);

        entries.push({ nameB, crc, size, offset });
        localChunks.push(new Uint8Array(lh.buffer), dataB);
        offset += 30 + nameB.length + size;
    }

    const cdChunks = [];
    let cdSize = 0;
    for (const { nameB, crc, size, offset: entOff } of entries) {
        const cd = new DataView(new ArrayBuffer(46 + nameB.length));
        cd.setUint32(0,  0x02014b50, true);
        cd.setUint16(4,  20, true); cd.setUint16(6,  20, true);
        cd.setUint16(8,  0,  true); cd.setUint16(10, 0,  true);
        cd.setUint16(12, 0,  true); cd.setUint16(14, 0,  true);
        cd.setUint32(16, crc,    true);
        cd.setUint32(20, size,   true);
        cd.setUint32(24, size,   true);
        cd.setUint16(28, nameB.length, true);
        cd.setUint16(30, 0, true); cd.setUint16(32, 0, true);
        cd.setUint16(34, 0, true); cd.setUint16(36, 0, true);
        cd.setUint32(38, 0,      true);
        cd.setUint32(42, entOff, true);
        new Uint8Array(cd.buffer).set(nameB, 46);
        cdChunks.push(new Uint8Array(cd.buffer));
        cdSize += 46 + nameB.length;
    }

    const eocd = new DataView(new ArrayBuffer(22));
    eocd.setUint32(0,  0x06054b50, true);
    eocd.setUint16(4,  0, true); eocd.setUint16(6, 0, true);
    eocd.setUint16(8,  entries.length, true);
    eocd.setUint16(10, entries.length, true);
    eocd.setUint32(12, cdSize,  true);
    eocd.setUint32(16, offset,  true);
    eocd.setUint16(20, 0, true);

    const all  = [...localChunks, ...cdChunks, new Uint8Array(eocd.buffer)];
    const total = all.reduce((s, c) => s + c.length, 0);
    const out  = new Uint8Array(total);
    let pos = 0;
    for (const c of all) { out.set(c, pos); pos += c.length; }
    return out;
}

// ── Column letter helper ───────────────────────────────────────────────────────
function _col(n) {
    let s = '';
    for (let x = n; x >= 0; x = Math.floor(x / 26) - 1)
        s = String.fromCharCode(65 + (x % 26)) + s;
    return s;
}

function _esc(v) {
    return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                          .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ── Public: buildXlsx(cols, rows) → Uint8Array ────────────────────────────────
// cols : [{ key, label, type? }]  type = 'price' | 'number' | 'url' | 'string'
// rows : array of plain objects
function buildXlsx(cols, rows) {
    // Shared strings
    const strs = [];
    const strMap = new Map();
    function si(v) {
        const s = String(v ?? '');
        if (!strMap.has(s)) { strMap.set(s, strs.length); strs.push(s); }
        return strMap.get(s);
    }

    // Track hyperlinks: { ref, url, rId }
    const hyperlinks = [];

    // Build sheet rows
    const sheetRows = [];

    // Row 1: headers (style 1 = bold)
    const hCells = cols.map((c, ci) =>
        `<c r="${_col(ci)}1" t="s" s="1"><v>${si(c.label)}</v></c>`
    ).join('');
    sheetRows.push(`<row r="1">${hCells}</row>`);

    // Data rows
    rows.forEach((p, ri) => {
        const r = ri + 2;
        const cells = cols.map((c, ci) => {
            const ref = `${_col(ci)}${r}`;
            const val = p[c.key];
            if (c.type === 'url') {
                const url = String(val ?? '');
                if (url) {
                    const rId = `hId${hyperlinks.length + 1}`;
                    hyperlinks.push({ ref, url, rId });
                    // style 3 = blue underline hyperlink font
                    return `<c r="${ref}" t="s" s="3"><v>${si(url)}</v></c>`;
                }
                return `<c r="${ref}" t="s"><v>${si('')}</v></c>`;
            }
            if (c.type === 'price' && typeof val === 'number') {
                return `<c r="${ref}" s="2"><v>${val}</v></c>`;   // price format
            }
            if ((c.type === 'number' || typeof val === 'number') && val !== '') {
                return `<c r="${ref}"><v>${val ?? 0}</v></c>`;    // plain number
            }
            return `<c r="${ref}" t="s"><v>${si(val)}</v></c>`;  // string
        }).join('');
        sheetRows.push(`<row r="${r}">${cells}</row>`);
    });

    // Column widths
    const colWidths = cols.map((c) => {
        if (c.type === 'price')  return 18;
        if (c.key === 'name')    return 42;
        if (c.type === 'url')    return 55;
        if (c.key === 'scraped_at') return 22;
        return 14;
    });
    const colsXml = '<cols>' + colWidths.map((w, i) =>
        `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`
    ).join('') + '</cols>';

    // Hyperlinks section (placed after sheetData in the worksheet)
    const hyperlinksXml = hyperlinks.length
        ? `<hyperlinks>${hyperlinks.map((h) => `<hyperlink ref="${h.ref}" r:id="${h.rId}"/>`).join('')}</hyperlinks>`
        : '';

    // Sheet relationships (hyperlinks live here, not in workbook rels)
    const sheetRelsXml = hyperlinks.length
        ? `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${hyperlinks.map((h) =>
    `<Relationship Id="${h.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${_esc(h.url)}" TargetMode="External"/>`
).join('\n')}
</Relationships>`
        : null;

    // XML files
    const files = {
        '[Content_Types].xml':
`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml"           ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml"  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml"             ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,

        '_rels/.rels':
`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,

        'xl/_rels/workbook.xml.rels':
`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"     Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"        Target="styles.xml"/>
</Relationships>`,

        'xl/workbook.xml':
`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Shopee" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,

        // Style 0 = normal | 1 = bold header | 2 = price (#,##0) | 3 = hyperlink (blue underline)
        'xl/styles.xml':
`<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1">
  <numFmt numFmtId="164" formatCode="#,##0"/>
</numFmts>
<fonts count="3">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><b/><sz val="11"/><name val="Calibri"/></font>
  <font><u/><color rgb="FF0563C1"/><sz val="11"/><name val="Calibri"/></font>
</fonts>
<fills count="2">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4">
  <xf numFmtId="0"   fontId="0" fillId="0" borderId="0" xfId="0"/>
  <xf numFmtId="0"   fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
  <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  <xf numFmtId="0"   fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
</styleSheet>`,

        'xl/sharedStrings.xml': '',  // rebuilt below after rows populate strs

        'xl/worksheets/sheet1.xml':
`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${colsXml}
<sheetData>${sheetRows.join('')}</sheetData>
${hyperlinksXml}
</worksheet>`,
    };

    // sharedStrings must be rebuilt AFTER rows (strs array now fully populated)
    files['xl/sharedStrings.xml'] =
`<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${strs.length}" uniqueCount="${strs.length}">
${strs.map((s) => `<si><t xml:space="preserve">${_esc(s)}</t></si>`).join('\n')}
</sst>`;

    // Sheet rels file only needed when there are hyperlinks
    if (sheetRelsXml) {
        files['xl/worksheets/_rels/sheet1.xml.rels'] = sheetRelsXml;
    }

    return _buildZip(files);
}
