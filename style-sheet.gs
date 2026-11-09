/**
 * One-time setup: styles the Stories & Inquiries sheet to match the Kevin Olson Collection
 * and adds "Start here", "By piece" and "By person" tabs.
 * In Apps Script, add this as a new file, choose styleSheet in the toolbar and click Run.
 * Safe to run again. It doesn't touch any submitted rows.
 */
function styleSheet() {
  var INK = '#0B0A09', INK2 = '#1A1917', PAPER = '#F3EEE6', CARD = '#FDFBF7', LINE = '#D8CBB9',
      TAN = '#C9B39A', TAN_L = '#EADFCF', BRICK = '#8E3B2A', MUTE = '#5E564C';
  var SANS = 'Inter Tight', SERIF = 'Instrument Serif';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ---------- Submissions ----------
  var sub = ss.getSheetByName('Submissions') || ss.insertSheet('Submissions');
  var H = ['Received', 'Type', 'Piece ID', 'Piece title', 'First name', 'Last name',
           'Email', 'Phone', 'Note / story', 'Status', 'Page', 'Site version'];
  sub.getRange(1, 1, 1, H.length).setValues([H]);
  var maxR = Math.max(sub.getMaxRows(), 1000);
  if (sub.getMaxRows() < maxR) sub.insertRowsAfter(sub.getMaxRows(), maxR - sub.getMaxRows());
  if (sub.getMaxColumns() > H.length) sub.deleteColumns(H.length + 1, sub.getMaxColumns() - H.length);
  sub.getBandings().forEach(function (b) { b.remove(); });

  var all = sub.getRange(1, 1, maxR, H.length);
  all.setFontFamily(SANS).setFontSize(10).setFontColor(INK2).setBackground(CARD)
     .setVerticalAlignment('top').setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
  var body = sub.getRange(2, 1, maxR - 1, H.length);
  body.applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
      .setFirstRowColor(CARD).setSecondRowColor(PAPER);

  var head = sub.getRange(1, 1, 1, H.length);
  head.setBackground(INK).setFontColor(PAPER).setFontWeight('bold').setFontSize(10)
      .setVerticalAlignment('middle').setWrap(true);
  sub.setRowHeight(1, 38);
  sub.setFrozenRows(1);
  sub.setFrozenColumns(0);

  var widths = [150, 90, 80, 210, 100, 110, 200, 120, 360, 120, 90, 160];
  widths.forEach(function (w, i) { sub.setColumnWidth(i + 1, w); });
  sub.getRange(2, 1, maxR - 1, 1).setNumberFormat('mmm d, yyyy  h:mm am/pm');
  sub.getRange(2, 3, maxR - 1, 1).setFontColor(MUTE);
  sub.getRange(2, 9, maxR - 1, 1).setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  sub.getRange(2, 11, maxR - 1, 2).setFontColor('#A79C8E').setFontSize(9);
  sub.getRange(2, 10, maxR - 1, 1).setFontWeight('bold').setHorizontalAlignment('center');

  // Status dropdown
  var STATUSES = ['New', 'Read', 'Called', 'Arranged', 'Done', 'Kept in family', 'Not available'];
  sub.getRange(2, 10, maxR - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build());

  // Colors for Status and Type
  var stat = sub.getRange(2, 10, maxR - 1, 1), type = sub.getRange(2, 2, maxR - 1, 1);
  function rule(r, text, bg, fg, strike) {
    var b = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([r]);
    if (strike) b.setStrikethrough(true);
    return b.build();
  }
  sub.setConditionalFormatRules([
    rule(stat, 'New', BRICK, '#FFFFFF'),
    rule(stat, 'Read', TAN_L, INK2),
    rule(stat, 'Called', TAN, INK2),
    rule(stat, 'Arranged', INK2, PAPER),
    rule(stat, 'Done', '#E3E0DA', '#8C8174'),
    rule(stat, 'Kept in family', '#E3E0DA', '#8C8174'),
    rule(stat, 'Not available', '#E3E0DA', '#8C8174', true),
    rule(type, 'Selection', TAN_L, INK2),
    rule(type, 'Inquiry', '#F2DCD5', BRICK),
    rule(type, 'Story', '#E6E2DA', INK2),
    rule(type, 'Print notify', '#E9E4F0', '#4A3F63'),
    rule(type, 'Test', '#EEEEEE', '#999999')
  ]);
  if (sub.getFilter()) sub.getFilter().remove();
  sub.getRange(1, 1, maxR, H.length).createFilter();
  sub.setTabColor(BRICK);

  // ---------- By piece ----------
  var bp = ss.getSheetByName('By piece') || ss.insertSheet('By piece');
  bp.clear(); bp.clearConditionalFormatRules();
  bp.getRange('A1').setValue('Interest by piece');
  bp.getRange('A2').setValue('Which pieces people asked about, most-wanted first. Updates automatically.');
  bp.getRange('A4').setFormula(
    "=IFERROR(QUERY(Submissions!A:L,\"select C, D, count(B) where C is not null and B <> 'Test' and B <> 'Print notify' " +
    "group by C, D order by count(B) desc label C 'Piece ID', D 'Piece title', count(B) 'Notes received'\",1)," +
    "\"Nothing yet: rows appear here as people send notes.\")");
  styleReport_(bp, [110, 280, 140], 3);

  // ---------- By person ----------
  var pe = ss.getSheetByName('By person') || ss.insertSheet('By person');
  pe.clear(); pe.clearConditionalFormatRules();
  pe.getRange('A1').setValue('Interest by person');
  pe.getRange('A2').setValue('Everyone who has sent a note, with how to reach them. Updates automatically.');
  pe.getRange('A4').setFormula(
    "=IFERROR(QUERY(Submissions!A:L,\"select E, F, G, H, count(C) where E is not null and B <> 'Test' " +
    "group by E, F, G, H order by count(C) desc label E 'First name', F 'Last name', G 'Email', H 'Phone', count(C) 'Pieces'\",1)," +
    "\"Nothing yet: people appear here as they send notes.\")");
  styleReport_(pe, [120, 130, 230, 140, 90], 5);

  // ---------- Start here ----------
  var st = ss.getSheetByName('Start here');
  if (!st) {
    var s1 = ss.getSheetByName('Sheet1');
    st = (s1 && s1.getLastRow() === 0) ? s1.setName('Start here') : ss.insertSheet('Start here');
  }
  st.clear();
  st.getBandings().forEach(function (b) { b.remove(); });
  var rows = [
    ['THE KEVIN OLSON COLLECTION', ''],
    ['Stories & Inquiries', ''],
    ['Every note, story and request from the website lands here automatically.', ''],
    ['', ''],
    ['HOW IT WORKS', ''],
    ['1  Someone submits', 'On the website they heart the pieces they love, write why, and send with their name and email or phone.'],
    ['2  It lands here', 'Each piece becomes its own row on the Submissions tab. We also get an email, and they get a thank-you email.'],
    ['3  We contact them', 'Call or email to hear why the piece matters and how to get it to them: local pickup or shipping.'],
    ['4  We update the Status', 'Change the Status column as things move along, so the whole family can see where each request stands.'],
    ['', ''],
    ['THE TABS', ''],
    ['Submissions', 'Every note, one row per piece. Name, email, phone, their note, and a Status to track follow-up.'],
    ['By piece', 'Which pieces people asked about, most-wanted first. Shows when two people want the same piece.'],
    ['By person', 'Everyone who has reached out, with contact details and how many pieces they chose.'],
    ['', ''],
    ['STATUS', ''],
    ['New', 'Just came in. Nobody has looked at it yet.'],
    ['Read', 'Someone in the family has read it.'],
    ['Called', 'We have reached out to them.'],
    ['Arranged', 'Pickup or shipping is agreed.'],
    ['Done', 'The piece is with them.'],
    ['Kept in family', 'The family is keeping this piece.'],
    ['Not available', 'The piece has gone to someone else, or is not being offered.'],
    ['', ''],
    ['TYPES', ''],
    ['Selection', 'They hearted the piece and sent it from My selections.'],
    ['Inquiry', 'They pressed Inquire on the piece.'],
    ['Story', 'They shared a story or memory about the piece.'],
    ['Print notify', 'They asked to hear when the Night Garden prints are released.']
  ];
  st.getRange(1, 1, rows.length, 2).setValues(rows);
  if (st.getMaxColumns() > 3) st.deleteColumns(4, st.getMaxColumns() - 3);
  st.getRange(1, 1, st.getMaxRows(), 3).setBackground(PAPER).setFontFamily(SANS).setFontColor(INK2)
    .setFontSize(10).setVerticalAlignment('middle').setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
  st.setColumnWidth(1, 200); st.setColumnWidth(2, 620); st.setColumnWidth(3, 40);
  st.getRange('A1').setFontSize(9).setFontColor(MUTE).setFontWeight('bold');
  st.getRange('A2').setFontFamily(SERIF).setFontSize(30).setFontColor(INK);
  st.setRowHeight(2, 52);
  st.getRange('A3').setFontColor(MUTE).setFontSize(11);
  st.getRange('A3:B3').merge().setWrapStrategy(SpreadsheetApp.WrapStrategy.OVERFLOW);
  [5, 11, 16, 25].forEach(function (r) {
    st.getRange(r, 1, 1, 2).setBackground(INK).setFontColor(PAPER).setFontWeight('bold').setFontSize(9);
    st.setRowHeight(r, 28);
  });
  st.getRange('A6:A9').setFontFamily(SERIF).setFontSize(15);
  st.getRange('A12:A14').setFontWeight('bold');
  for (var r = 6; r <= rows.length; r++) if (rows[r - 1][0] && [11, 16, 25].indexOf(r) < 0) st.setRowHeight(r, 34);
  var colors = { 'New': [BRICK, '#FFFFFF'], 'Read': [TAN_L, INK2], 'Called': [TAN, INK2], 'Arranged': [INK2, PAPER],
                 'Done': ['#E3E0DA', '#8C8174'], 'Kept in family': ['#E3E0DA', '#8C8174'], 'Not available': ['#E3E0DA', '#8C8174'],
                 'Selection': [TAN_L, INK2], 'Inquiry': ['#F2DCD5', BRICK], 'Story': ['#E6E2DA', INK2], 'Print notify': ['#E9E4F0', '#4A3F63'] };
  for (var k = 17; k <= rows.length; k++) {
    var c = colors[rows[k - 1][0]];
    if (c) st.getRange(k, 1).setBackground(c[0]).setFontColor(c[1]).setFontWeight('bold').setHorizontalAlignment('center');
  }
  st.setHiddenGridlines(true);
  st.setTabColor(INK);

  // Tab order: Start here, Submissions, By piece, By person
  [st, sub, bp, pe].forEach(function (sh, i) { ss.setActiveSheet(sh); ss.moveActiveSheet(i + 1); });
  ss.setActiveSheet(st);
  SpreadsheetApp.flush();

  function styleReport_(sh, widths, n) {
    sh.getBandings().forEach(function (b) { b.remove(); });
    sh.getRange(1, 1, sh.getMaxRows(), Math.max(n, 6)).setBackground(PAPER).setFontFamily(SANS).setFontColor(INK2).setFontSize(10);
    widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
    sh.getRange('A1').setFontFamily(SERIF).setFontSize(24).setFontColor(INK);
    sh.setRowHeight(1, 44);
    sh.getRange('A2').setFontColor(MUTE);
    sh.getRange(4, 1, 1, n).setBackground(INK).setFontColor(PAPER).setFontWeight('bold');
    sh.getRange(5, 1, 500, n).setBackground(CARD);
    sh.getRange(5, 1, 500, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false)
      .setFirstRowColor(CARD).setSecondRowColor(PAPER);
    sh.setFrozenRows(4);
    sh.setHiddenGridlines(true);
    sh.setTabColor(TAN);
  }
}
