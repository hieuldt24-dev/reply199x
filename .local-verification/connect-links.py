from pathlib import Path
base=Path('src/app/(routes)/_components')
for name in ['ChannelsSection.tsx','MerchSection.tsx','ContactSection.tsx']:
 p=base/name
 s=p.read_text(encoding='utf-8').replace('import { brief }','import { brief, projectLinks }')
 s=s.replace('href="https://www.tiktok.com/@loihoidap199x"','href={projectLinks.tiktok}')
 s=s.replace('href="https://forms.gle/tW1VU8vpASc53CJa8"','href={projectLinks.merch}')
 if name=='ContactSection.tsx':
  s=s.replace('<span className="">TikTok: @loihoidap199x</span>', '<a href={projectLinks.tiktok} target="_blank" rel="noopener noreferrer">TikTok: @loihoidap199x</a>')
  s=s.replace('<span className="">Email: loihoidap199x@gmail.com</span>', '<a href="mailto:loihoidap199x@gmail.com">Email: loihoidap199x@gmail.com</a>')
  s=s.replace('\n</div>\n\n</div>\n\n</div>\n<ContactForm />', '\n</div>\n{projectLinks.facebook && <a className="reply-text-link" href={projectLinks.facebook} target="_blank" rel="noopener noreferrer">Facebook: REPLY 199X ↗</a>}\n</div>\n\n</div>\n<ContactForm />')
 p.write_text(s,encoding='utf-8')
p=Path('src/components/Footer.tsx')
s=p.read_text(encoding='utf-8')
s='import { projectLinks } from "@/app/(routes)/_data/brief";\n\n'+s
s=s.replace('href="https://www.tiktok.com/@loihoidap199x"','href={projectLinks.tiktok}').replace('href="https://forms.gle/tW1VU8vpASc53CJa8"','href={projectLinks.merch}')
s=s.replace('<a className="text-retro-paper/80 hover:text-retro-gold" href="#gioi-thieu">', '{projectLinks.facebook && <a className="text-retro-paper/80 hover:text-retro-gold" href={projectLinks.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}<a className="text-retro-paper/80 hover:text-retro-gold" href="#gioi-thieu">')
p.write_text(s,encoding='utf-8')
print('Connected social and order links to shared configuration.')
