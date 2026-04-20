(function () {
  const NETLIFY_FORM_SELECTOR = 'form[data-netlify="true"], form[netlify]';
  const pendingSubmits = new WeakSet();

  function closeMobileNav(nav) {
    const toggle = nav?.querySelector('.nav-toggle');
    nav?.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', 'Open navigation menu');
  }

  function initMobileNav() {
    const nav = document.querySelector('nav');
    const toggle = nav?.querySelector('.nav-toggle');
    const links = nav?.querySelector('.nav-links');
    if (!nav || !toggle || !links) return;

    toggle.addEventListener('click', event => {
      event.stopPropagation();
      const isOpen = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    links.addEventListener('click', event => {
      if (event.target.closest('a')) closeMobileNav(nav);
    });

    document.addEventListener('click', event => {
      if (!nav.classList.contains('nav-open') || nav.contains(event.target)) return;
      closeMobileNav(nav);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileNav(nav);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1180) closeMobileNav(nav);
    });
  }

  function setButtonState(button, isSending) {
    if (!button) return;

    if (isSending) {
      button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML;
      button.textContent = 'Sending...';
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }

  function setStatus(form, message, tone) {
    let status = form.querySelector('.enquiry-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'enquiry-status';
      status.setAttribute('role', 'status');
      status.style.cssText = [
        'margin-top:12px',
        'font-size:0.78rem',
        'line-height:1.6',
        'font-weight:600',
        'letter-spacing:0.02em',
        'grid-column:1 / -1'
      ].join(';');
      form.appendChild(status);
    }

    status.textContent = message;
    status.style.color = tone === 'error' ? '#d98b8b' : 'var(--gold-light, #d8b981)';
  }

  function ensureToast() {
    let toast = document.querySelector('.aaradhya-toast');
    if (toast) return toast;

    toast = document.createElement('div');
    toast.className = 'aaradhya-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:24px',
      'z-index:9999',
      'width:min(calc(100% - 32px),420px)',
      'padding:16px 18px',
      'border:1px solid rgba(216,185,129,0.42)',
      'border-radius:8px',
      'background:rgba(16,24,32,0.94)',
      'color:#fff',
      'box-shadow:0 22px 60px rgba(0,0,0,0.35)',
      'backdrop-filter:blur(18px)',
      'font:600 0.88rem/1.5 Montserrat, Arial, sans-serif',
      'opacity:0',
      'pointer-events:none',
      'transform:translate(-50%,14px)',
      'transition:opacity 220ms ease, transform 220ms ease'
    ].join(';');
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message) {
    const toast = ensureToast();
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%,0)';

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,14px)';
    }, 3800);
  }

  function appendIfMissing(formData, key, value) {
    if (!formData.has(key) && value) formData.append(key, value);
  }

  function getNetlifyForm(target) {
    if (target instanceof HTMLFormElement && target.matches(NETLIFY_FORM_SELECTOR)) return target;
    return target?.closest?.(NETLIFY_FORM_SELECTOR) || null;
  }

  async function submitNetlifyForm(form, submitter) {
    const button = submitter || form.querySelector('[type="submit"], .btn, .form-submit, .qs-btn');

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus(form, 'Please complete the required fields.', 'error');
      return;
    }

    if (pendingSubmits.has(form)) return;
    pendingSubmits.add(form);
    setButtonState(button, true);
    setStatus(form, 'Sending your request...', 'info');

    const formData = new FormData(form);
    appendIfMissing(formData, 'page_title', document.title);
    appendIfMissing(formData, 'page_url', window.location.href);

    const modalTitle = form.closest('.modal')?.querySelector('#modalTitle')?.textContent?.trim();
    if (modalTitle) appendIfMissing(formData, 'selected_context', modalTitle);

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });

      if (!response.ok) throw new Error(`Netlify form post failed: ${response.status}`);

      form.reset();
      setStatus(form, 'Your request has been received successfully.', 'success');
      showToast('Your request has been received successfully.');
    } catch (error) {
      setStatus(form, 'We could not send your request. Please try again.', 'error');
      showToast('We could not send your request. Please try again.');
      console.error(error);
    } finally {
      pendingSubmits.delete(form);
      setButtonState(button, false);
    }
  }

  function handleNetlifySubmit(event) {
    const form = getNetlifyForm(event.target);
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    submitNetlifyForm(form, event.submitter);
  }

  function initNetlifyForms() {
    document.querySelectorAll(NETLIFY_FORM_SELECTOR).forEach(form => {
      if (form.dataset.ajaxSubmitBound === 'true') return;
      form.dataset.ajaxSubmitBound = 'true';
      form.addEventListener('submit', handleNetlifySubmit, true);
    });

    document.addEventListener('submit', handleNetlifySubmit, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initMobileNav();
      initNetlifyForms();
    }, { once: true });
  } else {
    initMobileNav();
    initNetlifyForms();
  }
})();
