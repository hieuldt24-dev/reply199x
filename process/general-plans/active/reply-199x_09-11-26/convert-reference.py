# Conversion helper: parses the immutable source with Python's standard library.
from html.parser import HTMLParser
from pathlib import Path
import json, re, html, copy
class Node:
 def __init__(self,tag='',attrs=None): self.tag=tag; self.attrs=dict(attrs or []); self.children=[]
 def elements(self): return [x for x in self.children if isinstance(x,Node)]
 def text(self): return ''.join(x.text() if isinstance(x,Node) else str(x) for x in self.children)
 def find(self,pred):
  if pred(self): return self
  for x in self.elements():
   r=x.find(pred)
   if r:return r
 def all(self,pred):return ([self] if pred(self) else [])+[n for x in self.elements() for n in x.all(pred)]
class Parser(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.root=Node('root');self.stack=[self.root]
 def handle_starttag(self,t,a):
  n=Node(t,a);self.stack[-1].children.append(n)
  if t not in ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']:self.stack.append(n)
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,0,-1):
   if self.stack[i].tag==t:self.stack=self.stack[:i];break
 def handle_data(self,d):self.stack[-1].children.append(d)
class Raw(str):pass
p=Parser();p.feed(Path('process/general-plans/completed/harness-bootstrap_09-11-26/reply-199x.reference.html').read_text(encoding='utf8'))
root=p.root
q=lambda s:json.dumps(s,ensure_ascii=False)
clean=lambda s:' '.join(s.split())
def replace_node(container,target,replacement):
 for i,x in enumerate(container.children):
  if x is target:container.children[i]=Raw(replacement);return True
  if isinstance(x,Node) and replace_node(x,target,replacement):return True
 return False

glyphs={'album':'◉','tv':'▣','videogame_asset':'✥','call':'☎','explore':'◈','celebration':'⚑','play_circle':'▶','open_in_new':'↗','public':'◎','schedule':'◷','shopping_bag':'♧','menu_book':'▤','local_cafe':'♨','confirmation_number':'▣','notifications_active':'♧','local_post_office':'✉','radio':'▣','mail':'✉','history_edu':'✎','outgoing_mail':'✉','shopping_cart':'♧','location_on':'⌖','loyalty':'◇','stars':'✦','check_circle':'✓','how_to_reg':'✓','theater_comedy':'♫','rate_review':'✎','check':'✓','music_note':'♪','music_video':'♫','event':'▦','groups':'♟','favorite':'♡','redeem':'◇','auto_awesome':'✦','photo_camera':'▣','local_activity':'▣','headphones':'♫','qr_code_2':'▦','inventory_2':'▣','coffee':'♨'}
images=root.all(lambda n:n.tag=='img')
logo,poster=[n.attrs['src'] for n in images]

def render(n,depth=0):
 if isinstance(n,Raw):return str(n)
 if isinstance(n,str):
  if not n.strip():return ''
  # Keep word spacing around inline spans without copying indentation.
  text=re.sub(r'\s+',' ',n)
  return html.escape(text,quote=False).replace('{','&#123;').replace('}','&#125;')
 tag=n.tag
 if tag=='img':
  islogo=n.attrs['src']==logo
  return '<RemoteImage src={assets.'+('logo' if islogo else 'poster')+'} alt='+q(n.attrs['alt'])+' width={'+('511' if islogo else '419')+'} height={'+('511' if islogo else '592')+'} className='+q(n.attrs.get('class',''))+' fallback='+q('REPLY 199X' if islogo else 'REPLY 199X • Đêm nhạc 22.11.2026 • On The Radio')+' />'
 attrs=dict(n.attrs)
 if 'material-symbols-outlined' in attrs.get('class',''):
  attrs['class']=attrs['class'].replace('material-symbols-outlined','retro-icon');attrs['aria-hidden']='true'
  n=copy.copy(n);n.children=[glyphs.get(n.text().strip(),'✦')]
 if tag=='a':
  if attrs.get('href')=='#':attrs['href']='#main-content';attrs['aria-label']='REPLY 199X — Về đầu trang'
  if attrs.get('target')=='_blank':attrs['rel']='noopener noreferrer'
 pairs=[]
 for k,v in attrs.items():
  if k.startswith('on'):continue
  key={'class':'className','for':'htmlFor','tabindex':'tabIndex','readonly':'readOnly','colspan':'colSpan'}.get(k,k)
  if k=='style':
   styles={re.sub(r'-([a-z])',lambda m:m[1].upper(),a.strip()):b.strip() for a,b in [piece.split(':',1) for piece in v.split(';') if ':' in piece]}
   pairs.append('style={'+json.dumps(styles,ensure_ascii=False)+'}');continue
  if k in ['required','disabled','checked']:pairs.append(key);continue
  if k=='rows':pairs.append(key+'={'+v+'}');continue
  pairs.append(key+'='+q(v if v is not None else ''))
 start='<'+tag+(' '+' '.join(pairs) if pairs else '')
 if tag in ['br','input','hr']:return start+' />'
 children=''.join(render(x,depth+1) for x in n.children)
 # Newlines at block boundaries keep the generated modules reviewable.
 if tag in ['div','section','footer','header','nav','form','main']:
  return start+'>\n'+children+'\n</'+tag+'>\n'
 return start+'>'+children+'</'+tag+'>'

