/* The Kevin Olson Collection — selections, forms and submissions (draft 0.5) */
(function () {
  var CFG = window.KO_CONFIG || {};
  var PIECES = window.PIECES || [];
  var BY_ID = {};
  PIECES.forEach(function (p) { BY_ID[p.id] = p; });

  /* ---------- storage (per browser) ---------- */
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var sel = load('ko.selections', []);      // [{id, note}]
  var sent = load('ko.sent', []);           // [{id, date}]
  var me = load('ko.contact', {});          // {first,last,email,phone}

  function isSel(id) { return sel.some(function (s) { return s.id === id; }); }
  function toggle(id) {
    if (isSel(id)) sel = sel.filter(function (s) { return s.id !== id; });
    else sel.push({ id: id, note: '' });
    save('ko.selections', sel); refresh(); bump();
    toast(isSel(id) ? 'Added to your selections' : 'Removed from your selections');
    return isSel(id);
  }

  /* ---------- submit ---------- */
  function submit(rows) {
    var stamp = new Date().toISOString();
    rows = rows.map(function (r) {
      return Object.assign({ timestamp: stamp, page: location.href, version: CFG.version || '' }, r);
    });
    if (!CFG.endpoint) {
      var box = load('ko.outbox', []); save('ko.outbox', box.concat(rows));
      console.info('[KO] No endpoint set yet — saved locally:', rows);
      return Promise.resolve();
    }
    var body = new URLSearchParams({ data: JSON.stringify(rows) });
    return fetch(CFG.endpoint, { method: 'POST', mode: 'no-cors', body: body }).catch(function () {
      var box = load('ko.outbox', []); save('ko.outbox', box.concat(rows));
    });
  }

  /* ---------- small helpers ---------- */
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var toastEl, toastT;
  function toast(msg) {
    if (!toastEl) { toastEl = el('<div class="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 1800);
  }
  var HEART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20s-7-4.4-9.2-9A4.8 4.8 0 0 1 12 6.2 4.8 4.8 0 0 1 21.2 11C19 15.6 12 20 12 20z"/></svg>';
  var HEART_ON = HEART.replace('fill="none"', 'fill="currentColor"');

  /* ---------- selections tab + drawer ---------- */
  var tab = el('<button type="button" class="sel-tab" aria-haspopup="dialog">' + HEART + '<span>My selections</span><span class="n">0</span></button>');
  var scrim = el('<div class="scrim"></div>');
  var drawer = el('<aside class="drawer" role="dialog" aria-modal="true" aria-label="My selections" aria-hidden="true">' +
    '<header><h2>My selections</h2><button type="button" class="x" aria-label="Close">×</button></header>' +
    '<div class="body"></div>' +
    '<footer><p class="draftflag" style="margin:0">Add a note to any piece, then send them together.</p>' +
    '<button type="button" class="btn btn-solid" data-send>Send my selections</button></footer></aside>');

  function bump() { tab.classList.remove('bump'); void tab.offsetWidth; tab.classList.add('bump'); }
  function openDrawer() { renderDrawer(); scrim.classList.add('open'); drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); drawer.querySelector('.x').focus(); }
  function closeDrawer() { scrim.classList.remove('open'); drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); tab.focus(); }

  function renderDrawer() {
    var b = drawer.querySelector('.body'), h = '';
    if (!sel.length) h += '<p class="empty">Nothing selected yet. Tap the heart on any piece that speaks to you — your picks are kept here, on this device, until you send them.</p>';
    sel.forEach(function (s) {
      var p = BY_ID[s.id]; if (!p) return;
      h += '<div class="item" data-id="' + p.id + '"><a href="piece.html?id=' + p.id + '"><img src="' + p.photos[0] + '" alt=""></a><div>' +
        '<p class="t">' + esc(p.title) + '</p><p class="id">' + p.id + (p.made ? ' · Created by Kevin' : '') + '</p>' +
        '<label class="sr" style="position:absolute;left:-9999px" for="n-' + p.id + '">Note for ' + esc(p.title) + '</label>' +
        '<textarea id="n-' + p.id + '" placeholder="A note about this piece (optional)">' + esc(s.note) + '</textarea>' +
        '<button type="button" class="linkbtn" data-remove="' + p.id + '">Remove</button></div></div>';
    });
    if (sent.length) {
      h += '<p class="sent-h">Already sent (' + sent.length + ')</p>';
      sent.slice().reverse().forEach(function (s) {
        var p = BY_ID[s.id]; if (!p) return;
        h += '<a class="sent" href="piece.html?id=' + p.id + '" style="text-decoration:none"><img src="' + p.photos[0] + '" alt=""><span>' + esc(p.title) + '<br><small>' + p.id + ' · sent ' + new Date(s.date).toLocaleDateString() + '</small></span></a>';
      });
    }
    b.innerHTML = h;
    drawer.querySelector('[data-send]').disabled = !sel.length;
  }
  drawer.addEventListener('input', function (e) {
    var it = e.target.closest('.item'); if (!it) return;
    sel.forEach(function (s) { if (s.id === it.getAttribute('data-id')) s.note = e.target.value; });
    save('ko.selections', sel);
  });
  drawer.addEventListener('click', function (e) {
    var r = e.target.closest('[data-remove]');
    if (r) { toggle(r.getAttribute('data-remove')); renderDrawer(); }
    if (e.target.closest('.x')) closeDrawer();
    if (e.target.closest('[data-send]')) { closeDrawer(); openForm({ kind: 'selection' }); }
  });
  tab.addEventListener('click', openDrawer);
  scrim.addEventListener('click', function () { closeDrawer(); closeForm(); });

  function refresh() {
    tab.querySelector('.n').textContent = sel.length;
    document.querySelectorAll('[data-select]').forEach(function (b) {
      var on = isSel(b.getAttribute('data-select'));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (b.classList.contains('sel')) { b.innerHTML = on ? HEART_ON : HEART; b.setAttribute('aria-label', (on ? 'Remove ' : 'Select ') + (b.getAttribute('data-title') || 'piece')); }
      else b.innerHTML = (on ? HEART_ON : HEART) + '<span>' + (on ? 'Selected' : 'Select this piece') + '</span>';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-select]');
    if (b) { e.preventDefault(); toggle(b.getAttribute('data-select')); }
  });

  /* ---------- the form (story / inquiry / selection / notify) ---------- */
  var COPY = {
    story: { h: 'Share a story', sub: 'A memory, where it hung, what Kevin said about it — anything you know.', label: 'Your story or note', ph: 'Tell us about this piece…', type: 'Story', thanks: 'Thank you for sharing this. Stories like yours are how Kevin’s collection keeps its history.' },
    inquire: { h: 'Inquire about this piece', sub: 'Prices aren’t set yet. Leave your details and we’ll be in touch.', label: 'Your note', ph: 'What draws you to it? Any questions?', type: 'Inquiry', thanks: 'Thank you for showing your interest. We’ll get back to you with more information about the piece soon.' },
    selection: { h: 'Send your selections', sub: 'We’ll receive every piece on your list, with your notes.', label: 'Anything else to add? (optional)', ph: 'A general note…', type: 'Selection', thanks: 'Thank you — your selections are with us. We’ll be in touch with more information on each piece.' },
    notify: { h: 'Notify me', sub: 'Be the first to hear when the Night Garden prints are released.', label: 'A note (optional)', ph: 'Which prints are you most interested in?', type: 'Print notify', thanks: 'Thank you. We’ll let you know as soon as the Night Garden prints are available.' }
  };
  var modal = el('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ko-fh"><div class="sheet"></div></div>');
  var ctx = null, step = 1;

  function openForm(c) { ctx = c; step = 1; renderForm(); modal.classList.add('open'); setTimeout(function () { var i = modal.querySelector('input,textarea'); if (i) i.focus(); }, 50); }
  function closeForm() { modal.classList.remove('open'); }
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.x')) closeForm(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeForm(); if (drawer.classList.contains('open')) closeDrawer(); } });

  function renderForm() {
    var c = COPY[ctx.kind], p = ctx.id ? BY_ID[ctx.id] : null, s = modal.querySelector('.sheet');
    var head = '<button type="button" class="x" aria-label="Close">×</button><h3 id="ko-fh">' + c.h + '</h3>' +
      '<p class="sub">' + (p ? '<strong>' + esc(p.title) + '</strong> · ' + p.id + '<br>' : '') + (ctx.kind === 'selection' ? sel.length + ' piece' + (sel.length === 1 ? '' : 's') + '. ' : '') + c.sub + '</p>';
    if (step === 3) {
      s.innerHTML = '<button type="button" class="x" aria-label="Close">×</button><div class="thanks"><span class="ko-mark">KO</span><h3 style="margin:0">Thank you' + (me.first ? ', ' + esc(me.first) : '') + '.</h3><p>' + c.thanks + '</p><button type="button" class="btn btn-solid" data-done>Back to the collection</button></div>';
      s.querySelector('[data-done]').onclick = closeForm; return;
    }
    var steps = '<div class="steps" aria-hidden="true"><i class="on"></i><i class="' + (step === 2 ? 'on' : '') + '"></i></div>';
    if (step === 1) {
      s.innerHTML = head + steps +
        '<form novalidate><div class="row2"><div class="f"><label for="f1">First name</label><input id="f1" name="first" autocomplete="given-name" required value="' + esc(me.first) + '"></div>' +
        '<div class="f"><label for="f2">Last name</label><input id="f2" name="last" autocomplete="family-name" value="' + esc(me.last) + '"></div></div>' +
        '<div class="f"><label for="f3">Email</label><input id="f3" name="email" type="email" autocomplete="email" value="' + esc(me.email) + '"></div>' +
        '<div class="f"><label for="f4">Phone</label><input id="f4" name="phone" type="tel" autocomplete="tel" value="' + esc(me.phone) + '"></div>' +
        '<p class="err" aria-live="polite"></p><div class="actions"><span class="draftflag">Email, phone, or both</span><button class="btn btn-solid" type="submit">Next</button></div></form>';
      s.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var f = e.target, err = s.querySelector('.err');
        var v = { first: f.first.value.trim(), last: f.last.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim() };
        if (!v.first) { err.textContent = 'Please add your first name.'; f.first.focus(); return; }
        if (!v.email && !v.phone) { err.textContent = 'Please add an email or a phone number so we can reach you.'; f.email.focus(); return; }
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { err.textContent = 'That email doesn’t look quite right.'; f.email.focus(); return; }
        me = v; save('ko.contact', me); step = 2; renderForm(); s.querySelector('textarea').focus();
      };
    } else {
      s.innerHTML = head + steps +
        '<form novalidate><div class="f"><label for="f5">' + c.label + '</label><textarea id="f5" name="msg" placeholder="' + c.ph + '"></textarea></div>' +
        '<p class="err" aria-live="polite"></p><div class="actions"><button type="button" class="linkbtn" data-back>← Back</button><button class="btn btn-solid" type="submit">Submit</button></div></form>';
      s.querySelector('[data-back]').onclick = function () { step = 1; renderForm(); };
      s.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var msg = e.target.msg.value.trim(), err = s.querySelector('.err');
        if ((ctx.kind === 'story') && !msg) { err.textContent = 'Please write a few words.'; return; }
        var base = { type: c.type, firstName: me.first, lastName: me.last, email: me.email, phone: me.phone };
        var rows;
        if (ctx.kind === 'selection') {
          rows = sel.map(function (x) { var p = BY_ID[x.id]; return Object.assign({}, base, { pieceId: x.id, pieceTitle: p ? p.title : '', message: [x.note, msg].filter(Boolean).join(' — ') }); });
        } else {
          rows = [Object.assign({}, base, { pieceId: p ? p.id : (ctx.pieceId || ''), pieceTitle: p ? p.title : (ctx.pieceTitle || ''), message: msg })];
        }
        var btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
        submit(rows).then(function () {
          var now = new Date().toISOString();
          if (ctx.kind === 'selection') { sent = sent.concat(sel.map(function (x) { return { id: x.id, date: now }; })); sel = []; }
          else if (ctx.kind === 'inquire' && p) { sent.push({ id: p.id, date: now }); sel = sel.filter(function (x) { return x.id !== p.id; }); }
          save('ko.sent', sent); save('ko.selections', sel); refresh();
          step = 3; renderForm();
        });
      };
    }
    s.querySelector('.x').onclick = closeForm;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-form]');
    if (b) { e.preventDefault(); openForm({ kind: b.getAttribute('data-form'), id: b.getAttribute('data-id') || null, pieceId: b.getAttribute('data-piece-id'), pieceTitle: b.getAttribute('data-piece-title') }); }
  });

  /* ---------- scroll reveal ---------- */
  function reveal(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (x) { x.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (x) { io.observe(x); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(tab); document.body.appendChild(scrim); document.body.appendChild(drawer); document.body.appendChild(modal);
    refresh(); reveal();
  });

  window.KO = { HEART: HEART, HEART_ON: HEART_ON, BY_ID: BY_ID, isSel: isSel, refresh: refresh, reveal: reveal, esc: esc };
})();
