(() => {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({name, pass: Boolean(pass), detail});
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const compact = value => normalize(value).replace(/\s/g, '');
  const text = normalize(document.querySelector('main')?.textContent || '');
  const expected = ['gioi-thieu','kenh-truyen-thong','timeline','su-kien','merch','quy-trinh','lien-he'];
  const sections = Array.from(document.querySelectorAll('main > section'));
  const actual = sections.map(x => x.id).filter(id => expected.includes(id));
  check('G3-one-main', document.querySelectorAll('main').length === 1);
  check('G3-one-h1', document.querySelectorAll('h1').length === 1);
  check('G3-Vietnamese-language', document.documentElement.lang === 'vi');
  check('G3-eight-top-level-sections', sections.length === 8, sections.length);
  check('G2-hero-title-groups', Array.from(document.querySelectorAll('h1 span')).map(x => normalize(x.textContent || '')).join(' ') === 'DÒNG CHẢY HOÀI NIỆM');
  check('G2-hero-artwork-after-primary-action', document.querySelector('.retro-primary-cta')?.compareDocumentPosition(document.querySelector('.cassette-art')) & Node.DOCUMENT_POSITION_FOLLOWING);
  check('G2-full-hero-description-retained-in-about', document.querySelector('#gioi-thieu .retro-intro-full')?.textContent.includes('nơi đài cát-sét phát giai điệu thanh xuân và điện thoại bàn lưu giữ bao hẹn ước'));
  const mobileMenu = document.querySelector('#mobile-navigation');
  check('G4-eight-disclosure-destinations', mobileMenu?.querySelectorAll('a').length === 8);
  check('G4-four-direct-desktop-links', document.querySelectorAll('.site-nav a').length === 4);
  check('G3-section-order', JSON.stringify(actual) === JSON.stringify(expected), JSON.stringify(actual));
  check('G3-nested-ticket-section', document.querySelector('#su-kien #ve'));
  for (const phrase of ['DÒNG CHẢY HOÀI NIỆM','Xuôi dòng ký ức, đánh thức thanh xuân','Cơm Bưng Nước Rót','On The Radio','76 Thái Phiên','99.000','169.000','CHƯA BÁN VÉ','SẮP CÔNG BỐ','Tuổi Xì Tin','Tuổi Xì Lây']) {
    check('G3-copy-' + phrase, text.includes(phrase));
  }
  for (const [name, regex] of [['popup-date',/20[–\-]21\s*\.11\.2026/],['concert-date',/22\s*\.11\.2026/],['concert-time',/15:00\s*[–\-]\s*19:00/],['promotion-start',/06\/11\/2026/],['promotion-end',/12\/11\/2026/],['planned-process',/dự kiến/i]]) {
    check('G3-' + name, regex.test(text));
  }
  const broken = Array.from(document.querySelectorAll('a[href^="#"]')).map(a => a.getAttribute('href')).filter(href => href.length > 1 && !document.getElementById(href.slice(1)));
  check('G4-fragment-targets', !broken.length, JSON.stringify(broken));
  for (const url of ['https://forms.gle/tW1VU8vpASc53CJa8','https://www.tiktok.com/@loihoidap199x']) {
    check('G4-external-' + url, document.querySelector(`a[href="${url}"]`));
  }
  const unsafe = Array.from(document.querySelectorAll('a[target="_blank"]')).filter(a => !a.relList.contains('noopener') || !a.relList.contains('noreferrer')).map(a => a.href);
  check('G4-external-rel', !unsafe.length, JSON.stringify(unsafe));
  check('G4-no-invented-facebook', !Array.from(document.links).some(a => /facebook\.com|fb\.com/.test(a.href)));
  check('G4-ticket-contact', document.querySelector('#ve a[href="#lien-he"]'));
  const form = document.querySelector('#lien-he form');
  check('G6-contact-form', form);
  for (const field of Array.from(form?.querySelectorAll('input,textarea') || [])) {
    check('G6-label-' + field.name, field.id && document.querySelector(`label[for="${field.id}"]`));
    check('G6-input-size-' + field.name, parseFloat(getComputedStyle(field).fontSize) >= 16);
    check('G7-required-' + field.name, field.required);
  }
  check('G6-skip-target', document.querySelector('a[href="#main-content"]') && document.querySelector('main#main-content'));
  const source = new DOMParser().parseFromString(window.__referenceHtml || '', 'text/html');
  const walker = source.createTreeWalker(source.querySelector('main') || source.body, NodeFilter.SHOW_TEXT);
  const missing = [];
  let compared = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement.closest('form,script,style,.material-symbols-outlined')) continue;
    const phrase = normalize(node.nodeValue || '');
    if (phrase.length < 18) continue;
    if (phrase.includes('đã được lưu giữ vào hòm thư')) continue; // The source's fabricated form-success claim is intentionally removed.
    compared++;
    if (!compact(text).includes(compact(phrase))) missing.push(phrase);
  }
  check('G3-all-source-text-nodes-outside-form', !missing.length, {compared,missing});
  return {phase:'content', passed:checks.filter(x => x.pass).length, failed:checks.filter(x => !x.pass).length, checks};
})();