sections=root.find(lambda n:n.tag=='main').elements()
byid={n.attrs.get('id'):n for n in sections}
about=byid['gioi-thieu'];process=byid['quy-trinh'];merch=byid['merch']
# Track cards become one reusable rendering of typed content.
track_list=about.elements()[0].elements()[0].elements()[1]
track_cards=track_list.elements()[1:]
tracks=[]
for i,n in enumerate(track_cards):
 tracks.append({'id':f'track-{i+1}','number':f'{i+1:02}','label':clean(n.find(lambda x:x.tag=='span' and 'Track' in x.text()).text()),'title':clean(n.find(lambda x:x.tag=='h3').text()),'description':clean(n.find(lambda x:x.tag=='p').text())})
track_template='''{tracks.map((track) => (
<div key={track.id} className="bg-retro-paper-card p-6 rounded-xl border border-retro-dark/20 hover:border-retro-teal transition-colors relative flex flex-col sm:flex-row gap-5 items-start">
<div className="w-14 h-14 rounded-xl bg-retro-paper border-2 border-retro-dark text-retro-dark font-space font-black text-2xl flex items-center justify-center shrink-0 shadow-sm">{track.number}</div>
<div className="flex-1"><span className="font-space text-xs font-bold uppercase tracking-widest text-retro-forest">{track.label}</span><h3 className="font-epilogue font-bold text-xl text-retro-dark">{track.title}</h3><p className="font-vietnam text-sm text-retro-ink-muted mt-2 leading-relaxed">{track.description}</p></div>
</div>
))}'''
track_list.children=[track_list.elements()[0],Raw(track_template)]
# Upcoming products share identical markup.
product_grid=merch.elements()[0].elements()[2]
products=[]
for i,n in enumerate(product_grid.elements()):
 es=n.elements();top=es[0];visual=top.elements()[0]
 products.append({'id':f'keepsake-{i+1}','symbol':glyphs.get(visual.elements()[0].text().strip(),'✦'),'stamp':clean(visual.elements()[1].text()),'title':clean(top.find(lambda x:x.tag=='h4').text()),'description':clean(top.find(lambda x:x.tag=='p').text()),'material':clean(es[1].elements()[0].text()),'status':clean(es[1].elements()[1].text())})
product_grid.children=[Raw('''{upcomingProducts.map((product) => (
<div key={product.id} className="bg-retro-forest/90 p-5 rounded-xl border-2 border-retro-teal/40 flex flex-col justify-between"><div><div className="h-28 bg-retro-dark rounded-lg flex flex-col items-center justify-center text-retro-gold border border-retro-teal/30"><span aria-hidden="true" className="retro-icon text-4xl">{product.symbol}</span><span className="font-space text-[10px] text-retro-teal-light mt-1 font-bold">{product.stamp}</span></div><h4 className="font-epilogue font-bold text-base text-retro-paper mt-3">{product.title}</h4><p className="font-vietnam text-xs text-retro-paper/70 mt-1">{product.description}</p></div><div className="mt-4 pt-2 border-t border-retro-teal/20 flex items-center justify-between gap-2"><span className="font-space text-[11px] text-retro-gold font-bold">{product.material}</span><span className="font-space text-[11px] text-retro-paper/70">{product.status}</span></div></div>
))}''')]
# Attendance flow remains explicitly provisional.
step_grid=process.elements()[0].elements()[1];steps=[]
for i,n in enumerate(step_grid.elements()):
 title=n.find(lambda x:x.tag=='h3');icon=title.elements()[0]
 steps.append({'id':f'step-{i+1}','number':i+1,'label':f'BƯỚC {i+1:02}','symbol':glyphs.get(icon.text().strip(),'✦'),'title':clean(''.join(x for x in title.children if isinstance(x,str))),'description':clean(n.find(lambda x:x.tag=='p').text()),'note':clean(n.elements()[1].text())})
