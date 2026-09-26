// Progressive enhancement only — every page works with this file absent.
(() => {
  'use strict';

  // --- Tag filtering on the notes index --------------------------------------
  const filters = document.querySelector('[data-filters]');
  const list = document.querySelector('[data-post-list]');

  if (filters && list) {
    const chips = [...filters.querySelectorAll('.chip')];
    const items = [...list.querySelectorAll('.post-item')];
    const empty = document.querySelector('[data-empty]');
    filters.hidden = chips.length <= 1;

    const apply = (tag, { push = true } = {}) => {
      let shown = 0;
      for (const item of items) {
        const match = !tag || (item.dataset.tags || '').split(' ').includes(tag);
        item.hidden = !match;
        if (match) shown++;
      }
      for (const chip of chips) chip.classList.toggle('is-active', (chip.dataset.tag || '') === tag);
      if (empty) empty.hidden = shown !== 0;

      if (push) {
        const url = tag ? `?tag=${encodeURIComponent(tag)}` : location.pathname;
        history.replaceState(null, '', url);
      }
    };

    for (const chip of chips) {
      chip.addEventListener('click', () => apply(chip.dataset.tag || ''));
    }

    const initial = new URLSearchParams(location.search).get('tag');
    if (initial) apply(initial, { push: false });
  }

  // --- Copy button on code blocks -------------------------------------------
  if (navigator.clipboard) {
    for (const pre of document.querySelectorAll('.prose pre')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = 'copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pre.querySelector('code').innerText.replace(/\n$/, ''));
          btn.textContent = 'copied';
        } catch {
          btn.textContent = 'failed';
        }
        setTimeout(() => (btn.textContent = 'copy'), 1400);
      });
      pre.appendChild(btn);
    }
  }
})();
