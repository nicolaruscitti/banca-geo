// report.js — generazione XLSX da zero (zero dipendenze esterne)

const _ML = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ══════════════════════════════════════════════════════════════════════════
// 1. XML PARTS
// ══════════════════════════════════════════════════════════════════════════

function _xmlContentTypes() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"           ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml"  ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"             ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function _xmlRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function _xmlWorkbook() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Scostamenti" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function _xmlWorkbookRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

// ── Stili ─────────────────────────────────────────────────────────────────
// Indici xf (usati nel foglio come s="N")
const XF = {
  title:0, subtitle:1,
  colHd:2, colHdEnd:3,
  lblBudget:4, dataBudget:5, totBudget:6,
  lblConsu:7,  dataConsu:8,  totConsu:9,
  lblScostE:10,
  scostPos:11, scostPosEnd:12,
  scostNeg:13, scostNegEnd:14,
  lblScostP:15,
  pctPos:16, pctPosEnd:17,
  pctNeg:18, pctNegEnd:19,
  kpiHd:20, kpiLbl:21, kpiPos:22, kpiNeg:23, kpiNeu:24,
  empty:25,
  dataConsuFuture:26
};

function _xmlStyles() {
  // numFmt ids >= 164 = custom
  const numFmts = `<numFmts count="3">
    <numFmt numFmtId="164" formatCode="#,##0 &quot;€&quot;"/>
    <numFmt numFmtId="165" formatCode="+#,##0 &quot;€&quot;;-#,##0 &quot;€&quot;;0 &quot;€&quot;"/>
    <numFmt numFmtId="166" formatCode="+0.00%;-0.00%;0.00%"/>
  </numFmts>`;

  // fontId: 0=title(nv26b) 1=sub(nv11b) 2=hdr(wh10b) 3=navyEnd(nv10b)
  //         4=body(dk10) 5=green(gn10b) 6=red(rd10b) 7=bold(dk10b) 8=muted(mu10) 9=future(gr10)
  //         10=annoHdr(navyMid10b) — font color = fill color di M4 (#2D4A6E)
  const fonts = `<fonts count="11">
    <font><sz val="26"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>
    <font><sz val="11"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FF1A3557"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF2C3E50"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FF1A6B3A"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FFB71C1C"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FF2C3E50"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF4A6A88"/><name val="Calibri"/></font>
    <font><sz val="10"/><color rgb="FF56636F"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FF2D4A6E"/><name val="Calibri"/></font>
  </fonts>`;

  // fillId: 0=none 1=gray125 2=navySat 3=navyMid 4=subtitleBg 5=grey1 6=white
  //         7=greenBg 8=redBg 9=grey2 10=futureBg
  const sf = (fg) =>
    `<fill><patternFill patternType="solid"><fgColor rgb="FF${fg}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fills = `<fills count="11">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    ${sf('D4E5F7')}
    ${sf('2D4A6E')}
    ${sf('C8D9F0')}
    ${sf('F4F6FA')}
    ${sf('FFFFFF')}
    ${sf('E6F4EA')}
    ${sf('FCE8E8')}
    ${sf('DDE3ED')}
    ${sf('E8EAED')}
  </fills>`;

  // borderId: 0=none 1=thin(grey) 2=medium(navyMid)
  const borders = `<borders count="3">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFDDE3ED"/></left>
      <right style="thin"><color rgb="FFDDE3ED"/></right>
      <top style="thin"><color rgb="FFDDE3ED"/></top>
      <bottom style="thin"><color rgb="FFDDE3ED"/></bottom>
    </border>
    <border>
      <left style="medium"><color rgb="FF2D4A6E"/></left>
      <right style="medium"><color rgb="FF2D4A6E"/></right>
      <top style="medium"><color rgb="FF2D4A6E"/></top>
      <bottom style="medium"><color rgb="FF2D4A6E"/></bottom>
    </border>
  </borders>`;

  const a = (h,v='center',w=0) =>
    `<alignment horizontal="${h}" vertical="${v}" wrapText="${w?'1':'0'}"/>`;

  // xf list — ordine DEVE corrispondere a XF.xxx sopra
  const xfs = [
    // 0  title
    `<xf numFmtId="0" fontId="0" fillId="2" borderId="0" applyFont="1" applyFill="1">${a('center','center',1)}</xf>`,
    // 1  subtitle
    `<xf numFmtId="0" fontId="1" fillId="4" borderId="0" applyFont="1" applyFill="1">${a('center')}</xf>`,
    // 2  colHeader mesi
    `<xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('center')}</xf>`,
    // 3  colHeader ANNO — font color = fill color M4 (#2D4A6E)
    `<xf numFmtId="0" fontId="10" fillId="2" borderId="2" applyFont="1" applyFill="1" applyBorder="1">${a('center')}</xf>`,
    // 4  label Budget
    `<xf numFmtId="0" fontId="7" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 5  data Budget
    `<xf numFmtId="164" fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 6  tot Budget
    `<xf numFmtId="164" fontId="7" fillId="9" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 7  label Consuntivo
    `<xf numFmtId="0" fontId="7" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 8  data Consuntivo
    `<xf numFmtId="164" fontId="4" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 9  tot Consuntivo
    `<xf numFmtId="164" fontId="7" fillId="9" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 10 label Scost €
    `<xf numFmtId="0" fontId="7" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 11 scost € pos cella
    `<xf numFmtId="165" fontId="5" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 12 scost € pos totale
    `<xf numFmtId="165" fontId="5" fillId="7" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 13 scost € neg cella
    `<xf numFmtId="165" fontId="6" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 14 scost € neg totale
    `<xf numFmtId="165" fontId="6" fillId="8" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 15 label Scost %
    `<xf numFmtId="0" fontId="7" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 16 pct pos cella
    `<xf numFmtId="166" fontId="5" fillId="7" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 17 pct pos totale
    `<xf numFmtId="166" fontId="5" fillId="7" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 18 pct neg cella
    `<xf numFmtId="166" fontId="6" fillId="8" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 19 pct neg totale
    `<xf numFmtId="166" fontId="6" fillId="8" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
    // 20 kpi header
    `<xf numFmtId="0" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 21 kpi label
    `<xf numFmtId="0" fontId="8" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 22 kpi val positivo
    `<xf numFmtId="0" fontId="5" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 23 kpi val negativo
    `<xf numFmtId="0" fontId="6" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 24 kpi val neutro
    `<xf numFmtId="0" fontId="7" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${a('left')}</xf>`,
    // 25 empty
    `<xf numFmtId="0" fontId="4" fillId="0" borderId="0"></xf>`,
    // 26 dataConsuFuture — mesi futuri nella riga Consuntivo
    `<xf numFmtId="164" fontId="9" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${a('right')}</xf>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  ${numFmts}${fonts}${fills}${borders}
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>
</styleSheet>`;
}

// ── Foglio dati ───────────────────────────────────────────────────────────
function _xmlSheet(year, budget, consuntivo) {
  const budTot  = budget.reduce((a,b)=>a+b,0);
  const conTot  = consuntivo.reduce((a,b)=>a+b,0);
  const scoE    = consuntivo.map((c,i)=>c-budget[i]);
  const scoP    = scoE.map((s,i)=>budget[i]?s/budget[i]:0);
  const scoETot = conTot - budTot;
  const scoPTot = budTot ? scoETot/budTot : 0;

  const COL = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
  // A=label, B-M=mesi, N=totale

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function sc(col,r,val,si){ return `<c r="${col}${r}" t="inlineStr" s="${si}"><is><t>${esc(val)}</t></is></c>`; }
  function nc(col,r,val,si){ return `<c r="${col}${r}" t="n" s="${si}"><v>${val}</v></c>`; }
  function ec(col,r,si=XF.empty){ return `<c r="${col}${r}" s="${si}"/>`; }

  let r=0;
  const rows=[];

  function row(ht, cells){
    r++;
    rows.push(`<row r="${r}" ht="${ht}" customHeight="1">${cells}</row>`);
  }
  function gap(ht=6){ r++; rows.push(`<row r="${r}" ht="${ht}" customHeight="1"/>`); }

  const curMonth = new Date().getMonth(); // 0-based; mesi > curMonth sono futuri
  const dateStr  = new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});

  // R1: Titolo (merged A-N)
  row(54,
    sc('A',r+1,`Analisi degli Scostamenti — Anno ${year}`,XF.title)+
    COL.slice(1).map(c=>ec(c,r+1,XF.title)).join('')
  );

  // R2: Sottotitolo — riga più alta e font prominente
  row(30,
    sc('A',r+1,`Elaborato il ${dateStr}   ·   Valori in €`,XF.subtitle)+
    COL.slice(1).map(c=>ec(c,r+1,XF.subtitle)).join('')
  );

  gap(8);

  // R4: Header colonne
  row(22,
    sc('A',r+1,'Voce',XF.colHd)+
    _ML.map((m,i)=>sc(COL[i+1],r+1,m,XF.colHd)).join('')+
    sc('N',r+1,'ANNO',XF.colHdEnd)
  );

  // R5: Budget
  row(20,
    sc('A',r+1,'Budget',XF.lblBudget)+
    budget.map((v,i)=>nc(COL[i+1],r+1,v,XF.dataBudget)).join('')+
    nc('N',r+1,budTot,XF.totBudget)
  );

  // R6: Consuntivo — mesi futuri (i > curMonth) in grigio scuro
  row(20,
    sc('A',r+1,'Consuntivo',XF.lblConsu)+
    consuntivo.map((v,i)=>nc(COL[i+1],r+1,v, i>curMonth ? XF.dataConsuFuture : XF.dataConsu)).join('')+
    nc('N',r+1,conTot,XF.totConsu)
  );

  gap(6);

  // R8: Scostamento €
  row(22,
    sc('A',r+1,'Scostamento (€)',XF.lblScostE)+
    scoE.map((v,i)=>nc(COL[i+1],r+1,v,v>=0?XF.scostPos:XF.scostNeg)).join('')+
    nc('N',r+1,scoETot,scoETot>=0?XF.scostPosEnd:XF.scostNegEnd)
  );

  // R9: Scostamento %
  row(22,
    sc('A',r+1,'Scostamento (%)',XF.lblScostP)+
    scoP.map((v,i)=>nc(COL[i+1],r+1,v,v>=0?XF.pctPos:XF.pctNeg)).join('')+
    nc('N',r+1,scoPTot,scoPTot>=0?XF.pctPosEnd:XF.pctNegEnd)
  );

  gap(14);

  // R11: KPI header
  row(20,
    sc('A',r+1,'Sintesi',XF.kpiHd)+
    COL.slice(1).map(c=>ec(c,r+1,XF.kpiHd)).join('')
  );

  const surplus   = scoE.filter(v=>v>=0).length;
  const deficit   = 12 - surplus;
  const maxPos    = Math.max(...scoE);
  const maxNeg    = Math.min(...scoE);
  const mPos      = _ML[scoE.indexOf(maxPos)];
  const mNeg      = _ML[scoE.indexOf(maxNeg)];
  const fmt       = n=>Math.round(n).toLocaleString('it-IT');

  function kpiRow(lbl, val, si){
    row(19,
      sc('A',r+1,lbl,XF.kpiLbl)+
      sc('B',r+1,val,si)+
      COL.slice(2).map(c=>ec(c,r+1,si)).join('')
    );
  }

  kpiRow('Mesi in surplus', `${surplus} / 12`, XF.kpiPos);
  kpiRow('Mesi in deficit', `${deficit} / 12`, deficit>0?XF.kpiNeg:XF.kpiPos);
  kpiRow('Scost. max positivo', `+${fmt(maxPos)} €  —  ${mPos}`, XF.kpiPos);
  kpiRow('Scost. max negativo', `${fmt(maxNeg)} €  —  ${mNeg}`, maxNeg<0?XF.kpiNeg:XF.kpiPos);
  kpiRow('Scost. totale anno',
    `${scoETot>=0?'+':''}${fmt(scoETot)} €   (${(scoPTot*100).toFixed(2)}%)`,
    scoETot>=0?XF.kpiPos:XF.kpiNeg);

  // Merge
  const tot = r;
  const merges = [
    `<mergeCell ref="A1:N1"/>`,
    `<mergeCell ref="A2:N2"/>`,
    `<mergeCell ref="A${tot-5}:N${tot-5}"/>`,
    `<mergeCell ref="B${tot-4}:N${tot-4}"/>`,
    `<mergeCell ref="B${tot-3}:N${tot-3}"/>`,
    `<mergeCell ref="B${tot-2}:N${tot-2}"/>`,
    `<mergeCell ref="B${tot-1}:N${tot-1}"/>`,
    `<mergeCell ref="B${tot}:N${tot}"/>`,
  ].join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView showGridLines="0" zoomScale="60" zoomScaleNormal="60" workbookViewId="0">
      <selection activeCell="A1" sqref="A1"/>
    </sheetView>
  </sheetViews>
  <cols>
    <col min="1" max="14" width="7.86" customWidth="1"/>
  </cols>
  <sheetData>${rows.join('')}</sheetData>
  <mergeCells count="${merges.split('<mergeCell').length-1}">${merges}</mergeCells>
  <pageSetup orientation="landscape" fitToPage="1" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

// ══════════════════════════════════════════════════════════════════════════
// 2. ZIP builder (stored, no deflate — Excel accetta stored entries)
// ══════════════════════════════════════════════════════════════════════════

function _crc32(data) {
  if (!_crc32.t) {
    _crc32.t = new Uint32Array(256);
    for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=c&1?0xEDB88320^(c>>>1):c>>>1;_crc32.t[i]=c;}
  }
  let crc=0xFFFFFFFF;
  for(let i=0;i<data.length;i++) crc=_crc32.t[(crc^data[i])&0xFF]^(crc>>>8);
  return (crc^0xFFFFFFFF)>>>0;
}

function _buildXlsx(files) {
  // files: [{name, data: Uint8Array}]
  const enc  = new TextEncoder();
  const entries = [];

  for(const f of files){
    const name = enc.encode(f.name);
    const data = f.data instanceof Uint8Array ? f.data : enc.encode(f.data);
    const crc  = _crc32(data);

    // Local file header (30 + name)
    const lh = new Uint8Array(30 + name.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true);          // version needed
    lv.setUint16(6, 0,  true);          // flags
    lv.setUint16(8, 0,  true);          // method: stored
    lv.setUint16(10,0,  true);          // mod time
    lv.setUint16(12,0,  true);          // mod date
    lv.setUint32(14,crc,true);
    lv.setUint32(18,data.length,true);  // compressed size
    lv.setUint32(22,data.length,true);  // uncompressed size
    lv.setUint16(26,name.length,true);
    lv.setUint16(28,0,true);            // extra field length
    lh.set(name, 30);

    entries.push({ name, lh, data, crc });
  }

  // Lay out local headers + data, collect offsets
  const offsets = [];
  let totalLocal = 0;
  for(const e of entries){ offsets.push(totalLocal); totalLocal += e.lh.length + e.data.length; }

  // Central directory
  const cdHeaders = entries.map((e,i)=>{
    const cdh = new Uint8Array(46 + e.name.length);
    const cv  = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50,true);
    cv.setUint16(4, 20,true); cv.setUint16(6,20,true);
    cv.setUint16(8, 0,true);  cv.setUint16(10,0,true);
    cv.setUint16(12,0,true);  cv.setUint16(14,0,true);
    cv.setUint32(16,e.crc,true);
    cv.setUint32(20,e.data.length,true);
    cv.setUint32(24,e.data.length,true);
    cv.setUint16(28,e.name.length,true);
    cv.setUint16(30,0,true); cv.setUint16(32,0,true);
    cv.setUint16(34,0,true); cv.setUint16(36,0,true);
    cv.setUint32(38,0,true); cv.setUint32(42,offsets[i],true);
    cdh.set(e.name, 46);
    return cdh;
  });

  const cdSize   = cdHeaders.reduce((s,h)=>s+h.length,0);
  const cdOffset = totalLocal;

  // End of central directory
  const eocd = new Uint8Array(22);
  const ev   = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50,true);
  ev.setUint16(4, 0,true); ev.setUint16(6,0,true);
  ev.setUint16(8, entries.length,true);
  ev.setUint16(10,entries.length,true);
  ev.setUint32(12,cdSize,true);
  ev.setUint32(16,cdOffset,true);
  ev.setUint16(20,0,true);

  // Assemble
  const total = totalLocal + cdSize + 22;
  const out   = new Uint8Array(total);
  let pos = 0;
  for(const e of entries){ out.set(e.lh,pos);pos+=e.lh.length;out.set(e.data,pos);pos+=e.data.length; }
  for(const h of cdHeaders){ out.set(h,pos); pos+=h.length; }
  out.set(eocd,pos);
  return out;
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Entry point
// ══════════════════════════════════════════════════════════════════════════

function generateReportScostamenti() {
  if (typeof REPORT_DATA === 'undefined') {
    alert('Dati non disponibili.\nEseguire prima: python data/generate_report_data.py');
    return;
  }

  const { year, budget, consuntivo } = REPORT_DATA;

  const bytes = _buildXlsx([
    { name: '[Content_Types].xml',          data: _xmlContentTypes() },
    { name: '_rels/.rels',                  data: _xmlRels() },
    { name: 'xl/workbook.xml',              data: _xmlWorkbook() },
    { name: 'xl/_rels/workbook.xml.rels',   data: _xmlWorkbookRels() },
    { name: 'xl/styles.xml',                data: _xmlStyles() },
    { name: 'xl/worksheets/sheet1.xml',     data: _xmlSheet(year, budget, consuntivo) },
  ]);

  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `analisi_scostamenti_${year}.xlsx` });
  a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════
// 4. Report Scostamenti per Città — multi-sheet XLSX
// ══════════════════════════════════════════════════════════════════════════
// Layout per sheet:
//  R1 : Titolo (A1:R1 merged)
//  R2 : Budget       A2:F2 merged + G2:R2 = budget mensile
//  R3 : Consuntivo   A3:F3 merged + G3:R3 = somma ricavi clienti (= city consuntivo)
//  R4 : Scost. €     A4:F4 merged + G4:R4 = G3-G2
//  R5 : Scost. %     A5:F5 merged + G5:R5 = (G3-G2)/G2
//  R6 : header sezione "Consuntivo" (A6:R6 merged)
//  R7 : intestazioni colonne
//  R8+: righe clienti  (Customer, Città, Regione, Età, Stato, Reddito, Gen…Dic)

const _MF  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
              'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const _C18 = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R'];
const _SL  = ['Single','Coppia','Famiglia'];

// XF index map for the city report
const _XFC = {
  ttl:0, lbBud:1, lbCon:2, lbSE:3, lbSP:4,
  vBud:5, vCon:6,
  sEP:7, sEN:8, sPP:9, sPN:10,
  secHd:11, colHd:12,
  dT:13, dN:14, dI:15, dM:16,
  dTA:17, dNA:18, dIA:19, dMA:20,
  emp:21,
  vConFut:22,  // consuntivo mesi futuri (grigio)
  secHdSm:23   // section header compresso (riga 6, metà altezza)
};

function _stylesCitta() {
  const nf = `<numFmts count="3">` +
    `<numFmt numFmtId="164" formatCode="#,##0 &quot;\u20ac&quot;"/>` +
    `<numFmt numFmtId="165" formatCode="+#,##0 &quot;\u20ac&quot;;-#,##0 &quot;\u20ac&quot;;0 &quot;\u20ac&quot;"/>` +
    `<numFmt numFmtId="166" formatCode="+0.0%;-0.0%;0.0%"/>` +
    `</numFmts>`;

  // fontId: 0=nv11b(fallback titolo) 1=nv10b 2=nv10b 3=dk9 4=gn9b 5=rd9b 6=wh10b 7=wh9b 8=mu9
  //         9=nv16b (titolo R1)  10=wh8b (secHd compresso R6)
  const fnt = `<fonts count="11">` +
    `<font><sz val="11"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>` +
    `<font><sz val="10"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>` +
    `<font><sz val="10"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><color rgb="FF1A3557"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><b/><color rgb="FF1A6B3A"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><b/><color rgb="FFB71C1C"/><name val="Calibri"/></font>` +
    `<font><sz val="10"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><color rgb="FF6E7D8C"/><name val="Calibri"/></font>` +
    `<font><sz val="18"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>` +
    `<font><sz val="8"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `</fonts>`;

  // fillId: 0=none 1=gray125 2=navy#1C3D72 3=navyMid#2A5298 4=lightGray#F4F6FA
  //         5=white#FFF 6=green#E6F4EA 7=red#FCE8E8 8=midBlue#D4E5F7
  //         9=altBlue#EBF1FA 10=vLightBlue#F0F4FC
  const sf = fg => `<fill><patternFill patternType="solid"><fgColor rgb="FF${fg}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fil = `<fills count="11">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    sf('1C3D72') + sf('2A5298') + sf('F4F6FA') +
    sf('FFFFFF') + sf('E6F4EA') + sf('FCE8E8') +
    sf('D4E5F7') + sf('EBF1FA') + sf('F0F4FC') +
    `</fills>`;

  const brd = `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFDDE3ED"/></left>` +
    `<right style="thin"><color rgb="FFDDE3ED"/></right>` +
    `<top style="thin"><color rgb="FFDDE3ED"/></top>` +
    `<bottom style="thin"><color rgb="FFDDE3ED"/></bottom>` +
    `</border></borders>`;

  const al = (h, v, w) =>
    `<alignment horizontal="${h}" vertical="${v||'center'}" wrapText="${w?'1':'0'}"/>`;

  const xfs = [
    `<xf numFmtId="0"   fontId="9" fillId="4"  borderId="0" xfId="0" applyFont="1" applyFill="1">${al('left','center',0)}</xf>`,  // 0 ttl — navy 16pt su grigio chiaro #F4F6FA
    `<xf numFmtId="0"   fontId="1" fillId="4"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,  // 1 lbBud
    `<xf numFmtId="0"   fontId="1" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,  // 2 lbCon
    `<xf numFmtId="0"   fontId="1" fillId="4"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,  // 3 lbSE
    `<xf numFmtId="0"   fontId="1" fillId="4"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,  // 4 lbSP
    `<xf numFmtId="164" fontId="3" fillId="4"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 5 vBud
    `<xf numFmtId="164" fontId="3" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 6 vCon
    `<xf numFmtId="165" fontId="4" fillId="6"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 7 sEP
    `<xf numFmtId="165" fontId="5" fillId="7"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 8 sEN
    `<xf numFmtId="166" fontId="4" fillId="6"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 9 sPP
    `<xf numFmtId="166" fontId="5" fillId="7"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 10 sPN
    `<xf numFmtId="0"   fontId="6" fillId="3"  borderId="0" applyFont="1" applyFill="1">${al('left')}</xf>`,  // 11 secHd
    `<xf numFmtId="0"   fontId="7" fillId="2"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('center')}</xf>`,  // 12 colHd
    `<xf numFmtId="0"   fontId="3" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,   // 13 dT
    `<xf numFmtId="0"   fontId="3" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('right')}</xf>`,  // 14 dN
    `<xf numFmtId="164" fontId="3" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 15 dI
    `<xf numFmtId="164" fontId="3" fillId="5"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 16 dM
    `<xf numFmtId="0"   fontId="3" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,   // 17 dTA
    `<xf numFmtId="0"   fontId="3" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('right')}</xf>`,  // 18 dNA
    `<xf numFmtId="164" fontId="3" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 19 dIA
    `<xf numFmtId="164" fontId="3" fillId="10" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 20 dMA
    `<xf numFmtId="0"   fontId="3" fillId="0"  borderId="0"></xf>`,  // 21 emp
    `<xf numFmtId="164" fontId="8" fillId="4"  borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,  // 22 vConFut
    `<xf numFmtId="0"   fontId="10" fillId="3" borderId="0" applyFont="1" applyFill="1">${al('left','center',0)}</xf>`,  // 23 secHdSm — 8pt bianco su #2A5298, riga 6 compressa
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    nf + fnt + fil + brd +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `</styleSheet>`;
}

function _sheetXmlCitta(sheetCityIds, allCusts) {
  _buildRevenueCache();
  const now     = new Date();
  const dateStr = now.toLocaleDateString('it-IT', {day:'2-digit', month:'long', year:'numeric'});
  const curMonth = now.getMonth(); // 0-based; mesi con indice > curMonth sono futuri

  // Customers for this sheet
  const custs = allCusts.filter(c => sheetCityIds.indexOf(c.cityId) >= 0);

  // City total revenue (used for proportional ops distribution)
  const ctRev = {};
  for (const c of custs) {
    ctRev[c.cityId] = (ctRev[c.cityId] || 0) + getCustomerTotalRevenue(c.id, c.pmask);
  }

  // Budget per month for this sheet
  const bud = Array.from({length: 12}, (_, m) =>
    sheetCityIds.reduce((s, cid) => {
      const cd = REPORT_DATA.byCity[String(cid)];
      return s + (cd ? cd.budget[m] : 0);
    }, 0)
  );

  // Per-customer monthly values (arrotondati all'euro intero):
  // monthly[m] = custRev + cityOps[m] * (custRev / cityTotRev)
  // where cityOps[m] = cityConsuntivo[m] - cityTotRev
  // Arrotondando prima di accumulare garantisce:
  //   SUM(righe dettaglio col m) == valore consuntivo riga 3
  const custData = custs.map(c => {
    const rev  = getCustomerTotalRevenue(c.id, c.pmask);
    const tot  = ctRev[c.cityId] || 1;
    const cd   = REPORT_DATA.byCity[String(c.cityId)];
    const mo   = Array.from({length: 12}, (_, m) => {
      if (!cd) return Math.round(rev);
      const ops = cd.consuntivo[m] - tot;
      return Math.round(rev + ops * rev / tot);  // intero — SUM(dettaglio) = consuntivo
    });
    return { ...c, mo };
  });

  // Consuntivo row = somma esatta dei valori interi per colonna
  const con  = Array.from({length: 12}, (_, m) => custData.reduce((s, c) => s + c.mo[m], 0));
  const scoE = con.map((c, i) => c - bud[i]);
  const scoP = scoE.map((s, i) => bud[i] ? s / bud[i] : 0);

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function sc(col, r, val, si) { return `<c r="${col}${r}" t="inlineStr" s="${si}"><is><t>${esc(val)}</t></is></c>`; }
  function nc(col, r, val, si) { return `<c r="${col}${r}" t="n" s="${si}"><v>${val}</v></c>`; }
  function ec(col, r, si)      { return `<c r="${col}${r}" s="${si != null ? si : _XFC.emp}"/>`; }

  let rn = 0;
  const rows = [];
  function pr(ht, cells) { rn++; rows.push(`<row r="${rn}" ht="${ht}" customHeight="1">${cells}</row>`); }

  // R1 — Title
  pr(38,
    sc('A', rn+1, `Elaborato il ${dateStr}   \u00b7   Valori in \u20ac`, _XFC.ttl) +
    _C18.slice(1).map(c => ec(c, rn+1, _XFC.ttl)).join(''));


  // R2 — Budget
  pr(18,
    sc('A', rn+1, 'Budget', _XFC.lbBud) +
    _C18.slice(1, 6).map(c => ec(c, rn+1, _XFC.lbBud)).join('') +
    bud.map((v, i) => nc(_C18[6+i], rn+1, Math.round(v), _XFC.vBud)).join(''));

  // R3 — Consuntivo (mesi futuri in grigio)
  pr(18,
    sc('A', rn+1, 'Consuntivo', _XFC.lbCon) +
    _C18.slice(1, 6).map(c => ec(c, rn+1, _XFC.lbCon)).join('') +
    con.map((v, i) => nc(_C18[6+i], rn+1, v, i > curMonth ? _XFC.vConFut : _XFC.vCon)).join(''));

  // R4 — Scostamento €
  pr(18,
    sc('A', rn+1, 'Scostamento (\u20ac)', _XFC.lbSE) +
    _C18.slice(1, 6).map(c => ec(c, rn+1, _XFC.lbSE)).join('') +
    scoE.map((v, i) => nc(_C18[6+i], rn+1, v, v >= 0 ? _XFC.sEP : _XFC.sEN)).join(''));

  // R5 — Scostamento %
  pr(18,
    sc('A', rn+1, 'Scostamento (%)', _XFC.lbSP) +
    _C18.slice(1, 6).map(c => ec(c, rn+1, _XFC.lbSP)).join('') +
    scoP.map((v, i) => nc(_C18[6+i], rn+1, v, v >= 0 ? _XFC.sPP : _XFC.sPN)).join(''));

  // R6 — Section header (metà altezza: 9pt, font 8pt bianco su #2A5298)
  pr(9,
    sc('A', rn+1, 'Consuntivo', _XFC.secHdSm) +
    _C18.slice(1).map(c => ec(c, rn+1, _XFC.secHdSm)).join(''));

  // R7 — Column headers
  const hdrs = ['Customer','Citt\u00e0','Regione','Et\u00e0','Stato familiare','Reddito annuo', ..._MF];
  pr(20, hdrs.map((h, i) => sc(_C18[i], rn+1, h, _XFC.colHd)).join(''));

  // R8+ — Customer rows (alternating fills)
  custData.forEach((c, idx) => {
    const alt = idx % 2 === 1;
    const xT  = alt ? _XFC.dTA : _XFC.dT;
    const xN  = alt ? _XFC.dNA : _XFC.dN;
    const xI  = alt ? _XFC.dIA : _XFC.dI;
    const xM  = alt ? _XFC.dMA : _XFC.dM;
    pr(15,
      nc('A', rn+1, c.id,            xN) +
      sc('B', rn+1, c.cityName,      xT) +
      sc('C', rn+1, c.reg,           xT) +
      nc('D', rn+1, c.eta,           xN) +
      sc('E', rn+1, _SL[c.stato]||'',xT) +
      nc('F', rn+1, c.reddito,       xI) +
      c.mo.map((v, i) => nc(_C18[6+i], rn+1, Math.round(v), xM)).join(''));
  });

  const merges =
    `<mergeCell ref="A1:R1"/>` +
    `<mergeCell ref="A2:F2"/>` +
    `<mergeCell ref="A3:F3"/>` +
    `<mergeCell ref="A4:F4"/>` +
    `<mergeCell ref="A5:F5"/>` +
    `<mergeCell ref="A6:R6"/>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView showGridLines="0" zoomScale="80" workbookViewId="0">` +
    `<selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>` +
    `<cols>` +
    `<col min="1" max="1" width="10"  customWidth="1"/>` +
    `<col min="2" max="2" width="14"  customWidth="1"/>` +
    `<col min="3" max="3" width="12"  customWidth="1"/>` +
    `<col min="4" max="4" width="6"   customWidth="1"/>` +
    `<col min="5" max="5" width="13"  customWidth="1"/>` +
    `<col min="6" max="6" width="14"  customWidth="1"/>` +
    `<col min="7" max="18" width="12" customWidth="1"/>` +
    `</cols>` +
    `<sheetData>${rows.join('')}</sheetData>` +
    `<mergeCells count="6">${merges}</mergeCells>` +
    `<pageSetup orientation="landscape" fitToPage="1" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`;
}

function generateReportCitta(selectedSet) {
  if (!selectedSet || selectedSet.size === 0) return;
  if (typeof REPORT_DATA === 'undefined') {
    alert('Dati non disponibili.\nEseguire prima: python data/generate_report_data.py');
    return;
  }
  _buildRevenueCache();

  const selIds = [...selectedSet];
  const cbId   = Object.fromEntries(CITIES.map(c => [c.id, c]));
  const escAttr = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Build flat customer list for selected cities
  const allCusts = CUSTOMERS
    .filter(c => selectedSet.has(c[1]))
    .map(c => ({
      id: c[0], cityId: c[1], eta: c[2], stato: c[3], reddito: c[4], pmask: c[5],
      cityName: cbId[c[1]] ? cbId[c[1]].name : '',
      reg:      cbId[c[1]] ? cbId[c[1]].reg  : ''
    }));

  // Sheet definitions: TOTALE first (only when >1 city), then one per city
  const multi = selIds.length > 1;
  const sheetDefs = [];
  if (multi) sheetDefs.push({ name: 'TOTALE', cityIds: selIds });
  selIds.forEach(cid => {
    const raw = cbId[cid] ? cbId[cid].name : 'Citt\u00e0 ' + cid;
    sheetDefs.push({ name: raw.replace(/[:\\/?*[\]]/g, '').substring(0, 31), cityIds: [cid] });
  });

  // Content Types
  const ctypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheetDefs.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const wb = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    sheetDefs.map((s, i) => `<sheet name="${escAttr(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('') +
    `</sheets></workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheetDefs.map((_, i) =>
      `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`
    ).join('') +
    `<Relationship Id="rId${sheetDefs.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files = [
    { name: '[Content_Types].xml',        data: ctypes  },
    { name: '_rels/.rels',                data: rels    },
    { name: 'xl/workbook.xml',            data: wb      },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels  },
    { name: 'xl/styles.xml',              data: _stylesCitta() },
    ...sheetDefs.map((s, i) => ({
      name: `xl/worksheets/sheet${i+1}.xml`,
      data: _sheetXmlCitta(s.cityIds, allCusts)
    }))
  ];

  const bytes = _buildXlsx(files);
  const blob  = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url   = URL.createObjectURL(blob);
  const nm    = selIds.map(id => cbId[id] ? cbId[id].name : id).join('_').substring(0, 40);
  const dlEl  = Object.assign(document.createElement('a'), {
    href: url, download: `scostamenti_${nm}_${new Date().getFullYear()}.xlsx`
  });
  dlEl.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════