step_grid.children=[Raw('''{attendanceSteps.map((step) => (
<div key={step.id} className="bg-retro-paper-card p-6 sm:p-7 rounded-xl border-3 border-retro-forest shadow-retro-solid relative flex flex-col justify-between"><div><div className="flex items-center justify-between pb-4 border-b-2 border-dashed border-retro-dark/20"><span className="font-space text-xs font-bold uppercase text-retro-forest">{step.label}</span><span className="w-8 h-8 rounded-full bg-retro-dark text-retro-paper font-space text-xs font-bold flex items-center justify-center">{step.number}</span></div><div className="py-5"><h3 className="font-epilogue font-bold text-xl text-retro-dark flex items-center gap-2"><span aria-hidden="true" className="retro-icon text-retro-red">{step.symbol}</span>{step.title}</h3><p className="font-vietnam text-sm text-retro-ink-muted mt-3 leading-relaxed">{step.description}</p></div></div><div className="bg-retro-paper p-3 rounded-lg border border-retro-dark/20 font-space text-xs text-retro-ink-muted italic">{step.note}</div></div>
))}''')]
# Move the ticket into its own server component, inside the event section.
event=byid['su-kien'];ticket=event.find(lambda n:n.attrs.get('id')=='ve')
replace_node(event,ticket,'<TicketsSection />')
# Replace the original fake-success form column with an accessible local-only leaf.
contact=byid['lien-he'];form=contact.find(lambda n:n.tag=='form')
column=contact.find(lambda n:form in n.all(lambda x:x is form) and 'lg:col-span-6 bg-retro-paper' in n.attrs.get('class',''))
replace_node(contact,column,'<ContactForm />')
first_contact_heading=contact.find(lambda n:n.tag=='h3');first_contact_heading.tag='h2'
# Source typefaces remain runtime fonts, never required during production build.
css='''@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=Epilogue:ital,wght@0,700;0,800;0,900;1,700;1,900&family=Space+Grotesk:wght@500;600;700&display=swap");
@import "tailwindcss";
@theme {
 --color-retro-dark:#2F4B23; --color-retro-forest:#1f3517; --color-retro-teal:#578E76; --color-retro-teal-light:#7ccfaa;
 --color-retro-red:#A01300; --color-retro-gold:#FFB83F; --color-retro-gold-light:#ffcf70;
 --color-retro-paper:#FAF3E0; --color-retro-paper-card:#FFFDF5; --color-retro-paper-dark:#EFE6CE;
 --color-retro-ink:#1E1C10; --color-retro-ink-muted:#514E3E;
 --font-epilogue:"Epilogue","Be Vietnam Pro",sans-serif; --font-space:"Space Grotesk","Be Vietnam Pro",monospace; --font-vietnam:"Be Vietnam Pro",sans-serif;
 --shadow-retro-solid:4px 4px 0 #13240d; --shadow-retro-solid-lg:8px 8px 0 #13240d;
 --shadow-retro-solid-red:4px 4px 0 #600b00; --shadow-retro-solid-gold:4px 4px 0 #b87a14; --shadow-retro-border:0 0 0 2px #1E1C10;
}
@layer base {
 * { box-sizing:border-box; }
 html { scroll-behavior:smooth; scroll-padding-top:110px; }
 body { margin:0; background:#FAF3E0; color:#1E1C10; font-family:var(--font-vietnam); line-height:1.6; }
 :is(section,div)[id] { scroll-margin-top:110px; }
 a,button,input,textarea { -webkit-tap-highlight-color:transparent; }
 a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible { outline:3px solid #A01300; outline-offset:5px; }
 header a:focus-visible,header button:focus-visible,footer a:focus-visible { outline-color:#FFB83F; }
 button,a { touch-action:manipulation; }
 button { cursor:pointer; }
 input,textarea { font-size:16px; }
 ::selection { background:#FFB83F; color:#1f3517; }
}
'''+root.find(lambda n:n.tag=='style').text()+'''
.retro-icon { display:inline-flex; align-items:center; justify-content:center; font-family:Georgia,"Segoe UI Symbol",serif; font-style:normal; font-weight:normal; line-height:1; flex-shrink:0; }
.skip-link { position:fixed; top:-100px; left:16px; padding:12px 20px; background:#FAF3E0; color:#1f3517; z-index:100; border:2px solid #A01300; font-weight:700; }
.skip-link:focus { top:12px; }
.site-nav a,.mobile-menu-button { min-height:44px; display:inline-flex; align-items:center; }
.mobile-menu a { display:block; padding:12px 16px; border-radius:6px; }
.mobile-menu a:hover { background:#2F4B23; color:#FFB83F; }
.image-fallback { display:flex; align-items:center; justify-content:center; background:#1f3517; color:#FFB83F; padding:12px; border:1px dashed #FFB83F; text-align:center; font-family:var(--font-space); font-weight:700; }
.container { width:min(1120px,calc(100% - 48px)); margin-inline:auto; }
.state-page { min-height:70vh; padding-block:90px; }
.state-page h1 { font-family:var(--font-epilogue); font-size:clamp(36px,6vw,64px); line-height:1.2; margin-block:24px; }
.state-page>p { margin-bottom:24px; }
.eyebrow { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:1.6px; }
.button { display:inline-flex; align-items:center; justify-content:center; border:2px solid #1f3517; border-radius:8px; padding:13px 21px; background:#2F4B23; color:#FAF3E0; font-weight:700; cursor:pointer; }
.button:hover { background:#1f3517; }
.button:disabled { opacity:.5; cursor:not-allowed; }
.card { padding:28px; border:1px solid #2F4B23; background:#FFFDF5; border-radius:12px; }
@media(max-width:639px) {
 section>div,footer>div { min-width:0; }
 #kenh-truyen-thong .items-start.justify-between,#kenh-truyen-thong .pt-4.border-t-2,#merch .items-start.justify-between,#merch .mt-8.pt-4,#ve .items-center.justify-between { flex-wrap:wrap; }
 #kenh-truyen-thong .pt-4.border-t-2>span { overflow-wrap:anywhere; }
 #merch .gap-6.py-4 { gap:12px; flex-wrap:wrap; justify-content:center; }
 #ve .grid-cols-2 { gap:8px; }
 #ve .grid-cols-2 strong { font-size:14px; }
 #ve .flex-1 { min-width:0; }
 footer .flex.items-center.gap-3 { flex-wrap:wrap; justify-content:center; }
 footer .font-epilogue { overflow-wrap:anywhere; }
 #lien-he .font-space { overflow-wrap:anywhere; }
}
@media(prefers-reduced-motion:reduce) {
 html { scroll-behavior:auto; }
 *,*::before,*::after { animation:none!important; transition:none!important; scroll-behavior:auto!important; }
}
'''
# Keep high-contrast text on paper, while retaining accent colors on dark surfaces.
for section_id in ['gioi-thieu','kenh-truyen-thong','quy-trinh','lien-he']:
 for n in byid[section_id].all(lambda n:True):
  c=n.attrs.get('class','')
  if 'text-retro-teal' in c and 'bg-retro-teal' not in c:n.attrs['class']=c.replace('text-retro-teal','text-retro-forest')

