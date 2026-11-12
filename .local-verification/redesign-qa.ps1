$OutputEncoding = [Text.UTF8Encoding]::new($false)
$ErrorActionPreference = 'Stop'
$browserArgs = @('--session','header-polish-cdp','--cdp','9333','--json')
function Browser([string[]]$Arguments) {
  $raw = & agent-browser.cmd @browserArgs @Arguments
  if ($LASTEXITCODE -ne 0) { throw ($raw -join "`n") }
  return (($raw -join "`n") | ConvertFrom-Json)
}
function Evaluate([string]$Javascript) {
  $raw = $Javascript | & agent-browser.cmd @browserArgs eval --stdin
  if ($LASTEXITCODE -ne 0) { throw ($raw -join "`n") }
  return (($raw -join "`n") | ConvertFrom-Json).data.result
}
$results = @()
Browser @('open','http://localhost:3003/') | Out-Null
Evaluate '(async()=>{await document.fonts.ready;await new Promise(r=>setTimeout(r,800));return true;})()' | Out-Null
$layout = @'
(() => {
 const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;
 const ids=['gioi-thieu','kenh-truyen-thong','timeline','su-kien','ve','merch','quy-trinh','lien-he'];
 return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,oneH1:document.querySelectorAll('h1').length===1,
 ids:ids.every(id=>!!document.getElementById(id)),
 brokenAnchors:[...document.querySelectorAll('a[href^="#"]')].map(a=>a.hash).filter(h=>!document.getElementById(h.slice(1))),
 navCount:document.querySelectorAll('.event-header__desktop a').length,
 headerOverlap:(()=>{let a=document.querySelector('.event-header__brand').getBoundingClientRect(),b=document.querySelector('.event-header__actions').getBoundingClientRect();return a.right>b.left;})(),
 images:[...document.images].map(e=>({alt:e.alt,loaded:e.complete&&e.naturalWidth>0})),
 fonts:[...document.fonts].filter(f=>f.family.includes('Reply')).map(f=>({family:f.family,status:f.status})),
 overflowing:[...document.querySelectorAll('.reply-site *')].filter(visible).filter(e=>{let r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).slice(0,8).map(e=>e.className),
 };
})()
'@
foreach ($w in @(320,390,768,1280,1440,1920)) {
  Browser @('set','viewport',"$w",'1000') | Out-Null
  $results += Evaluate $layout
}
Browser @('set','viewport','390','844') | Out-Null
Browser @('click','.event-header__toggle') | Out-Null
$results += Evaluate '({test:"menu-open",pass:document.querySelector(".event-header__toggle").getAttribute("aria-expanded")==="true" && !document.querySelector("#mobile-navigation").hidden})'
Browser @('press','Escape') | Out-Null
$results += Evaluate '({test:"escape-focus",pass:document.activeElement===document.querySelector(".event-header__toggle") && document.querySelector("#mobile-navigation").hidden})'
Browser @('fill','#letter-name','Người yêu ký ức') | Out-Null
Browser @('fill','#letter-email','test@example.com') | Out-Null
Browser @('fill','#letter-message','Mong nghe lại những giai điệu thanh xuân.') | Out-Null
Evaluate 'document.querySelector("button[type=submit]").scrollIntoView({block:"center",behavior:"instant"});true' | Out-Null
Browser @('click','button[type="submit"]') | Out-Null
Evaluate '(async()=>{await new Promise(r=>setTimeout(r,250));return true;})()' | Out-Null
$results += Evaluate '({test:"form-preview",pass:document.querySelector("[role=status]").textContent.includes("chưa được gửi") && !!document.querySelector("a[href^=mailto][href*=subject]")})'
$results += Evaluate '(async()=>{document.querySelector(".reply-letter button[type=button]").click();await new Promise(r=>setTimeout(r,200));return {test:"form-edit",pass:document.querySelector("#letter-name").value.length>0&&!document.querySelector("a[href^=mailto][href*=subject]")};})()'
Evaluate 'window.scrollTo({top:0,behavior:"instant"}); true' | Out-Null
$mobile = Browser @('screenshot')
Browser @('set','viewport','1440','1000') | Out-Null
$desktop = Browser @('screenshot')
$full = Browser @('screenshot','--full')
Browser @('open','http://localhost:3003/ui-verification-missing') | Out-Null
$results += Evaluate '({test:"404",pass:!!document.querySelector(".state-page")&&!!document.querySelector("a[href=\"/\"]")})'
Browser @('open','http://localhost:3003/') | Out-Null
$out = @{checks=$results;mobile=$mobile;desktop=$desktop;full=$full}
$out | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 .local-verification/redesign-qa-results.json
$out | ConvertTo-Json -Depth 8
