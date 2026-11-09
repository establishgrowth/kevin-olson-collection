/**
 * The Kevin Olson Collection — Stories & Inquiries
 * Paste this into Extensions › Apps Script of the "Stories & Inquiries" Google Sheet,
 * then Deploy › New deployment › Web app (Execute as: Me, Who has access: Anyone).
 * Every story, inquiry, selection and print notification from the website becomes a row.
 * The visitor gets a thank-you email (if they gave one), and you get an email with what they sent.
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
  if (rows.length) { try { sendEmails_(rows); } catch (err) {} }
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

function sendEmails_(rows) {
  var r0 = rows[0], name = [r0.firstName, r0.lastName].join(' ').trim() || 'Someone';
  var lines = rows.map(function (r) {
    return '• ' + (r.pieceId || '') + (r.pieceTitle ? ' — ' + r.pieceTitle : '') + ' (' + (r.type || '') + ')' + (r.message ? '\n   "' + r.message + '"' : '');
  }).join('\n');
  var owner = Session.getEffectiveUser().getEmail();
  if (owner) {
    MailApp.sendEmail(owner, 'Kevin Olson Collection: new note from ' + name,
      name + ' sent ' + rows.length + (rows.length === 1 ? ' note' : ' notes') + '.\n\n' + lines +
      '\n\nEmail: ' + (r0.email || '-') + '\nPhone: ' + (r0.phone || '-') +
      '\n\nEverything is also in the Stories & Inquiries spreadsheet.');
  }
  if (r0.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r0.email)) {
    MailApp.sendEmail(r0.email, 'Thank you, from Kevin Olson\'s family',
      'Dear ' + (r0.firstName || 'friend') + ',\n\nThank you for showing your interest in Kevin\'s collection. ' +
      'We received your note' + (rows.length > 1 ? 's' : '') + ' about:\n\n' + lines +
      '\n\nWe\'ll read every word and be in touch with you personally.\n\nWith gratitude,\nKevin\'s family');
  }
}
