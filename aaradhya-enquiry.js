(function () {
  const NETLIFY_FORM_SELECTOR = 'form[data-netlify="true"], form[netlify]';
  const HOMEPAGE_FORM_SELECTORS = [
    'form[name="flights"].quick-search',
    'form[name="holidays"].quick-search',
    'form[name="contact"].modal-form',
    'form[name="contact"].enquiry-form'
  ];
  const DATE_FIELD_NAMES = new Set(['departure_date', 'return_date', 'travel_date', 'preferred_date']);
  const pendingSubmits = new WeakSet();

  function isNepaliPage() {
    return document.documentElement.lang === 'ne';
  }

  function copy(en, ne) {
    return isNepaliPage() ? ne : en;
  }

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
      toggle.setAttribute(
        'aria-label',
        isOpen
          ? copy('Close navigation menu', 'नेभिगेसन मेनु बन्द गर्नुहोस्')
          : copy('Open navigation menu', 'नेभिगेसन मेनु खोल्नुहोस्')
      );
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
      'top:50%',
      'z-index:9999',
      'width:min(calc(100% - 36px),460px)',
      'padding:20px 22px',
      'border:1px solid rgba(216,185,129,0.5)',
      'border-radius:8px',
      'background:rgba(16,24,32,0.96)',
      'color:#fffdf7',
      'box-shadow:0 28px 90px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.08)',
      'backdrop-filter:blur(18px)',
      'opacity:0',
      'pointer-events:none',
      'text-align:center',
      'transform:translate(-50%,-44%) scale(0.98)',
      'transition:opacity 220ms ease, transform 220ms ease'
    ].join(';');
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message, tone) {
    const toast = ensureToast();
    toast.style.font = isNepaliPage()
      ? "700 0.96rem/1.65 'Noto Sans Devanagari', 'Nirmala UI', Arial, sans-serif"
      : "700 0.96rem/1.55 Montserrat, Arial, sans-serif";
    toast.style.borderColor = tone === 'error' ? 'rgba(217,139,139,0.68)' : 'rgba(216,185,129,0.5)';
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%,-50%) scale(1)';

    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,-44%) scale(0.98)';
    }, 2600);
  }

  function ensureValidationStyles() {
    if (document.getElementById('aaradhya-validation-styles')) return;

    const style = document.createElement('style');
    style.id = 'aaradhya-validation-styles';
    style.textContent = `
      .field-shell-invalid .qs-label,
      .field-shell-invalid .form-label,
      .field-shell-invalid label {
        color: #fff6e0 !important;
      }

      input[aria-invalid="true"],
      select[aria-invalid="true"],
      textarea[aria-invalid="true"] {
        border-color: rgba(217, 139, 139, 0.86) !important;
        box-shadow: 0 0 0 3px rgba(217, 139, 139, 0.16), 0 10px 28px rgba(84, 18, 18, 0.16) !important;
        background-color: rgba(84, 18, 18, 0.14) !important;
      }
    `;
    document.head.appendChild(style);
  }

  function getFieldShell(field) {
    return field.closest('.qs-inner, .form-field, .form-group') || field.parentElement;
  }

  function setFieldError(field, message) {
    const shell = getFieldShell(field);
    if (!shell) return;

    let error = shell.querySelector(':scope > .field-error-message');
    if (!error) {
      error = document.createElement('div');
      error.className = 'field-error-message';
      error.style.cssText = [
        'margin-top:3px',
        'padding:7px 9px',
        'border:1px solid rgba(217,139,139,0.42)',
        'border-radius:6px',
        'background:rgba(84,18,18,0.34)',
        'color:#fff0f0',
        'font-size:0.78rem',
        'font-weight:700',
        'line-height:1.45',
        'letter-spacing:0'
      ].join(';');
      shell.appendChild(error);
    }

    error.textContent = message;
    shell.classList.add('field-shell-invalid');
    field.setAttribute('aria-invalid', 'true');
    field.setCustomValidity(message);
  }

  function clearFieldError(field) {
    const shell = getFieldShell(field);
    shell?.querySelector(':scope > .field-error-message')?.remove();
    shell?.classList.remove('field-shell-invalid');
    field.removeAttribute('aria-invalid');
    field.setCustomValidity('');
  }

  function getFieldLabel(field) {
    const shell = getFieldShell(field);
    const label = shell?.querySelector('.qs-label, label');
    const text = label?.textContent?.replace('*', '').trim();
    return text || field.getAttribute('aria-label') || field.placeholder || field.name.replace(/[_-]+/g, ' ');
  }

  function validateRequired(field, revealRequired) {
    if (!field.required) return '';
    const value = field.value.trim();
    if (field.type === 'checkbox' || field.type === 'radio') {
      return field.checked ? '' : copy('Please select this option.', 'कृपया यो विकल्प छान्नुहोस्।');
    }
    if (value) return '';
    return revealRequired
      ? copy(`Please complete ${getFieldLabel(field)}.`, `कृपया ${getFieldLabel(field)} भर्नुहोस्।`)
      : '';
  }

  function validateEmail(field) {
    const value = field.value.trim();
    if (!value) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? ''
      : copy('Please enter a valid email address.', 'कृपया सही इमेल ठेगाना लेख्नुहोस्।');
  }

  function validateName(field, revealRequired) {
    const value = field.value.trim();
    if (!value && field.required && revealRequired) return copy('Please enter your name.', 'कृपया आफ्नो नाम लेख्नुहोस्।');
    if (!value) return '';
    if (value.length < 2) return copy('Please enter a real name.', 'कृपया सही नाम लेख्नुहोस्।');
    if (!/[\p{L}]/u.test(value)) return copy('Name must include letters.', 'नाममा अक्षर हुनुपर्छ।');
    if (/^\d+$/.test(value)) return copy('Name cannot be only numbers.', 'नाम केवल अंक मात्र हुन सक्दैन।');
    if (!/^[\p{L}\p{M}\s.'-]+$/u.test(value)) return copy('Use letters, spaces, hyphen, or apostrophe only.', 'नाममा अक्षर, खाली ठाउँ वा सामान्य चिह्न मात्र प्रयोग गर्नुहोस्।');
    return '';
  }

  function validatePhone(field, revealRequired) {
    const value = field.value.trim();
    if (!value && field.required && revealRequired) return copy('Please enter your phone number.', 'कृपया फोन नम्बर लेख्नुहोस्।');
    if (!value) return '';
    if (!/^\+?[\d\s().-]+$/.test(value)) return copy('Use digits and an optional + only.', 'फोनमा अंक र सुरुमा + मात्र प्रयोग गर्नुहोस्।');

    const digits = value.replace(/\D/g, '');
    if (digits.length < 7) return copy('Phone number is too short.', 'फोन नम्बर धेरै छोटो भयो।');
    if (digits.length > 15) return copy('Phone number is too long.', 'फोन नम्बर धेरै लामो भयो।');
    if (/^(\d)\1+$/.test(digits)) return copy('Please enter a valid phone number.', 'कृपया सही फोन नम्बर लेख्नुहोस्।');
    return '';
  }

  function isRealIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validateDate(field, revealRequired) {
    const value = field.value.trim();
    if (!value && field.required && revealRequired) return copy('Please choose a valid date.', 'कृपया सही मिति छान्नुहोस्।');
    if (!value) return '';
    if (!isRealIsoDate(value)) return copy('Please choose a valid date from the calendar.', 'कृपया क्यालेन्डरबाट सही मिति छान्नुहोस्।');
    return '';
  }

  function validateField(field, options = {}) {
    const revealRequired = options.revealRequired === true;
    clearFieldError(field);

    let message = validateRequired(field, revealRequired);
    if (field.name === 'name') message = validateName(field, revealRequired);
    if (!message && field.name === 'phone') message = validatePhone(field, revealRequired);
    if (!message && DATE_FIELD_NAMES.has(field.name)) message = validateDate(field, revealRequired);
    if (!message && field.type === 'email') message = validateEmail(field);
    if (!message && field.validity.patternMismatch) {
      message = copy('Please use the requested format.', 'कृपया सही ढाँचा प्रयोग गर्नुहोस्।');
    }
    if (!message && field.validity.tooShort) {
      message = copy(`Please enter at least ${field.minLength} characters.`, `कृपया कम्तीमा ${field.minLength} अक्षर लेख्नुहोस्।`);
    }
    if (!message && field.validity.tooLong) {
      message = copy(`Please keep this under ${field.maxLength} characters.`, `कृपया यसलाई ${field.maxLength} अक्षरभित्र राख्नुहोस्।`);
    }

    if (message) {
      setFieldError(field, message);
      return false;
    }

    return true;
  }

  function validateForm(form) {
    const fields = [...form.querySelectorAll('input, select, textarea')].filter(field => field.name);
    form.dataset.validationSubmitted = 'true';
    const invalidFields = fields.filter(field => !validateField(field, { revealRequired: true }));

    if (invalidFields.length) {
      invalidFields[0].focus({ preventScroll: true });
      invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }

    return true;
  }

  function prepareValidationFields() {
    ensureValidationStyles();

    document.querySelectorAll(NETLIFY_FORM_SELECTOR).forEach(form => {
      form.noValidate = true;
      console.log('[Aaradhya forms] validation prepared:', form.name, form.className);
      form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!field.name) return;

        if (field.name === 'phone') {
          field.type = 'tel';
          field.inputMode = 'tel';
          field.minLength = 7;
          field.maxLength = 18;
          field.pattern = '^\\+?[0-9\\s().-]{7,18}$';
          field.autocomplete = field.autocomplete || 'tel';
        }

        if (field.name === 'name') {
          field.type = field.type || 'text';
          field.minLength = 2;
          field.maxLength = 80;
          field.autocomplete = field.autocomplete || 'name';
        }

        if (DATE_FIELD_NAMES.has(field.name) && field.tagName === 'INPUT') {
          field.type = 'date';
          field.removeAttribute('onfocus');
          field.removeAttribute('onblur');
          field.placeholder = '';
          field.min = field.name === 'return_date' ? '' : new Date().toISOString().slice(0, 10);
        }

        const validateLive = () => {
          const revealRequired = field.closest('form')?.dataset.validationSubmitted === 'true' || field.hasAttribute('aria-invalid');
          validateField(field, { revealRequired });
        };

        field.addEventListener('input', validateLive);
        field.addEventListener('change', validateLive);
        field.addEventListener('blur', validateLive);
      });
    });
  }

  function setButtonState(button, isSending) {
    if (!button) return;

    if (isSending) {
      button.dataset.originalHtml = button.dataset.originalHtml || button.innerHTML;
      button.textContent = copy('Sending...', 'पठाउँदै...');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }

  async function submitNetlifyForm(form, submitter) {
    console.log('intercepted submit', form.name, form.className);
    console.log('[Aaradhya forms] submit intercepted:', form.name, form.className);

    if (!validateForm(form)) {
      showToast(copy('Please correct the highlighted fields.', 'कृपया देखाइएका विवरण सच्याउनुहोस्।'), 'error');
      return;
    }

    if (pendingSubmits.has(form)) return;
    pendingSubmits.add(form);

    const button = submitter || form.querySelector('[type="submit"], .btn, .form-submit, .qs-btn');
    setButtonState(button, true);

    try {
      const formData = new FormData(form);
      if (!formData.has('page_title')) formData.append('page_title', document.title);
      if (!formData.has('page_url')) formData.append('page_url', window.location.href);

      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });

      if (!response.ok) throw new Error(`Netlify form post failed: ${response.status}`);

      console.log('[Aaradhya forms] Netlify AJAX post succeeded:', form.name);
      form.reset();
      delete form.dataset.validationSubmitted;
      form.querySelectorAll('.field-error-message').forEach(error => error.remove());
      form.querySelectorAll('.field-shell-invalid').forEach(shell => shell.classList.remove('field-shell-invalid'));
      form.querySelectorAll('[aria-invalid="true"]').forEach(field => field.removeAttribute('aria-invalid'));
      showToast(
        copy('Your submission has been sent. We’ll get back to you shortly.', 'तपाईंको विवरण पठाइयो। हामी चाँडै सम्पर्क गर्नेछौं।'),
        'success'
      );
    } catch (error) {
      console.error(error);
      showToast(copy('We could not send your submission. Please try again.', 'विवरण पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।'), 'error');
    } finally {
      pendingSubmits.delete(form);
      setButtonState(button, false);
    }
  }

  function initNetlifyAjaxForms() {
    const boundForms = new Set();

    function bindForm(form, label) {
      if (!form || form.dataset.ajaxSubmitBound === 'true') return;
      form.dataset.ajaxSubmitBound = 'true';
      boundForms.add(form);
      form.addEventListener('submit', event => {
        event.preventDefault();
        submitNetlifyForm(form, event.submitter);
      });

      if (label === 'flights') console.log('bound flights form');
      if (label === 'holidays') console.log('bound holidays form');
      console.log('[Aaradhya forms] bound form:', label || form.name, form.className);
    }

    HOMEPAGE_FORM_SELECTORS.forEach(selector => {
      document.querySelectorAll(selector).forEach(form => {
        bindForm(form, form.name);
      });
    });

    document.querySelectorAll(NETLIFY_FORM_SELECTOR).forEach(form => {
      if (!boundForms.has(form)) bindForm(form, form.name);
    });

    console.log('[Aaradhya forms] submit handler bound:', document.querySelectorAll(NETLIFY_FORM_SELECTOR).length);
  }

  function initActionButtons() {
    document.querySelectorAll('button:not([type])').forEach(button => {
      button.type = 'button';
    });

    document.querySelectorAll('.cdot').forEach((dot, index) => {
      dot.setAttribute('aria-label', copy(`Show slide ${index + 1}`, `स्लाइड ${index + 1} देखाउनुहोस्`));
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('button.card-cta, button.dest-explore');
      if (!button || button.hasAttribute('onclick') || typeof window.openModal !== 'function') return;

      const card = button.closest('article, .destination-card, .dest-card, .card-glass');
      const title = card?.querySelector('h3, h2')?.textContent?.trim() || copy('Travel Enquiry', 'यात्रा सोधपुछ');
      window.openModal(copy('Travel Enquiry', 'यात्रा सोधपुछ'), title);
    });
  }

  function init() {
    initMobileNav();
    prepareValidationFields();
    initNetlifyAjaxForms();
    initActionButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
