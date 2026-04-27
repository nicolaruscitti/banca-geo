// ══════════════════════════════════════════════════════════════════════════════
// Google Apps Script — Banca-Geo Campagne
// Incolla questo codice in Extensions → Apps Script del tuo Google Sheet
// poi fai Deploy → New Deployment → Web App → Anyone → Deploy
// ══════════════════════════════════════════════════════════════════════════════

const SHEET_NAME = 'Campagne';
const COLS = [
  'id','timestamp','dateStart','dateEnd','product','productName',
  'clientiType','clientiRegione','clientiCittaId','clientiCittaName',
  'eventoType','eventoName','emailText'
];

function _getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) {
    s = ss.insertSheet(SHEET_NAME);
    s.appendRow(COLS);
    s.setFrozenRows(1);
    s.getRange(1, 1, 1, COLS.length).setFontWeight('bold');
  }
  return s;
}

// GET  ?action=get          → restituisce tutti i record
// GET  ?action=delete&id=X  → elimina il record con quell'id
function doGet(e) {
  const action = (e.parameter && e.parameter.action) || 'get';
  if (action === 'delete') return _deleteRow(e.parameter.id);
  return _getAll();
}

// POST body = JSON stringa (Content-Type: text/plain per evitare preflight CORS)
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    _getSheet().appendRow(COLS.map(k => (d[k] !== undefined ? String(d[k]) : '')));
    return _ok({ saved: true });
  } catch (err) {
    return _ok({ error: err.message });
  }
}

function _getAll() {
  const s = _getSheet();
  const vals = s.getDataRange().getValues();
  if (vals.length <= 1) return _ok({ data: [] });
  const headers = vals[0];
  const data = vals.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = String(row[i] !== undefined ? row[i] : ''); });
    return obj;
  });
  return _ok({ data });
}

function _deleteRow(id) {
  const s = _getSheet();
  const vals = s.getDataRange().getValues();
  for (let i = vals.length - 1; i >= 1; i--) {
    if (String(vals[i][0]) === String(id)) {
      s.deleteRow(i + 1);
      return _ok({ deleted: true });
    }
  }
  return _ok({ deleted: false });
}

function _ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
