/**
 * The Kevin Olson Collection — Stories & Inquiries
 * Paste this into Extensions › Apps Script of the "Stories & Inquiries" Google Sheet,
 * then Deploy › New deployment › Web app (Execute as: Me, Who has access: Anyone).
 * Every story, inquiry, selection and print notification from the website becomes a row.
 */
var HEADERS = ['Received', 'Type', 'Piece ID', 'Piece title', 'First name', 'Last name',
               'Email', 'Phone', 'Note / story', 'Status', 'Page', 'Site version'];

function doPost(e) {
  var sheet = getSheet_();
  var rows = [];
  try { rows = JSON.parse((e && e.parameter && e.parameter.data) || '[]'); } catch (err) { rows = []; }
  if (!Array.isArray(rows)) rows = [rows];
  rows.forEach(function (r) {
    sheet.appendRow([
      r.timestamp ? new Date(r.timestamp) : new Date(),
      clean_(r.type), clean_(r.pieceId), clean_(r.pieceTitle),
      clean_(r.firstName), clean_(r.lastName), clean_(r.email), clean_(r.phone),
      clean_(r.message), 'New', clean_(r.page), clean_(r.version)
    ]);
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true, added: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('Kevin Olson Collection form endpoint is running.');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

// Stops anything typed into the form from being treated as a spreadsheet formula.
function clean_(v) {
  v = v == null ? '' : String(v).slice(0, 5000);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}
