/* The Kevin Olson Collection — shared helpers: memories form, scroll reveal (memorial edition) */
(function () {
  var CFG = window.KO_CONFIG || {};
  var PIECES = window.PIECES || [];
  var BY_ID = {};
  PIECES.forEach(function (p) { BY_ID[p.id] = p; });

  /* ---------- storage (per browser) ---------- */
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var me = load('ko.contact', {});          // {first,last,email,phone}

  /* ---------- submit (to the family's Google Sheet) ---------- */
  function submit(rows) {
    var stamp = new Date().toISOString();
    rows = rows.map(function (r) {
      return Object.assign({ timestamp: stamp, page: location.href, version: CFG.version || '' }, r);
    });
    if (!CFG.endpoint) {
      var box = load('ko.outbox', []); save('ko.outbox', box.concat(rows));
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

  /* ---------- the memories form ---------- */
  var COPY = {
    story: { h: 'Share a memory', sub: 'A memory of Kevin, where a piece hung, what he said about it — anything you’d like to keep with his work.', label: 'Your memory', ph: 'Tell us about Kevin, or about this piece…', type: 'Story', thanks: 'Thank you for sharing this. Memories like yours are how Kevin’s collection keeps its story.' }
  };
  var modal = el('<div class="modal" role="dialog" aria-modal="true" aria-labelledby="ko-fh"><div class="sheet"></div></div>');
  var ctx = null, step = 1;

  function openForm(c) { ctx = c; step = 1; renderForm(); modal.classList.add('open'); setTimeout(function () { var i = modal.querySelector('input,textarea'); if (i) i.focus(); }, 50); }
  function closeForm() { modal.classList.remove('open'); }
  modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.x')) closeForm(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeForm(); });

  function renderForm() {
    var c = COPY.story, p = ctx.id ? BY_ID[ctx.id] : null, s = modal.querySelector('.sheet');
    var head = '<button type="button" class="x" aria-label="Close">×</button><h3 id="ko-fh">' + c.h + '</h3>' +
      '<p class="sub">' + (p ? '<strong>' + esc(p.title) + '</strong> · ' + p.id + '<br>' : '') + c.sub + '</p>';
    if (step === 3) {
      s.innerHTML = '<button type="button" class="x" aria-label="Close">×</button><div class="thanks"><span class="ko-mark">KO</span><h3 style="margin:0">Thank you' + (me.first ? ', ' + esc(me.first) : '') + '.</h3><p>' + c.thanks + '</p><button type="button" class="btn btn-solid" data-done>Back to the collection</button></div>';
      s.querySelector('[data-done]').onclick = closeForm; return;
    }
    var steps = '<div class="steps" aria-hidden="true"><i class="on"></i><i class="' + (step === 2 ? 'on' : '') + '"></i></div>';
    if (step === 1) {
      s.innerHTML = head + steps +
        '<form novalidate><div class="row2"><div class="f"><label for="f1">First name</label><input id="f1" name="first" autocomplete="given-name" required value="' + esc(me.first) + '"></div>' +
        '<div class="f"><label for="f2">Last name</label><input id="f2" name="last" autocomplete="family-name" value="' + esc(me.last) + '"></div></div>' +
        '<div class="f"><label for="f3">Email (optional)</label><input id="f3" name="email" type="email" autocomplete="email" value="' + esc(me.email) + '"></div>' +
        '<p class="err" aria-live="polite"></p><div class="actions"><span class="draftflag">Shared with the family</span><button class="btn btn-solid" type="submit">Next</button></div></form>';
      s.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var f = e.target, err = s.querySelector('.err');
        var v = { first: f.first.value.trim(), last: f.last.value.trim(), email: f.email.value.trim(), phone: me.phone || '' };
        if (!v.first) { err.textContent = 'Please add your first name.'; f.first.focus(); return; }
        if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { err.textContent = 'That email doesn’t look quite right.'; f.email.focus(); return; }
        me = v; save('ko.contact', me); step = 2; renderForm(); s.querySelector('textarea').focus();
      };
    } else {
      s.innerHTML = head + steps +
        '<form novalidate><div class="f"><label for="f5">' + c.label + '</label><textarea id="f5" name="msg" placeholder="' + c.ph + '"></textarea></div>' +
        '<p class="err" aria-live="polite"></p><div class="actions"><button type="button" class="linkbtn" data-back>← Back</button><button class="btn btn-solid" type="submit">Share</button></div></form>';
      s.querySelector('[data-back]').onclick = function () { step = 1; renderForm(); };
      s.querySelector('form').onsubmit = function (e) {
        e.preventDefault(); var msg = e.target.msg.value.trim(), err = s.querySelector('.err');
        if (!msg) { err.textContent = 'Please write a few words.'; return; }
        var row = { type: c.type, firstName: me.first, lastName: me.last, email: me.email, phone: me.phone,
          pieceId: p ? p.id : (ctx.pieceId || ''), pieceTitle: p ? p.title : (ctx.pieceTitle || ''), message: msg };
        var btn = e.target.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Sending…';
        submit([row]).then(function () { step = 3; renderForm(); });
      };
    }
    s.querySelector('.x').onclick = closeForm;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-form]');
    if (b) { e.preventDefault(); openForm({ id: b.getAttribute('data-id') || null, pieceId: b.getAttribute('data-piece-id'), pieceTitle: b.getAttribute('data-piece-title') }); }
  });

  /* ---------- scroll reveal ---------- */
  function reveal(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.in)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (x) { x.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (x) { io.observe(x); });
  }

  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(modal); reveal(); });

  window.KO = { BY_ID: BY_ID, refresh: function () {}, reveal: reveal, esc: esc };
})();
