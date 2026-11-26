/**
 * The Kevin Olson Collection — Stories & Inquiries
 * Paste this into Extensions › Apps Script of the "Stories & Inquiries" Google Sheet,
 * then Deploy › New deployment › Web app (Execute as: Me, Who has access: Anyone).
 * Every memory shared on the website becomes a row.
 * Photos shared from the site are saved to Google Drive (Kevin Olson Collection › Kevin's event ›
 * Photos shared by guests) and listed as rows too.
 * The visitor gets a thank-you email (if they gave one), and you get an email with what they sent.
 */
var EVENT_FOLDER_ID = '1jnKVzHcqdhpMTzHO3wtQo8YmwwQWXnyn';   // "Kevin's event"
var GUEST_FOLDER_NAME = 'Photos shared by guests';
var MAX_PHOTO_BYTES = 15 * 1024 * 1024;
var HEADERS = ['Received', 'Type', 'Piece ID', 'Piece title', 'First name', 'Last name',
               'Email', 'Phone', 'Note / story', 'Status', 'Page', 'Site version'];

function doPost(e) {
  if (e && e.parameter && e.parameter.photo) return savePhoto_(e.parameter);
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

// One photo per request: { photo: base64, name, mime, first, last, email, note, batch, index, count, page, version }
function savePhoto_(p) {
  var mime = String(p.mime || 'image/jpeg');
  if (!/^image\/(jpeg|png|heic|heif|webp|gif)$/i.test(mime)) return json_({ ok: false, error: 'not an image' });
  var bytes = Utilities.base64Decode(p.photo);
  if (bytes.length > MAX_PHOTO_BYTES) return json_({ ok: false, error: 'too large' });
  var who = [p.first, p.last].join(' ').trim() || 'Guest';
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Chicago', 'yyyy-MM-dd HHmm');
  var ext = (String(p.name || '').match(/\.[a-z0-9]{2,5}$/i) || ['.jpg'])[0];
  var fname = stamp + ' ' + who.replace(/[^\w .'-]/g, '') + ' ' + (Number(p.index || 0) + 1) + ext;
  var file = guestFolder_().createFile(Utilities.newBlob(bytes, mime, fname));
  if (p.note) file.setDescription(String(p.note).slice(0, 2000));
  getSheet_().appendRow([new Date(), 'Photo', '', clean_(fname), clean_(p.first), clean_(p.last), clean_(p.email), '',
    clean_(p.note), 'New', file.getUrl(), clean_(p.version)]);
  var last = Number(p.index || 0) === Number(p.count || 1) - 1;
  if (last) { try { photoEmails_(p, who, Number(p.count || 1)); } catch (err) {} }
  return json_({ ok: true, id: file.getId() });
}

function guestFolder_() {
  var parent = DriveApp.getFolderById(EVENT_FOLDER_ID);
  var it = parent.getFoldersByName(GUEST_FOLDER_NAME);
  return it.hasNext() ? it.next() : parent.createFolder(GUEST_FOLDER_NAME);
}

function photoEmails_(p, who, n) {
  var owner = Session.getEffectiveUser().getEmail();
  var folderUrl = guestFolder_().getUrl();
  if (owner) {
    MailApp.sendEmail(owner, 'Kevin Olson Collection: ' + n + (n === 1 ? ' photo' : ' photos') + ' from ' + who,
      who + ' shared ' + n + (n === 1 ? ' photo' : ' photos') + ' from the website.' + (p.note ? '\n\n"' + p.note + '"' : '') +
      '\n\nThey are in Google Drive: ' + folderUrl + '\n\nEmail: ' + (p.email || '-'));
  }
  if (p.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email)) {
    MailApp.sendEmail(p.email, 'Thank you, from Kevin Olson\'s family',
      'Dear ' + (p.first || 'friend') + ',\n\nThank you for sharing your ' + (n === 1 ? 'photo' : n + ' photos') +
      ' with us. They mean a great deal to the family, and they\'ll help keep the memory of Kevin and that evening together.\n\nWith gratitude,\nKevin\'s family');
  }
}

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

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
      'Dear ' + (r0.firstName || 'friend') + ',\n\n' +
      (rows.every(function (r) { return r.type === 'Story'; })
        ? 'Thank you for sharing your memory of Kevin. We received:\n\n' + lines + '\n\nWe\'ll read every word. Memories like yours are how his collection keeps its story.'
        : 'Thank you for showing your interest in Kevin\'s collection. We received your note' + (rows.length > 1 ? 's' : '') + ' about:\n\n' + lines + '\n\nWe\'ll read every word and be in touch with you personally.') +
      '\n\nWith gratitude,\nKevin\'s family');
  }
}
