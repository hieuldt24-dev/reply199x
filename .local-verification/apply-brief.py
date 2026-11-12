from pathlib import Path
import json, re

root = Path.cwd()
lines = Path(r'C:/Users/Hieu/.codex/attachments/ac320699-2759-42ff-995f-f127002e2f47/Pasted text.txt').read_text(encoding='utf-8').splitlines()
def line(prefix):
    return next(x.strip() for x in lines if x.startswith(prefix))
copy = {
    'hero': line('Có những điều tưởng'),
    'about': [line('REPLY 199X là dự án'), line('Không đơn thuần'), line('Thông qua các hoạt động')],
    'purposes': [line('Tái hiện những hình ảnh'), line('Kết hợp hoạt động'), line('Tạo không gian gặp gỡ')],
    'channels': line('Dòng chảy hoài niệm của'),
    'facebook': line('Nơi cập nhật'),
    'tiktok': line('Nơi những ký ức'),
    'timeline': line('Mỗi hoạt động'),
    'popup': line('Một điểm hẹn'),
    'concert': [line('Lời Hồi Đáp'), line('Thông qua những giai điệu')],
    'tickets': [line('Có những giai điệu'), line('Một cuộc hẹn')],
    'merch': [line('Có những ký ức không'), line('Mỗi sản phẩm')],
    'contact': line('Hành trình hoài niệm chưa'),
}
base = root / 'src/app/(routes)'
(base / '_data/brief.ts').write_text('export const brief = ' + json.dumps(copy, ensure_ascii=False, indent=2) + ' as const;\n\nexport const projectLinks: Readonly<{ facebook: string | null; tickets: string | null; tiktok: string; merch: string }> = {\n  facebook: null,\n  tickets: null,\n  tiktok: "https://www.tiktok.com/@loihoidap199x",\n  merch: "https://forms.gle/tW1VU8vpASc53CJa8",\n};\n\nexport const ticketDetails = { price: "Sắp công bố" } as const;\n', encoding='utf-8')
def update(name, changes, intro=True):
    p = base / '_components' / name
    s = p.read_text(encoding='utf-8')
    if intro: s = 'import { brief } from "../_data/brief";\n' + s
    for a,b in changes:
        assert a in s, (name,a)
        s = s.replace(a,b)
    p.write_text(s, encoding='utf-8')

update('HeroSection.tsx', [
 ('Dự Án Nghệ Thuật &amp; Âm Nhạc Hoài Niệm', 'REPLY 199X · Bắt đầu dòng chảy'),
 ('<div className="reply-hero__quote">', '<div className="reply-hero__subtitle">FLOW IN NOSTALGIA</div>\n          <div className="reply-hero__quote">'),
 ('Không gian âm nhạc &amp; triển lãm thực cảnh hồi tưởng lại năm tháng rực rỡ thập niên 90s – đầu 2000s, nơi đài cát-sét phát giai điệu thanh xuân và điện thoại bàn lưu giữ bao hẹn ước.', '{brief.hero}'),
 ('<a className="reply-action reply-action--gold" href="#su-kien">Xem sự kiện 22/11 <span aria-hidden="true">↗</span></a>', '<a className="reply-action reply-action--gold" href="#ve">Đặt vé ngay <span aria-hidden="true">↗</span></a>\n            <a className="reply-text-link" href="#merch">Khám phá merch <span aria-hidden="true">↗</span></a>'),
 ('Khám phá hành trình <span', 'Khám phá hành trình của dòng chảy hoài niệm <span'),
 ])
update('AboutSection.tsx', [
 ('Tập San Ký Ức • Giới Thiệu', 'Nơi ký ức bắt đầu'),
 ('VỀ DỰ ÁN<br /><span className="text-retro-red">REPLY 199X</span>', 'REPLY 199X<br /><span className="text-retro-red">The flow of nostalgia</span>'),
 ('Lấy cảm hứng từ bức tranh văn hóa đại chúng Việt Nam cuối thập niên 90 và đầu những năm 2000, <strong className="text-retro-red font-bold">REPLY 199X</strong> mở ra hành trình cảm xúc chân thành, nơi ký ức tuổi trẻ mộc mạc giao hòa cùng nhịp sống người trẻ hôm nay.', '{brief.about[0]}'),
 ('</p><div className="bg-retro-paper-card', '</p><p className="reply-body-copy">{brief.about[1]}</p><p className="reply-body-copy">{brief.about[2]}</p><div className="bg-retro-paper-card'),
 ('<div className="reply-tracks ', '<div className="reply-tracks '),
 ('{tracks.map((track) => (', '<div className="reply-eyebrow">Mục đích &amp; ý nghĩa</div>\n{tracks.map((track, index) => ('),
 ('{track.description}', '{brief.purposes[index]}'),
 ])
update('ChannelsSection.tsx', [
 ('LÀN SÓNG VÔ TUYẾN • KÊNH TRUYỀN THÔNG', 'BẮT SÓNG KÝ ỨC'),
 ('KÊNH TRUYỀN THÔNG CHÍNH THỨC', 'Theo dòng ký ức, kết nối mọi khoảnh khắc'),
 ('Không gian phát sóng trực tuyến kết nối khán giả cùng những thước phim màu ký ức và âm hưởng xưa cũ.', '{brief.channels}'),
 ('Thước phim hoài niệm, phỏng vấn người đi qua thập niên 90s và giai điệu xưa cũ.', '{brief.tiktok}'),
 ('Ghé thăm TikTok', 'Bắt sóng ngay'),
 ('Kênh thông tin chính thức kết nối cộng đồng yêu hoài niệm đang trong giai đoạn chuẩn bị phát sóng.', '{brief.facebook}'),
 ('<span className="retro-icon text-sm" aria-hidden="true">◷</span><span className="">Chưa phát sóng</span>', '<button type="button" className="reply-action reply-action--unavailable" disabled>Theo dõi fanpage</button>'),
 ])
