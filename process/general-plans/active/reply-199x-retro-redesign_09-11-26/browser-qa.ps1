param([string]$BaseUrl = 'http://localhost:3001')
$ErrorActionPreference = 'Stop'
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = $OutputEncoding
$qaDir = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path (Get-Location) 'process/general-plans/active/reply-199x_09-11-26' }
$qaBrowserArgs = @('--session','reply-retro-redesign','--cdp','9333','--json')
$qaResults = @()
function Invoke-QaBrowser([string[]]$BrowserCommand) {
  $qaRaw = & agent-browser.cmd @qaBrowserArgs @BrowserCommand
  if ($LASTEXITCODE -ne 0) { throw ("browser command failed: " + ($BrowserCommand -join ' ') + "`n" + ($qaRaw -join "`n")) }
  $qaReply = ($qaRaw -join "`n") | ConvertFrom-Json
  if ($qaReply.success -eq $false) { throw ($qaRaw -join "`n") }
  return $qaReply
}
function Invoke-QaEval([string]$Javascript) {
  $qaRaw = $Javascript | & agent-browser.cmd @qaBrowserArgs eval --stdin
  if ($LASTEXITCODE -ne 0) { throw ($qaRaw -join "`n") }
  $qaReply = ($qaRaw -join "`n") | ConvertFrom-Json
  if ($qaReply.success -eq $false) { throw ($qaRaw -join "`n") }
  return $qaReply.data.result
}
Invoke-QaBrowser @('open',$BaseUrl) | Out-Null
Invoke-QaBrowser @('set','viewport','1440','1000') | Out-Null
$qaReference = Get-Content (Join-Path $qaDir '../../completed/harness-bootstrap_09-11-26/reply-199x.reference.html') -Raw -Encoding utf8
$qaEncoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($qaReference))
$qaPrefix = "window.__referenceHtml = new TextDecoder('utf-8').decode(Uint8Array.from(atob('$qaEncoded'), c => c.charCodeAt(0)));"
$qaResults += Invoke-QaEval ($qaPrefix + (Get-Content (Join-Path $qaDir 'browser-content-assertions.js') -Raw -Encoding utf8))
foreach ($qaWidth in @(360,390,768,1280,1440)) {
  $qaHeight = if ($qaWidth -le 390) { 844 } else { 1000 }
  Invoke-QaBrowser @('set','viewport',"$qaWidth","$qaHeight") | Out-Null
  $qaResults += Invoke-QaEval (Get-Content (Join-Path $qaDir 'browser-layout-assertions.js') -Raw -Encoding utf8)
  Invoke-QaEval 'window.scrollTo({top:0,behavior:"instant"}); true;' | Out-Null
  Invoke-QaBrowser @('screenshot',(Join-Path $qaDir "app-$qaWidth.png")) | Out-Null
}
Invoke-QaBrowser @('screenshot','--full',(Join-Path $qaDir 'app-full.png')) | Out-Null

# Exercise the disclosure at mobile and desktop widths, including Escape focus return and anchor offset.
Invoke-QaBrowser @('set','viewport','390','844') | Out-Null
Invoke-QaBrowser @('open',"$BaseUrl/") | Out-Null
Invoke-QaBrowser @('click','button.mobile-menu-button') | Out-Null
$qaResults += Invoke-QaEval "(() => { const b=document.querySelector('.mobile-menu-button'); const menu=document.querySelector('#mobile-navigation'); const links=Array.from(menu?.querySelectorAll('a')||[]); return {phase:'mobile-menu-open',checks:[{name:'G4-menu-expanded',pass:b?.getAttribute('aria-expanded')==='true'&&!menu?.hidden},{name:'G4-all-mobile-links',pass:links.length===8},{name:'G4-all-menu-links-visible',pass:links.every(x=>x.getBoundingClientRect().width>0)}]}; })()"
$qaResults += Invoke-QaEval "document.querySelector('#mobile-navigation a')?.click(); true;"
$qaResults += Invoke-QaEval "(() => { const target=document.querySelector('#gioi-thieu'); return {phase:'mobile-anchor',checks:[{name:'G5-menu-closes-on-selection',pass:document.querySelector('.mobile-menu-button')?.getAttribute('aria-expanded')==='false'},{name:'G5-anchor-clears-header',pass:target?.getBoundingClientRect().top>=document.querySelector('header')?.getBoundingClientRect().bottom}]}; })()"
$qaResults += Invoke-QaEval "(() => { const ids=['gioi-thieu','kenh-truyen-thong','timeline','su-kien','ve','merch','quy-trinh','lien-he']; const headerBottom=document.querySelector('header')?.getBoundingClientRect().bottom||0; const checks=ids.map(id=>{const el=document.getElementById(id);el?.scrollIntoView({block:'start',behavior:'instant'});const top=el?.getBoundingClientRect().top||-1;return {name:'G4-anchor-offset-'+id,pass:top>=headerBottom-1&&top<=118,detail:{top,headerBottom}}});return {phase:'all-anchor-offsets',checks}; })()"
Invoke-QaBrowser @('click','button.mobile-menu-button') | Out-Null
Invoke-QaBrowser @('press','Escape') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'escape',checks:[{name:'G5-menu-closes-on-escape',pass:document.querySelector('.mobile-menu-button')?.getAttribute('aria-expanded')==='false'},{name:'G6-escape-returns-focus',pass:document.activeElement===document.querySelector('.mobile-menu-button')}] }))()"

