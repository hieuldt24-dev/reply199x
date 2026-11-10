(() => {
  const checks = [];
  const check = (name, pass, detail = '') => checks.push({name, pass:Boolean(pass), detail});
  check('G5-no-horizontal-overflow-' + innerWidth, document.documentElement.scrollWidth <= innerWidth, {viewport:innerWidth,scroll:document.documentElement.scrollWidth});
  const header = document.querySelector('header');
  const nav = header?.querySelector('nav') || header;
  const destinations = ['gioi-thieu','timeline','su-kien','ve','merch','quy-trinh','kenh-truyen-thong','lien-he'];
  for (const id of destinations) check('G5-nav-destination-' + id, nav?.querySelector(`a[href="#${id}"]`));
  const overflow = Array.from(document.querySelectorAll('main *')).filter(el => {
    const box = el.getBoundingClientRect();
    return box.width && (box.right > innerWidth + 1 || box.left < -1) && getComputedStyle(el).position !== 'absolute';
  }).slice(0,10).map(el=>({tag:el.tagName,class:el.className}));
  return {phase:'layout',width:innerWidth,passed:checks.filter(x=>x.pass).length,failed:checks.filter(x=>!x.pass).length,checks,overflowDiagnostics:overflow};
})();