out=Path('src/app/(routes)');(out/'_components').mkdir(exist_ok=True);(out/'_data').mkdir(exist_ok=True);(out/'_types').mkdir(exist_ok=True)
types='''export type MemoryTrack = Readonly<{ id:string; number:string; label:string; title:string; description:string }>;
export type UpcomingProduct = Readonly<{ id:string; symbol:string; stamp:string; title:string; description:string; material:string; status:string }>;
export type AttendanceStep = Readonly<{ id:string; number:number; label:string; symbol:string; title:string; description:string; note:string }>;
export type EventContent = Readonly<{ id:string; date:string; venue:string; time:string }>;
export type MerchCombo = Readonly<{ id:string; title:string; price:string; originalPrice:string }>;
'''
(out/'_types/home.ts').write_text(types,encoding='utf8')
data='import type { MemoryTrack, UpcomingProduct, AttendanceStep, EventContent, MerchCombo } from "../_types/home";\n\n'
for name,items,typ in [('tracks',tracks,'MemoryTrack'),('upcomingProducts',products,'UpcomingProduct'),('attendanceSteps',steps,'AttendanceStep')]:data+='export const '+name+' = '+json.dumps(items,ensure_ascii=False,indent=2)+' as const satisfies readonly '+typ+'[];\n\n'
data+='export const assets = '+json.dumps({'logo':logo,'poster':poster},ensure_ascii=False,indent=2)+' as const;\n'
data+='''export const events = [
 { id:"pop-up", date:"20–21.11.2026", venue:"Cơm Bưng Nước Rót", time:"Vào cửa tự do" },
 { id:"concert", date:"22.11.2026", venue:"On The Radio, 76 Thái Phiên, Hải Châu, Đà Nẵng", time:"15:00 – 19:00, Chủ Nhật ngày 22/11/2026" }
] as const satisfies readonly EventContent[];
export const merchCombos = [
 { id:"tuoi-xi-tin", title:'Combo "Tuổi Xì Tin"', price:"99.000", originalPrice:"Giá gốc 130k" },
 { id:"tuoi-xi-lay", title:'Combo "Tuổi Xì Lây"', price:"169.000", originalPrice:"Giá gốc 220k" }
] as const satisfies readonly MerchCombo[];
'''
(out/'_data/home.ts').write_text(data,encoding='utf8')
config=[('HeroSection',sections[0],[]),('AboutSection',about,['tracks']),('ChannelsSection',byid['kenh-truyen-thong'],[]),('TimelineSection',byid['timeline'],[]),('EventsSection',event,['assets','events']),('TicketsSection',ticket,[]),('MerchSection',merch,['upcomingProducts','merchCombos']),('ProcessSection',process,['attendanceSteps']),('ContactSection',contact,[])]
for name,n,imports in config:
 text=render(n)
 if name=='EventsSection':text=text.replace('15:00 – 19:00, Chủ Nhật ngày 22/11/2026','{events[1].time}').replace('On The Radio, 76 Thái Phiên, Hải Châu, Đà Nẵng','{events[1].venue}')
 if name=='MerchSection':
  for i,title in enumerate(['Combo "Tuổi Xì Tin"','Combo "Tuổi Xì Lây"']):text=text.replace(title,'{merchCombos['+str(i)+'].title}')
  for i,price in enumerate(['99.000','169.000']):text=text.replace(price,'{merchCombos['+str(i)+'].price}')
  for i,price in enumerate(['Giá gốc 130k','Giá gốc 220k']):text=text.replace(price,'{merchCombos['+str(i)+'].originalPrice}')
 prefix=''
 if imports:prefix+='import { '+', '.join(imports)+' } from "../_data/home";\n'
 if name=='EventsSection':prefix+='import { TicketsSection } from "./TicketsSection";\nimport { RemoteImage } from "./RemoteImage";\n'
 if name=='ContactSection':prefix+='import { ContactForm } from "./ContactForm";\n'
 (out/('_components/'+name+'.tsx')).write_text(prefix+'\nexport function '+name+'() {\n return (\n'+text+'\n );\n}\n',encoding='utf8')
footer=render(root.find(lambda n:n.tag=='footer'))
Path('src/components/Footer.tsx').write_text('export function Footer() {\n return (\n'+footer+'\n );\n}\n',encoding='utf8')
Path('src/styles/globals.css').write_text(css,encoding='utf8')
page=''.join('import { '+name+' } from "./_components/'+name+'";\n' for name,_,_ in config if name!='TicketsSection')+'\nexport default function HomePage() {\n return (\n<main id="main-content" tabIndex={-1} className="pt-[90px]">\n'+''.join('<'+name+' />\n' for name,_,_ in config if name!='TicketsSection')+'</main>\n );\n}\n'
(out/'page.tsx').write_text(page,encoding='utf8')
print('Generated source-preserving server sections, typed content, theme and footer.')
