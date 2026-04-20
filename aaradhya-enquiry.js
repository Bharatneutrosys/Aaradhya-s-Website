(function () {
  const EMAILJS_CONFIG = {
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',
    serviceId: 'YOUR_EMAILJS_SERVICE_ID',
    templateId: 'YOUR_EMAILJS_TEMPLATE_ID'
  };

  let emailJsReady;
  const pendingSubmits = new WeakSet();

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isNepaliPage() {
    return document.documentElement.lang === 'ne';
  }

  function copy(en, ne) {
    return isNepaliPage() ? ne : en;
  }

  function fieldName(field) {
    const id = field.id && document.querySelector(`label[for="${field.id}"]`);
    const label = id || field.closest('.form-field, .qs-field')?.querySelector('label, .qs-label');
    return clean(field.name || label?.textContent || field.getAttribute('aria-label') || field.placeholder || field.type || 'Field');
  }

  function collectFields(root) {
    const fields = {};
    root?.querySelectorAll('input, select, textarea').forEach(field => {
      if (field.type === 'hidden' || field.type === 'button' || field.type === 'submit') return;
      const value = clean(field.value);
      if (field.tagName === 'SELECT' && field.selectedIndex === 0 && /^(preferred|package type|number of guests)/i.test(value)) return;
      if (!value) return;
      fields[fieldName(field)] = value;
    });
    return fields;
  }

  function contextFromElement(el) {
    const card = el.closest('article, .card, .dest-card, .service-item, .offer, .service-card, .band, section');
    return {
      page: document.title,
      url: window.location.href,
      item: clean(card?.querySelector('h1, h2, h3, .card-title, .dest-name, .service-title')?.textContent),
      details: clean(card?.innerText),
      button: clean(el.textContent)
    };
  }

  function emailJsParams(payload) {
    const fields = Object.entries(payload.fields || {})
      .map(([key, value]) => [key, clean(value)])
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return {
      inquiry_type: payload.type || 'General enquiry',
      inquiry_title: payload.title || 'Travel request',
      page_title: payload.page || document.title,
      page_url: payload.url || window.location.href,
      fields,
      notes: payload.notes || '',
      message: [
        `Inquiry type: ${payload.type || 'General enquiry'}`,
        payload.title ? `Selected item: ${payload.title}` : '',
        payload.page ? `Page: ${payload.page}` : '',
        payload.url ? `URL: ${payload.url}` : '',
        fields ? `Fields:\n${fields}` : '',
        payload.notes ? `Notes:\n${payload.notes}` : ''
      ].filter(Boolean).join('\n\n')
    };
  }

  function loadEmailJs() {
    if (window.emailjs) {
      window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
      return Promise.resolve(window.emailjs);
    }

    if (!emailJsReady) {
      emailJsReady = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.async = true;
        script.onload = () => {
          window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
          resolve(window.emailjs);
        };
        script.onerror = () => reject(new Error('EmailJS could not be loaded.'));
        document.head.appendChild(script);
      });
    }

    return emailJsReady;
  }

  function setButtonState(button, isSending) {
    if (!button) return;
    if (isSending) {
      button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML;
      button.textContent = copy('Sending...', 'पठाउँदै...');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
    }
  }

  function setStatus(target, message, tone) {
    if (!target) return;
    const anchor = target.matches?.('form') ? target : target.closest('form') || target.parentElement;
    if (!anchor) return;

    let status = anchor.querySelector('.enquiry-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'enquiry-status';
      status.setAttribute('role', 'status');
      status.style.cssText = 'margin-top:12px;font-size:0.78rem;line-height:1.6;font-weight:600;';
      anchor.appendChild(status);
    }

    status.textContent = message;
    status.style.color = tone === 'error' ? '#b85c5c' : 'var(--gold-light, #d8b981)';
  }

  async function submitEnquiry(payload, options = {}) {
    const button = options.button || null;
    const statusTarget = options.statusTarget || options.form || button || null;
    const lockTarget = options.form || button || document.body;

    if (pendingSubmits.has(lockTarget)) return { ok: false, duplicate: true };
    pendingSubmits.add(lockTarget);
    setButtonState(button, true);
    setStatus(statusTarget, copy('Sending your enquiry...', 'तपाईंको सोधपुछ पठाउँदै...'), 'info');

    const normalized = {
      type: payload.type || 'General enquiry',
      title: payload.title || '',
      page: payload.page || document.title,
      url: payload.url || window.location.href,
      fields: payload.fields || {},
      notes: payload.notes || ''
    };

    try {
      const emailjs = await loadEmailJs();
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        emailJsParams(normalized)
      );
      setStatus(statusTarget, copy('Thank you. Your enquiry has been sent.', 'धन्यवाद। तपाईंको सोधपुछ पठाइएको छ।'), 'success');
      return { ok: true, method: 'emailjs' };
    } catch (error) {
      setStatus(statusTarget, copy('Could not send the enquiry. Please try again.', 'सोधपुछ पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।'), 'error');
      return { ok: false, method: 'emailjs', error };
    } finally {
      pendingSubmits.delete(lockTarget);
      setButtonState(button, false);
    }
  }

  window.submitAaradhyaEnquiry = submitEnquiry;
  window.collectAaradhyaFields = collectFields;

  function closeMobileNav(nav) {
    const toggle = nav?.querySelector('.nav-toggle');
    nav?.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', copy('Open navigation menu', 'नेभिगेसन मेनु खोल्नुहोस्'));
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
      toggle.setAttribute('aria-label', isOpen
        ? copy('Close navigation menu', 'नेभिगेसन मेनु बन्द गर्नुहोस्')
        : copy('Open navigation menu', 'नेभिगेसन मेनु खोल्नुहोस्'));
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav, { once: true });
  } else {
    initMobileNav();
  }

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.matches('form')) return;
    event.preventDefault();

    const button = form.querySelector('[type="submit"], .btn, .form-submit');
    const ctx = contextFromElement(form);
    submitEnquiry({
      type: 'Contact form enquiry',
      title: ctx.item || 'Travel plan request',
      page: ctx.page,
      url: ctx.url,
      fields: collectFields(form)
    }, { form, button, statusTarget: form });
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('form .btn[type="button"]');
    if (!button) return;

    const form = button.closest('form');
    if (form) {
      event.preventDefault();
      const ctx = contextFromElement(form);
      submitEnquiry({
        type: 'Contact form enquiry',
        title: ctx.item || 'Travel plan request',
        page: ctx.page,
        url: ctx.url,
        fields: collectFields(form)
      }, { form, button, statusTarget: form });
    }
  });
})();
