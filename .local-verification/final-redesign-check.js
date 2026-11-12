(async () => {
  await document.fonts.ready;
  const results = [];
  for (const id of ['gioi-thieu', 'kenh-truyen-thong', 'timeline', 'su-kien', 've', 'merch', 'quy-trinh', 'lien-he']) {
    const target = document.getElementById(id);
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    await new Promise(resolve => setTimeout(resolve, 80));
    results.push({ id, clearsHeader: target.getBoundingClientRect().top >= document.querySelector('header').getBoundingClientRect().bottom, activeCorrect: document.querySelector('.event-header__desktop [aria-current]')?.hash === '#' + id });
  }
  const facebook = [...document.querySelectorAll('a[href="https://www.facebook.com/loihoidap199x"]')];
  const combo = document.querySelector('.reply-combo--full a');
  results.push({ test: 'facebook-links', pass: facebook.length === 3 && facebook.every(a => a.target === '_blank' && a.rel.includes('noopener')) });
  results.push({ test: 'combo-cta-contrast', pass: getComputedStyle(combo).color === getComputedStyle(combo.querySelector('span')).color && getComputedStyle(combo).color !== getComputedStyle(combo).backgroundColor });
  results.push({ test: 'ticket-not-for-sale', pass: [...document.querySelectorAll('#ve button')].some(b => b.disabled) });
  results.push({ test: 'official-copy', pass: ['Theo dòng ký ức, ta trở lại những điều thân thuộc.', '119.000', '169.000', 'Cơm Bưng Nước Rót', 'On The Radio'].every(s => document.body.innerText.includes(s)) });
  const image = document.querySelector('.reply-poster img');
  image.dispatchEvent(new Event('error'));
  await new Promise(resolve => setTimeout(resolve, 100));
  results.push({ test: 'poster-fallback', pass: !!document.querySelector('.reply-poster [data-image-fallback]') });
  return results;
})()
