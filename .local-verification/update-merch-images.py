from pathlib import Path
import shutil,re
root=Path.cwd()
downloads=Path.home()/'Downloads'
images=root/'public/images'
for src,dest in [('Ảnh 1.png','reply-199x-merch-collection.png'),('Ảnh 2.png','reply-199x-merch-xi-tin.png'),('Ảnh 3.png','reply-199x-merch-xi-lay.png')]:
 shutil.copyfile(downloads/src,images/dest)
p=root/'src/app/(routes)/_components/MerchSection.tsx'
s=p.read_text(encoding='utf-8')
s='import Image from "next/image";\n'+s
s=s.replace('import { merchCombos }','import { assets, merchCombos }')
pattern=r'<div className="my-6 bg-retro-dark.*?(?=<div className="bg-retro-red/80)'
matches=list(re.finditer(pattern,s,re.S))
assert len(matches)==2, len(matches)
for i,match in reversed(list(enumerate(matches))):
 name='Tin' if i==0 else 'Lây'
 asset='merchXiTin' if i==0 else 'merchXiLay'
 alt='Combo Tuổi Xì Tin: túi tote và sổ tay REPLY 199X, giá 99.000đ' if i==0 else 'Combo Tuổi Xì Lây: túi tote, sổ tay, ly và phiếu nước, giá 169.000đ'
 html=f'<div className="reply-combo__image">\n<Image src={{assets.{asset}}} alt="{alt}" width={{1500}} height={{1500}} sizes="(max-width: 639px) calc(100vw - 88px), (max-width: 1099px) 45vw, 400px" />\n</div>\n'
 s=s[:match.start()]+html+s[match.end():]
s=s.replace('<div id="bo-suu-tap"', '<div className="reply-merch-catalog">\n<figure className="reply-merch-poster">\n<Image src={assets.merchCollection} alt="Bộ sưu tập merchandise REPLY 199X: túi tote, sổ tay và ly kỷ niệm" width={1500} height={3000} sizes="(min-width: 1100px) 240px, 260px" />\n</figure>\n<div id="bo-suu-tap"')
end='\n</div>\n\n</section>'
assert end in s
s=s.replace(end,'\n</div>\n</div>\n\n</section>')
p.write_text(s,encoding='utf-8')
p=root/'src/app/(routes)/_data/home.ts'
s=p.read_text(encoding='utf-8').replace('"poster": "/images/reply-199x-event-poster.png"','"poster": "/images/reply-199x-event-poster.png",\n  merchCollection: "/images/reply-199x-merch-collection.png",\n  merchXiTin: "/images/reply-199x-merch-xi-tin.png",\n  merchXiLay: "/images/reply-199x-merch-xi-lay.png"')
p.write_text(s,encoding='utf-8')
print('Copied three originals and connected matching combo artwork.')
