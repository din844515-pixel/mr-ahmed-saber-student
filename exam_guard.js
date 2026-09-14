(function () {
  let submitting = false;

  function getExamModal() {
    return document.getElementById('examModal');
  }

  function getExamId(modal) {
    const btn = modal?.querySelector('[data-submit-exam]');
    const onclick = btn?.getAttribute('onclick') || '';
    const match = onclick.match(/submitStudentExam\(\s*['"]([^'"]+)['"]/);
    return match ? match[1] : '';
  }

  function forceSubmit() {
    const modal = getExamModal();
    if (!modal || submitting) return;

    const examId = getExamId(modal);
    if (!examId || typeof window.submitStudentExam !== 'function') return;

    submitting = true;

    Promise.resolve(window.submitStudentExam(examId, true))
      .catch(() => {
        submitting = false;
      });
  }

  // لو الطالب خرج من صفحة الامتحان أو فتح تطبيق/تبويب آخر
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      forceSubmit();
    }
  }, true);

  // زر X لا يسمح بترك الامتحان بدون تسليم
  document.addEventListener('click', function (event) {
    if (!getExamModal()) return;

    const button = event.target.closest('#examModal .dashbar button');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    forceSubmit();
  }, true);

  // زر Escape لا يسمح بترك الامتحان
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (!getExamModal()) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    forceSubmit();
  }, true);
})();