update('TimelineSection.tsx', [
 ('LỊCH TRÌNH HOẠT ĐỘNG', 'Cùng dò sóng để phát lại những ký ức hồi đó nhé!'),
 ('DÒNG CHẢY SỰ KIỆN 2026', 'Dòng chảy tiếp nối, trải nghiệm đong đầy'),
 ('Hai chặng dừng chân tái hiện trọn vẹn văn hóa hoài niệm thập niên 90s tại thành phố Đà Nẵng.', '{brief.timeline}'),
 ('Mở cửa tự do đón công chúng ghé thăm, chụp ảnh và hòa mình vào bối cảnh góc phố cổ thập niên 90s sống động:', '{brief.popup}'),
 ('Đêm nhạc giao hưởng mộc acoustic tái hiện những giai điệu V-Pop bất hủ từng vang bóng qua làn sóng Radio FM, đan xen hoạt cảnh kịch thanh xuân và khách mời đặc biệt.', '{brief.concert[0]}'),
 ('<div className="bg-retro-dark/90 p-4', '<p className="reply-body-copy">{brief.concert[1]}</p>\n<div className="bg-retro-dark/90 p-4'),
 ('<span className="">KHÔNG GIAN TRIỂN LÃM</span>', '<a className="reply-text-link" href="#pop-up-details">Khám phá pop-up ↗</a>'),
 ('<div className="reply-stop ', '<div id="pop-up-details" className="reply-stop '),
 ('Xem cuống vé &amp; Chi tiết', 'Đặt vé ngay'),
 ('<span className="font-space text-xs text-retro-gold font-bold">KHUNG GIỜ: 15:00 - 19:00</span>', '<a className="reply-text-link" href="#su-kien">Tìm hiểu sự kiện ↗</a><span className="font-space text-xs text-retro-gold font-bold">KHUNG GIỜ: 15:00 - 19:00</span>'),
 ])
update('EventsSection.tsx', [
 ('TÂM ĐIỂM CHƯƠNG TRÌNH • LIVE CONCERT', 'GIỮ CHỖ CHO CUỘC HẸN THANH XUÂN'),
 ('ĐÊM NHẠC TRỌNG TÂM 22/11', 'Làn sóng xưa đang chờ bạn!'),
 ('&quot;Không gian âm nhạc hoài niệm – REPLY 199X&quot;', '{brief.tickets[0]}'),
 ('</p>\n</div>', '</p><p className="reply-body-copy">{brief.tickets[1]}</p>\n</div>'),
 ])
update('MerchSection.tsx', [
 ('VẬT PHẨM KỶ NIỆM • RETRO MERCHANDISE', 'GÓI GHÉM MỘT THỜI'),
 ('KỶ VẬT THỜI GIAN – MERCH 199X', 'Mang theo những điều thân thuộc'),
 ('Những vật phẩm thủ công đượm màu thời gian dành cho khán giả yêu mến hành trình Reply 199X.', '{brief.merch[0]}'),
 ('<div className="reply-combos ', '<p className="reply-merch-intro">{brief.merch[1]}</p><a className="reply-text-link" href="#bo-suu-tap">Khám phá bộ sưu tập ↗</a>\n<div id="bo-suu-tap" className="reply-combos '),
 ('{merchCombos[1].originalPrice}', ''),
 ('TEM SẢN PHẨM: FULL SET KỶ VẬT HOÀI NIỆM', 'MUA 1 TẶNG 1 · PHIẾU NƯỚC TRỊ GIÁ 169.000đ'),
 ('Trọn bộ ký ức: Túi tote + Sổ tay lưu bút + Ly kỷ niệm + Phiếu nước', 'Trọn bộ ký ức: 01 túi tote + 01 sổ tay + 01 ly + 01 phiếu nước. Phiếu nước trị giá 169.000đ, dùng trong sự kiện ngày 22.11.2026 tại On The Radio.'),
 ('Đặt Combo Tuổi Xì Tin', 'Sở hữu ngay · Tuổi Xì Tin'),
 ('Đặt Combo Tuổi Xì Lây', 'Sở hữu ngay · Tuổi Xì Lây'),
 ])
update('ContactSection.tsx', [
 ('Hòm thư tiếp nhận kỷ vật &amp; tâm tình', 'Dòng chảy vẫn tiếp nối'),
 ('Dự án văn hóa nghệ thuật hoài niệm được xây dựng bởi tập thể sinh viên và những người yêu mến giai điệu thập niên 90s:', '{brief.contact}'),
 ('<strong className="font-epilogue text-base text-retro-forest block">EVo – FUDA Event Club</strong>', ''),
 ('<span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">On The Radio Đà Nẵng</span>', '<span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">EVo – FUDA Event Club</span><span className="bg-retro-paper-card px-2.5 py-1 rounded text-xs font-semibold text-retro-dark border border-retro-dark/20">On The Radio Đà Nẵng</span>'),
 ])
p=base/'_data/home.ts'
s=p.read_text(encoding='utf-8').replace('Giá gốc 130k','Giá gốc 119.000đ').replace('Giá gốc 220k','')
p.write_text(s,encoding='utf-8')
p=root/'src/components/Footer.tsx'
s=p.read_text(encoding='utf-8').replace('• EVo – FUDA Event Club', 'Đơn vị đồng hành: EVo – FUDA Event Club')
p.write_text(s,encoding='utf-8')
print('Applied supplied brief content and confirmed merchandise corrections.')