Invoke-QaBrowser @('set','viewport','1440','1000') | Out-Null
Invoke-QaBrowser @('open',"$BaseUrl/") | Out-Null
Invoke-QaBrowser @('click','button.mobile-menu-button') | Out-Null
$qaResults += Invoke-QaEval "(() => { const menu=document.querySelector('#mobile-navigation'); const links=Array.from(menu?.querySelectorAll('a')||[]); return {phase:'desktop-disclosure',checks:[{name:'G4-four-direct-links',pass:document.querySelectorAll('.site-nav a').length===4},{name:'G4-eight-desktop-menu-links',pass:links.length===8&&links.every(x=>x.getBoundingClientRect().width>0)},{name:'G4-desktop-menu-expanded',pass:document.querySelector('.mobile-menu-button')?.getAttribute('aria-expanded')==='true'}]}; })()"

# Native validation blocks empty and malformed submissions; valid content produces an unsent local preview.
Invoke-QaBrowser @('set','viewport','1440','1000') | Out-Null
Invoke-QaBrowser @('open',"$BaseUrl/#lien-he") | Out-Null
Invoke-QaBrowser @('scrollintoview','button[type=submit]') | Out-Null
Invoke-QaBrowser @('click','button[type=submit]') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'empty-form',checks:[{name:'G7-required-fields-block-empty-submit',pass:!document.querySelector('#letter-name').validity.valid},{name:'G7-empty-form-does-not-prepare-preview',pass:!document.querySelector('#lien-he h4')}]}))()"
Invoke-QaBrowser @('fill','#letter-name','Minh QA') | Out-Null
Invoke-QaBrowser @('fill','#letter-email','not-an-email') | Out-Null
Invoke-QaBrowser @('fill','#letter-message','A memory from 199X') | Out-Null
Invoke-QaBrowser @('scrollintoview','button[type=submit]') | Out-Null
Invoke-QaBrowser @('click','button[type=submit]') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'invalid-email',checks:[{name:'G7-malformed-email-blocked',pass:!document.querySelector('#letter-email').validity.valid},{name:'G7-invalid-form-does-not-prepare-preview',pass:!document.querySelector('#lien-he h4')}]}))()"
Invoke-QaBrowser @('fill','#letter-email','minh@example.com') | Out-Null
Invoke-QaBrowser @('scrollintoview','button[type=submit]') | Out-Null
Invoke-QaBrowser @('click','button[type=submit]') | Out-Null
$qaResults += Invoke-QaEval "(() => { const f=document.querySelector('#lien-he form'); const mail=Array.from(document.links).find(a=>a.protocol==='mailto:'&&a.href.includes('?subject=')); const status=document.querySelector('[role=status]')?.innerText||''; return {phase:'valid-form',checks:[{name:'G7-valid-form-prepared',pass:Boolean(document.querySelector('#lien-he h4'))},{name:'G7-form-status-is-truthful',pass:/ch\u01b0a \u0111\u01b0\u1ee3c g\u1eedi ho\u1eb7c l\u01b0u/i.test(status),detail:status},{name:'G7-values-retained',pass:['Minh QA','minh@example.com','A memory from 199X'].every((v,i)=>f.querySelectorAll('input,textarea')[i].value===v)},{name:'G7-encoded-email-action',pass:mail?.href.includes('mailto:loihoidap199x@gmail.com?subject=')&&mail.href.includes('%40example.com')} ]}; })()"
Invoke-QaBrowser @('scrollintoview','#lien-he button[type=button]') | Out-Null
Invoke-QaBrowser @('click','#lien-he button[type=button]') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'edit-form',checks:[{name:'G7-edit-keeps-values',pass:['Minh QA','minh@example.com','A memory from 199X'].every((v,i)=>document.querySelectorAll('#lien-he input,#lien-he textarea')[i].value===v)},{name:'G7-edit-clears-preview',pass:!document.querySelector('#lien-he h4')},{name:'G6-edit-returns-focus',pass:document.activeElement?.id==='letter-name'}]}))()"