// 4. Cross-Sell Detail report — "Scarica dettaglio" dal modal città
// ══════════════════════════════════════════════════════════════════════════

function _stylesCrossSell() {
  const nf =
    `<numFmts count="2">` +
    `<numFmt numFmtId="164" formatCode="#,##0 &quot;\u20ac&quot;"/>` +
    `<numFmt numFmtId="165" formatCode="0%"/>` +
    `</numFmts>`;

  // fontId: 0=title(14b #2A5298)  1=hdr(wh10b)  2=body(9 #1A3557)
  //         3=corr(9b #1A6B3A)    4=owned(9 #6E7D8C)
  const fnt =
    `<fonts count="5">` +
    `<font><sz val="14"/><b/><color rgb="FF2A5298"/><name val="Calibri"/></font>` +
    `<font><sz val="10"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><color rgb="FF1A3557"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><b/><color rgb="FF1A6B3A"/><name val="Calibri"/></font>` +
    `<font><sz val="9"/><color rgb="FF6E7D8C"/><name val="Calibri"/></font>` +
    `</fonts>`;

  // fillId: 0=none 1=gray125 2=#2A5298(hdr) 3=white 4=#F4F6FA
  //         5=#CCCCCC(owned) 6=#E6F4EA(corr)
  const sf = fg =>
    `<fill><patternFill patternType="solid"><fgColor rgb="FF${fg}"/><bgColor indexed="64"/></patternFill></fill>`;
  const fil =
    `<fills count="7">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    sf('2A5298') + sf('FFFFFF') + sf('F4F6FA') + sf('CCCCCC') + sf('E6F4EA') +
    `</fills>`;

  const brd =
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFDDE3ED"/></left>` +
    `<right style="thin"><color rgb="FFDDE3ED"/></right>` +
    `<top style="thin"><color rgb="FFDDE3ED"/></top>` +
    `<bottom style="thin"><color rgb="FFDDE3ED"/></bottom>` +
    `</border></borders>`;

  const al = (h, v, w) =>
    `<alignment horizontal="${h}" vertical="${v||'center'}" wrapText="${w?'1':'0'}"/>`;

  // xf: 0=ttl  1=hdr  2=dT(left)  3=dN(right)  4=dI(€,right)
  //     5=owned(gray fill, no text)  6=corr(%(165),green fill+font)  7=emp(no fill)
  const xfs = [
    `<xf numFmtId="0"   fontId="0" fillId="3" borderId="0" applyFont="1" applyFill="1">${al('left','center',0)}</xf>`,
    `<xf numFmtId="0"   fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('center')}</xf>`,
    `<xf numFmtId="0"   fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('left')}</xf>`,
    `<xf numFmtId="0"   fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('right')}</xf>`,
    `<xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('right')}</xf>`,
    `<xf numFmtId="0"   fontId="4" fillId="5" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('center')}</xf>`,
    `<xf numFmtId="165" fontId="3" fillId="6" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1">${al('center')}</xf>`,
    `<xf numFmtId="0"   fontId="2" fillId="3" borderId="1" applyFont="1" applyFill="1" applyBorder="1">${al('center')}</xf>`,
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    nf + fnt + fil + brd +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `</styleSheet>`;
}

function generateReportCrossSell(cityId) {
  const city = CITIES.find(c => c.id === cityId);
  if (!city) return;

  const SL         = ['Single', 'Coppia', 'Famiglia'];
  const PROD_NAMES = ['Conto Corrente','Carta Debito','Carta Credito','Mutuo','Investimenti','Ass. Vita','Ass. Casa'];
  const CORR_THR   = 0.25;   // soglia minima per esporre la %

  // Clienti della città
  const custs = CUSTOMERS
    .filter(r => r[1] === cityId)
    .map(r => ({ id:r[0], eta:r[2], stato:r[3], reddito:r[4], pmask:r[5] }));
  if (!custs.length) { alert('Nessun cliente per questa città.'); return; }

  // Pool completo per la correlazione (stessa logica di customer.js / mail.js)
  const pool = CUSTOMERS.map(r => ({ id:r[0], cityId:r[1], eta:r[2], stato:r[3], reddito:r[4], pmask:r[5] }));

  // Pre-calcolo correlazioni per ogni cliente
  const rows = custs.map(cust => {
    const similar = findSimilarProfiles(cust, pool, { age:5, income:0.20 });
    const sn      = similar.length;
    const prodCols = Array.from({ length:7 }, (_, pi) => {
      if (cust.pmask & (1 << pi)) return { owned:true,  corr:null };
      const wp   = sn > 0 ? similar.filter(c => c.pmask & (1 << pi)).length : 0;
      const corr = sn > 0 ? wp / sn : 0;
      return { owned:false, corr: corr >= CORR_THR ? corr : null };
    });
    const prodsText = PROD_NAMES.filter((_, i) => cust.pmask & (1 << i)).join(', ');
    return { ...cust, prodCols, prodsText };
  });

  // ── Sheet XML ──────────────────────────────────────────────────────────
  const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M'];
  const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const sc   = (col, r, val, si) => `<c r="${col}${r}" t="inlineStr" s="${si}"><is><t>${esc(val)}</t></is></c>`;
  const nc   = (col, r, val, si) => `<c r="${col}${r}" t="n" s="${si}"><v>${val}</v></c>`;
  const ec   = (col, r, si)      => `<c r="${col}${r}" s="${si}"/>`;

  const XFC = { ttl:0, hdr:1, dT:2, dN:3, dI:4, owned:5, corr:6, emp:7 };

  let rn = 0;
  const sheetRows = [];
  const pr = (ht, cells) => { rn++; sheetRows.push(`<row r="${rn}" ht="${ht}" customHeight="1">${cells}</row>`); };

  // R1 — titolo (merge A1:M1)
  pr(22,
    sc('A', rn+1, `Attività Cross-Selling - ${city.name}`, XFC.ttl) +
    COLS.slice(1).map(c => ec(c, rn+1, XFC.ttl)).join(''));

  // R2 — intestazioni
  const hdrs = ['Customer','Regione','Età','Stato famigliare','Reddito annuo','Prodotti',
                'CONTO CORRENTE','CARTA DEBITO','CARTA CREDITO','MUTUO','INVESTIMENTO','ASS. VITA','ASS. CASA'];
  pr(18, hdrs.map((h, i) => sc(COLS[i], rn+1, h, XFC.hdr)).join(''));

  // R3+ — dati clienti
  for (const row of rows) {
    const r = rn + 1;
    const cells = [
      nc('A', r, row.id,            XFC.dN),
      sc('B', r, city.reg,          XFC.dT),
      nc('C', r, row.eta,           XFC.dN),
      sc('D', r, SL[row.stato]||'', XFC.dT),
      nc('E', r, row.reddito,       XFC.dI),
      sc('F', r, row.prodsText,     XFC.dT),
    ];
    for (let pi = 0; pi < 7; pi++) {
      const col = COLS[6 + pi];
      const pd  = row.prodCols[pi];
      if      (pd.owned)         cells.push(ec(col, r, XFC.owned));
      else if (pd.corr !== null) cells.push(nc(col, r, pd.corr, XFC.corr));
      else                       cells.push(ec(col, r, XFC.emp));
    }
    pr(15, cells.join(''));
  }

  const sheetXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView showGridLines="0" zoomScale="85" workbookViewId="0">` +
    `<selection activeCell="A1" sqref="A1"/></sheetView></sheetViews>` +
    `<cols>` +
    `<col min="1" max="1" width="10"  customWidth="1"/>` +
    `<col min="2" max="2" width="14"  customWidth="1"/>` +
    `<col min="3" max="3" width="6"   customWidth="1"/>` +
    `<col min="4" max="4" width="13"  customWidth="1"/>` +
    `<col min="5" max="5" width="14"  customWidth="1"/>` +
    `<col min="6" max="6" width="30"  customWidth="1"/>` +
    `<col min="7" max="13" width="15" customWidth="1"/>` +
    `</cols>` +
    `<sheetData>${sheetRows.join('')}</sheetData>` +
    `<mergeCells count="1"><mergeCell ref="A1:M1"/></mergeCells>` +
    `<pageSetup orientation="landscape" fitToPage="1" fitToWidth="1" fitToHeight="0"/>` +
    `</worksheet>`;

  // ── Package XLSX ───────────────────────────────────────────────────────
  const ctypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const wb =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Cross-Selling" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const wbRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const files = [
    { name:'[Content_Types].xml',        data:ctypes   },
    { name:'_rels/.rels',                data:rels     },
    { name:'xl/workbook.xml',            data:wb       },
    { name:'xl/_rels/workbook.xml.rels', data:wbRels   },
    { name:'xl/styles.xml',              data:_stylesCrossSell() },
    { name:'xl/worksheets/sheet1.xml',   data:sheetXml },
  ];

  const bytes = _buildXlsx(files);
  const blob  = new Blob([bytes], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url   = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), {
    href:url, download:`crosssell_${city.name}_${new Date().getFullYear()}.xlsx`
  }).click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════
// 6. Report Opinione Generale dei Clienti
// ══════════════════════════════════════════════════════════════════════════

function generateReportOpinioni() {
  if (typeof CUST_SATISFACTION === 'undefined' || typeof CSAT_MOT === 'undefined' || typeof CSAT_CON === 'undefined') {
    alert('Dati soddisfazione non disponibili.\nVerificare che customer_satisfaction.js sia incluso.');
    return;
  }

  const PNAMES = ['Conto Corrente','Carta Debito','Carta Credito','Mutuo','Investimenti','Assicurazione Vita','Assicurazione Casa'];
  const pd = PNAMES.map(() => ({cnt:0, satSum:0, mf:{}, cf:{}}));

  for (const recs of Object.values(CUST_SATISFACTION)) {
    for (const [pi, sat, mi, ci] of recs) {
      if (pi < 0 || pi >= 7) continue;
      pd[pi].cnt++; pd[pi].satSum += sat;
      pd[pi].mf[mi] = (pd[pi].mf[mi]||0)+1;
      pd[pi].cf[ci] = (pd[pi].cf[ci]||0)+1;
    }
  }

  const PROD_MOT = [
    'I clienti apprezzano la semplicità di gestione digitale e la disponibilità dei servizi di home banking h24, ma esprimono insoddisfazione per i costi di tenuta conto e le commissioni sui bonifici, percepiti come elevati rispetto alla media europea. La qualità del servizio allo sportello risulta variabile a seconda della filiale e il tempo medio di attesa è ritenuto eccessivo.',
    'Elevata soddisfazione legata alla diffusione dei pagamenti contactless e alla sicurezza percepita nelle transazioni quotidiane. I clienti apprezzano la piena compatibilità con i principali wallet digitali (Apple Pay, Google Pay) e la semplicità d\'uso. Alcune criticità emergono sui tempi di sostituzione in caso di smarrimento e sui limiti giornalieri di prelievo ATM ritenuti rigidi.',
    'La soddisfazione è penalizzata dai tassi di interesse applicati al credito revolving e dalle commissioni annuali ritenute poco competitive. I clienti apprezzano i programmi di cashback e i vantaggi accessori sui viaggi, ma lamentano scarsa trasparenza nelle comunicazioni relative agli addebiti e difficoltà nella comprensione delle condizioni contrattuali al momento della sottoscrizione.',
    'La soddisfazione risulta al di sotto della media di portafoglio per via della complessità burocratica dell\'istruttoria, dei tempi di approvazione percepiti come lunghi (mediamente 45-60 giorni) e dell\'incertezza legata ai mutui a tasso variabile nell\'attuale contesto di tassi crescenti. I clienti apprezzano la disponibilità dei consulenti dedicati ma lamentano scarsa proattività della banca nella rinegoziazione delle condizioni al variare del mercato.',
    'I clienti con prodotti di investimento esprimono soddisfazione moderata: apprezzano la gestione professionale e la diversificazione dei portafogli proposti, ma lamentano una comunicazione insufficiente sulle performance effettive e sui costi di gestione (TER), percepiti come poco trasparenti. Il recente periodo di volatilità dei mercati ha contribuito a ridurre la fiducia, soprattutto tra i clienti con profilo di rischio basso.',
    'Il prodotto registra la soddisfazione più bassa dell\'intero portafoglio, riflettendo una difficoltà strutturale nel far percepire agli italiani il valore concreto della copertura vita nel lungo periodo. I clienti che hanno effettivamente utilizzato la polizza esprimono soddisfazione per l\'erogazione del capitale, ma la maggioranza dei titolari attivi lamenta scarsa comprensione delle condizioni contrattuali e la percezione di premi elevati rispetto ai benefici attesi nel breve termine.',
    'Soddisfazione nella media, con apprezzamento diffuso per la copertura contro incendio e furto e per il servizio di assistenza domiciliare h24. I principali punti critici riguardano la lentezza nella gestione dei sinistri, con tempi medi percepiti superiori ai 20 giorni, e la complessità nella comprensione delle esclusioni contrattuali, che generano aspettative disattese al momento del rimborso e conseguenti contestazioni.',
  ];
  const PROD_CON = [
    'Ridurre le commissioni sui bonifici ordinari e introdurre una versione del conto a canone zero con soglia di utilizzo minima mensile. Potenziare l\'app mobile con funzionalità di analisi automatica delle spese e notifiche proattive sulle scadenze. Investire nella formazione omogenea del personale di filiale per garantire un livello di servizio uniforme su tutto il territorio.',
    'Rendere configurabile tramite app il limite giornaliero di prelievo e di spesa, consentendo al cliente di adattarlo alle proprie esigenze in tempo reale. Garantire la sostituzione della carta entro 24 ore lavorative in caso di furto o smarrimento. Estendere di default la copertura assicurativa sugli acquisti online senza costi aggiuntivi.',
    'Introdurre piani di rateizzazione a tasso agevolato per importi superiori a 500 euro, comunicati in modo proattivo al momento dell\'addebito. Semplificare il formato dell\'estratto conto digitale con una visualizzazione chiara delle spese per categoria. Ampliare il programma fedeltà con cashback diretto senza soglie minime di accumulo e premi più facilmente raggiungibili.',
    'Digitalizzare l\'intero processo di istruttoria con firma elettronica e caricamento documentale da app, puntando a ridurre i tempi di approvazione a meno di 30 giorni. Offrire simulatori online avanzati con scenari di tasso variabile nel tempo. Attivare un servizio di monitoraggio proattivo per i clienti con mutuo a tasso variabile, con proposte automatiche di rinegoziazione o surroga al superamento di soglie di variazione dell\'Euribor.',
    'Fornire report mensili personalizzati in linguaggio semplice con spiegazione chiara di rendimenti, rischi assunti e costi sostenuti nel periodo. Introdurre sessioni periodiche di consulenza (almeno semestrali) per riallineare il portafoglio agli obiettivi di vita del cliente. Ampliare l\'offerta con ETF e fondi passivi a basso costo per la clientela con profilo di rischio medio-basso, troppo spesso indirizzata su prodotti a costi elevati.',
    'Sviluppare materiali informativi semplici, video esplicativi e simulatori di scenario per migliorare la comprensione del prodotto già in fase di vendita. Introdurre polizze modulari con coperture selezionabili e attivabili progressivamente, per adattarsi meglio alle esigenze del cliente nel tempo. Avviare campagne strutturate di educazione finanziaria sulla protezione del nucleo familiare, con focus sui clienti con figli minori a carico o mutuo in corso.',
    'Digitalizzare il processo di denuncia sinistri con un sistema di tracking in tempo reale dello stato della pratica accessibile da app. Semplificare il linguaggio contrattuale evidenziando le principali esclusioni in un riepilogo visivo al momento della sottoscrizione. Introdurre un servizio di perizia fotografica da remoto tramite app per accelerare la valutazione e il rimborso dei danni di entità minore.',
  ];

  const rows = pd.map((d, i) => {
    const avg = d.cnt ? Math.round(d.satSum / d.cnt) : 0;
    return [PNAMES[i], d.cnt, avg, PROD_MOT[i], PROD_CON[i]];
  });

  const year  = new Date().getFullYear();
  const bytes = _buildXlsx([
    { name:'[Content_Types].xml',       data:_opCT()              },
    { name:'_rels/.rels',               data:_xmlRels()            },
    { name:'xl/workbook.xml',           data:_opWB()               },
    { name:'xl/_rels/workbook.xml.rels',data:_xmlWorkbookRels()    },
    { name:'xl/styles.xml',             data:_opSt()               },
    { name:'xl/worksheets/sheet1.xml',  data:_opSh(rows, year)     },
  ]);

  const blob = new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'),{href:url,download:`opinione_clienti_${year}.xlsx`}).click();
  URL.revokeObjectURL(url);
}

function _opCT() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function _opWB() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Opinione Clienti" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function _opSt() {
  const sf = (fg) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${fg}"/><bgColor indexed="64"/></patternFill></fill>`;
  const bd = `<left style="thin"><color rgb="FFB0BEC5"/></left><right style="thin"><color rgb="FFB0BEC5"/></right><top style="thin"><color rgb="FFB0BEC5"/></top><bottom style="thin"><color rgb="FFB0BEC5"/></bottom>`;
  // xf indices: 0=body-wrap 1=title 2=col-header 3=prod-name 4=count 5=sat-green 6=sat-amber 7=sat-red 8=feedback-wrap
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="0"/>
  <fonts count="4">
    <font><sz val="10"/><color rgb="FF2C3E50"/><name val="Calibri"/></font>
    <font><sz val="18"/><b/><color rgb="FF1C3D72"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><sz val="10"/><b/><color rgb="FF2C3E50"/><name val="Calibri"/></font>
  </fonts>
  <fills count="9">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    ${sf('1C3D72')}
    ${sf('F4F6FA')}
    ${sf('EBF0F8')}
    ${sf('E6F4EA')}
    ${sf('FFF8E1')}
    ${sf('FCE8E8')}
    ${sf('FFFFFF')}
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>${bd}<diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="8" borderId="1" xfId="0"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="5" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="6" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="7" borderId="1" xfId="0"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
</styleSheet>`;
}

function _opSh(rows, year) {
  const xc = (col, row, v, s) => {
    const a = col + row;
    if (typeof v === 'number') return `<c r="${a}" s="${s}"><v>${v}</v></c>`;
    const e = String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<c r="${a}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${e}</t></is></c>`;
  };
  const COLS = ['A','B','C','D','E'];
  const r1 = `<row r="1" ht="36" customHeight="1">${xc('A',1,`Opinione Generale dei Clienti — ${year}`,1)}</row>`;
  const hdrs = ['Prodotto','N. Clienti','Soddisfazione','Feedback Generale','Aree di miglioramento'];
  const r2 = `<row r="2" ht="22" customHeight="1">${COLS.map((c,i)=>xc(c,2,hdrs[i],2)).join('')}</row>`;
  const dRows = rows.map((row, ri) => {
    const rn  = ri + 3;
    const sat = row[2];
    const satS = sat >= 70 ? 5 : sat >= 55 ? 6 : 7;
    return `<row r="${rn}" ht="72" customHeight="1">`
      + xc('A', rn, row[0], 3)
      + xc('B', rn, row[1], 4)
      + xc('C', rn, sat + '%', satS)
      + xc('D', rn, row[3], 0)
      + xc('E', rn, row[4], 8)
      + `</row>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="2" width="11" customWidth="1"/>
    <col min="3" max="3" width="16" customWidth="1"/>
    <col min="4" max="4" width="65" customWidth="1"/>
    <col min="5" max="5" width="65" customWidth="1"/>
  </cols>
  <sheetData>${r1}${r2}${dRows}</sheetData>
  <mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells>
</worksheet>`;
}
