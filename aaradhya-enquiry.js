(function () {
  function copy(en, ne) {
    return document.documentElement.lang === 'ne' ? ne : en;
  }

  function closeMobileNav(nav) {
    const toggle = nav?.querySelector('.nav-toggle');
    nav?.classList.remove('nav-open');
    toggle?.setAttribute('aria-expanded', 'false');
    toggle?.setAttribute('aria-label', copy('Open navigation menu', 'Open navigation menu'));
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
          ? copy('Close navigation menu', 'Close navigation menu')
          : copy('Open navigation menu', 'Open navigation menu')
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

  function initActionButtons() {
    document.querySelectorAll('button:not([type])').forEach(button => {
      button.type = 'button';
    });

    document.querySelectorAll('.cdot').forEach((dot, index) => {
      dot.setAttribute('aria-label', copy(`Show slide ${index + 1}`, `Show slide ${index + 1}`));
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('button.card-cta, button.dest-explore');
      if (!button || button.hasAttribute('onclick') || typeof window.openModal !== 'function') return;

      const card = button.closest('article, .destination-card, .dest-card, .card-glass');
      const title = card?.querySelector('h3, h2')?.textContent?.trim() || copy('Travel Enquiry', 'Travel Enquiry');
      window.openModal(copy('Travel Enquiry', 'Travel Enquiry'), title);
    });
  }

  function init() {
    initMobileNav();
    initActionButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
