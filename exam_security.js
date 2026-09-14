/* MR. Ahmed Saber — Exam Security Layer
   Best-effort browser protection. Real screenshot blocking requires a native Android
   FLAG_SECURE implementation; a normal website cannot guarantee that screenshots
   are impossible.
*/
(function () {
  function examOpen() {
    return !!document.getElementById('examModal');
  }

  function block(e) {
    if (!examOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  // Block copy/cut/paste, text selection, context menu and drag while an exam is open.
  ['copy', 'cut', 'contextmenu', 'dragstart', 'selectstart'].forEach(function (name) {
    document.addEventListener(name, block, true);
  });

  document.addEventListener('keydown', function (e) {
    if (!examOpen()) return;
    const k = String(e.key || '').toLowerCase();

    // Print / save / copy / devtools / view-source shortcuts.
    if (
      (e.ctrlKey || e.metaKey) &&
      ['p', 's', 'c', 'x', 'u'].includes(k)
    ) return block(e);

    if (e.key === 'F12' || e.key === 'PrintScreen') return block(e);

    // Common Android/Windows screenshot combinations where the browser exposes the key event.
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && ['3', '4', '5'].includes(k)) {
      return block(e);
    }
  }, true);

  // If the browser exposes a print request, cancel it while an exam is active.
  window.addEventListener('beforeprint', function (e) {
    if (examOpen()) {
      try { window.stop(); } catch (_) {}
      alert('تصوير أو طباعة الامتحان غير مسموح أثناء الامتحان.');
    }
  });

  // Add a visible student-specific watermark over the exam.
  function addWatermark() {
    if (!examOpen() || document.getElementById('examSecurityWatermark')) return;
    const code = localStorage.getItem('student_code') || '';
    const name =
      document.querySelector('#studentPortal .dash-title h1')?.textContent ||
      'طالب المنصة';

    const wm = document.createElement('div');
    wm.id = 'examSecurityWatermark';
    wm.setAttribute('aria-hidden', 'true');
    wm.textContent = name.replace(/^أهلًا\s*/, '') + (code ? ' — ' + code : '');
    wm.style.cssText = [
      'position:fixed','inset:0','z-index:2147483646','pointer-events:none',
      'display:flex','align-items:center','justify-content:center',
      'font:700 22px/1.4 Arial,sans-serif','letter-spacing:1px',
      'transform:rotate(-25deg)','opacity:.10','color:#000',
      'white-space:nowrap','text-align:center'
    ].join(';');
    document.body.appendChild(wm);
  }

  const observer = new MutationObserver(function () {
    if (examOpen()) addWatermark();
    else document.getElementById('examSecurityWatermark')?.remove();
  });

  function start() {
    observer.observe(document.body, { childList: true, subtree: true });
    if (examOpen()) addWatermark();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
