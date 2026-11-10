(() => {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({name, pass:Boolean(pass), detail});
  check('G5-no-horizontal-overflow-' + innerWidth, document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1, {viewport:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth});
  const header = document.querySelector('header');
  const nav = header?.querySelector('#mobile-navigation');
  const destinations = ['gioi-thieu','timeline','su-kien','ve','merch','quy-trinh','kenh-truyen-thong','lien-he'];
  for (const id of destinations) check('G5-nav-destination-' + id, nav?.querySelector(`a[href="#${id}"]`));
  const controls = Array.from(document.querySelectorAll('.retro-primary-cta,.mobile-menu-button,header .site-nav a,#mobile-navigation a,button[type="submit"]')).filter(el => el.getClientRects().length > 0);
  for (const control of controls) check('G5-minimum-control-height-' + (control.getAttribute('href') || control.getAttribute('aria-label') || control.textContent?.trim()), control.getBoundingClientRect().height >= 44, control.getBoundingClientRect().height);
  for (const field of document.querySelectorAll('#lien-he input,#lien-he textarea')) check('G5-input-size-' + field.id, parseFloat(getComputedStyle(field).fontSize) >= 16);
  if (innerWidth <= 390) {
    const cta = document.querySelector('.retro-primary-cta')?.getBoundingClientRect();
    const art = document.querySelector('.cassette-art')?.getBoundingClientRect();
    check('G3-primary-cta-before-artwork-' + innerWidth, Boolean(cta && art && cta.top < art.top), {cta:cta?.toJSON(),art:art?.toJSON()});
    check('G3-primary-cta-first-viewport-' + innerWidth, Boolean(cta && cta.bottom <= 844), cta?.toJSON());
  }
  const importantClips = Array.from(document.querySelectorAll('main h1,main h2,main p,main a,main button,main img')).filter(el => {
    const style = getComputedStyle(el);
    return el.scrollWidth > el.clientWidth + 1 && style.overflowX !== 'auto' && style.overflowX !== 'scroll';
  }).slice(0,10).map(el => ({tag:el.tagName,text:el.textContent?.trim().slice(0,60),width:el.clientWidth,scrollWidth:el.scrollWidth}));
  check('G5-no-important-content-clipping-' + innerWidth, importantClips.length === 0, importantClips);
  const overflow = Array.from(document.querySelectorAll('main *')).filter(el => {
    const box = el.getBoundingClientRect();
    return box.width && (box.right > innerWidth + 1 || box.left < -1) && getComputedStyle(el).position !== 'absolute';
  }).slice(0,10).map(el=>({tag:el.tagName,class:el.className}));
  return {phase:'layout',width:innerWidth,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,overflowDiagnostics:overflow};
})();