# Trigger synthetic image errors on a fresh page view, then emulate reduced motion.
Invoke-QaBrowser @('set','viewport','1440','1000') | Out-Null
Invoke-QaBrowser @('open',"$BaseUrl/") | Out-Null
Invoke-QaBrowser @('wait','200') | Out-Null
Invoke-QaEval 'window.scrollTo({top:0,behavior:"instant"}); true;' | Out-Null
$qaResults += Invoke-QaEval "Array.from(document.images).forEach(image=>image.dispatchEvent(new Event('error'))); true;"
Invoke-QaBrowser @('wait','200') | Out-Null
$qaResults += Invoke-QaEval "(() => { const fallbacks=Array.from(document.querySelectorAll('[data-image-fallback]')); const logo=fallbacks.find(x=>/logo/i.test(x.getAttribute('aria-label')||'')); const poster=fallbacks.find(x=>/poster/i.test(x.getAttribute('aria-label')||'')); const ratio=x=>{const r=x?.getBoundingClientRect();return r?.width&&r?.height?r.width/r.height:0}; return {phase:'synthetic-image-errors',checks:[{name:'G8-both-image-fallbacks',pass:fallbacks.length===2},{name:'G8-logo-fallback-readable',pass:logo?.getAttribute('role')==='img'&&/REPLY 199X/.test(logo.innerText)},{name:'G8-poster-details-remain',pass:/22.11.2026.*On The Radio/.test(poster?.innerText||'')},{name:'G8-logo-fallback-ratio',pass:Math.abs(ratio(logo)-1)<0.03,detail:ratio(logo)},{name:'G8-poster-fallback-ratio',pass:Math.abs(ratio(poster)-(419/592))<0.03,detail:ratio(poster)}]}; })()"
Invoke-QaBrowser @('screenshot',(Join-Path $qaDir 'app-image-fallback.png')) | Out-Null
Invoke-QaBrowser @('screenshot','--full',(Join-Path $qaDir 'app-image-fallback-full.png')) | Out-Null
Invoke-QaBrowser @('set','media','light','reduced-motion') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'reduced-motion',checks:[{name:'G8-reduced-motion-emulated',pass:matchMedia('(prefers-reduced-motion: reduce)').matches},{name:'G8-smooth-scroll-disabled',pass:getComputedStyle(document.documentElement).scrollBehavior==='auto'},{name:'G8-pulses-disabled',pass:document.querySelectorAll('.animate-pulse,.animate-ping').length===0},{name:'G8-art-motion-disabled',pass:getComputedStyle(document.querySelector('.cassette-art')).animationDuration==='0s'},{name:'G8-no-autoplay-media',pass:document.querySelectorAll('audio[autoplay],video[autoplay]').length===0},{name:'G8-page-content-retained',pass:document.querySelectorAll('main section').length===8&&Boolean(document.querySelector('.retro-primary-cta'))}]}))()"
Invoke-QaBrowser @('screenshot',(Join-Path $qaDir 'app-reduced-motion.png')) | Out-Null
Invoke-QaBrowser @('set','media','light') | Out-Null

# Verify keyboard entry reaches the visible skip link on a fresh page load.
Invoke-QaBrowser @('set','viewport','390','844') | Out-Null
Invoke-QaBrowser @('open',"$BaseUrl/") | Out-Null
Invoke-QaBrowser @('press','Tab') | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'skip-link',checks:[{name:'G6-first-tab-reaches-skip-link',pass:document.activeElement?.classList.contains('skip-link')},{name:'G6-skip-link-has-main-target',pass:document.querySelector('.skip-link')?.getAttribute('href')==='#main-content'&&Boolean(document.querySelector('main#main-content'))}]}))()"

Invoke-QaBrowser @('open',"$BaseUrl/route-not-found-probe") | Out-Null
$qaResults += Invoke-QaEval "(() => ({phase:'not-found-smoke',checks:[{name:'G7-not-found-page-rendered',pass:!document.querySelector('main.retro-home')&&Boolean(document.querySelector('main'))},{name:'G7-state-page-style-isolated',pass:!document.querySelector('main.retro-home')&&getComputedStyle(document.querySelector('main')||document.body).backgroundColor!=='rgb(250, 243, 224)'}]}))()"

$qaResults | ConvertTo-Json -Depth 12 | Set-Content (Join-Path $qaDir 'browser-qa-results.json') -Encoding utf8
$qaFailures = @($qaResults | ForEach-Object { $_.checks } | Where-Object { $_.pass -eq $false })
[pscustomobject]@{passed=@($qaResults | ForEach-Object { $_.checks } | Where-Object pass).Count; failed=$qaFailures.Count; failures=$qaFailures} | ConvertTo-Json -Depth 10
if ($qaFailures.Count) { exit 1 }
