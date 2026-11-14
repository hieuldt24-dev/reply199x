import type { MemoryTrack, UpcomingProduct, AttendanceStep, EventContent, MerchCombo } from "../_types/home";

export const tracks = [
  {
    "id": "track-1",
    "number": "01",
    "label": "Track 01 • Lắng Nghe",
    "title": "Khơi gợi những điều thân thuộc",
    "description": "Thanh âm cassette rè rè, chiếc điện thoại bàn màu đỏ bồi hồi chuông reo và cuốn lưu bút mực tím nắn nót đánh thức những ký ức tưởng chừng đã ngủ quên."
  },
  {
    "id": "track-2",
    "number": "02",
    "label": "Track 02 • Hiện Thực",
    "title": "Đưa ký ức trở lại hiện tại",
    "description": "Để người trẻ chạm tay vào ký ức thanh xuân không mạng xã hội, nơi tình cảm chân thật gửi qua nét bút và những cái hẹn gặp gỡ đời thường ấm áp."
  },
  {
    "id": "track-3",
    "number": "03",
    "label": "Track 03 • Tiếp Nối",
    "title": "Kết nối những dòng ký ức",
    "description": "Nhịp cầu giao thoa giữa thế hệ 7X, 8X, 9X và sự tiếp nhận của Gen Z hôm nay, cùng sẻ chia và kiến tạo sự thấu hiểu bền vững qua từng giai điệu."
  }
] as const satisfies readonly MemoryTrack[];

export const upcomingProducts = [
  {
    "id": "keepsake-1",
    "symbol": "✦",
    "stamp": "SIDE A / SIDE B",
    "title": "Băng Cassette Mixtape",
    "description": "Tuyển tập giai điệu V-Pop thập niên 90 kèm booklet ảnh.",
    "material": "Kỷ vật độc quyền",
    "status": "Sắp cập nhật"
  },
  {
    "id": "keepsake-2",
    "symbol": "✦",
    "stamp": "COTTON VINTAGE",
    "title": "Áo Thun Retro 199X",
    "description": "Áo phông wash in logo TV CRT và dòng chữ Dòng Chảy Hoài Niệm.",
    "material": "Size S – XL",
    "status": "Sắp cập nhật"
  },
  {
    "id": "keepsake-3",
    "symbol": "✦",
    "stamp": "PACK 6 HUY HIỆU",
    "title": "Bộ Huy Hiệu Icon 90s",
    "description": "Gồm icon đài cassette, điện thoại đỏ, TV CRT, đĩa CD và máy game.",
    "material": "Tráng men thiếc",
    "status": "Sắp cập nhật"
  },
  {
    "id": "keepsake-4",
    "symbol": "✉",
    "stamp": "SET 5 POSTCARD",
    "title": "Postcard Tem Thư Xưa",
    "description": "Giấy mỹ thuật kraft in tem bưu chính Việt Nam phong cách cổ điển.",
    "material": "Giấy Kraft mỹ thuật",
    "status": "Sắp cập nhật"
  }
] as const satisfies readonly UpcomingProduct[];

export const attendanceSteps = [
  {
    "id": "step-1",
    "number": 1,
    "label": "BƯỚC 01",
    "symbol": "✓",
    "title": "Check-in Vào Cửa",
    "description": "Xuất trình mã cuống vé điện tử tại bàn lễ tân để nhận vòng tay hoài niệm, tem bưu chính cá nhân hóa và phiếu đổi đồ uống.",
    "note": "* Dự kiến mở bàn check-in lúc 14:30"
  },
  {
    "id": "step-2",
    "number": 2,
    "label": "BƯỚC 02",
    "symbol": "♫",
    "title": "Check-out Trải Nghiệm",
    "description": "Thưởng thức đêm nhạc acoustic, tham gia hoạt cảnh kịch tương tác, giao lưu cùng nghệ sĩ và lưu lại kỷ niệm tại góc chụp ảnh 90s.",
    "note": "* Khung giờ chính: 15:00 - 19:00"
  },
  {
    "id": "step-3",
    "number": 3,
    "label": "BƯỚC 03",
    "symbol": "✎",
    "title": "Đánh Giá Sau Sự Kiện",
    "description": "Để lại lời nhắn và cảm nhận vào cuốn sổ lưu bút chung của dự án, quét mã QR gửi thư đóng góp ý kiến để hoàn thiện các mùa tiếp theo.",
    "note": "* Nhận postcard lưu niệm đặc biệt sau đánh giá"
  }
] as const satisfies readonly AttendanceStep[];

export const assets = {
  "logo": "/images/reply-199x-logo.png",
  cassette: "/images/reply-199x-cassette.png",
  "poster": "/images/reply-199x-event-poster.png",
  merchCollection: "/images/reply-199x-merch-collection.png",
  merchXiTin: "/images/reply-199x-merch-xi-tin.png",
  merchXiLay: "/images/reply-199x-merch-xi-lay.png"
} as const;
export const events = [
 { id:"pop-up", date:"20–21.11.2026", venue:"Cơm Bưng Nước Rót", time:"Vào cửa tự do" },
 { id:"concert", date:"22.11.2026", venue:"On The Radio, 76 Thái Phiên, Hải Châu, Đà Nẵng", time:"15:00 – 19:00, Chủ Nhật ngày 22/11/2026" }
] as const satisfies readonly EventContent[];
export const merchCombos = [
 { id:"tuoi-xi-tin", title:'Combo "Tuổi Xì Tin"', price:"99.000", originalPrice:"Giá gốc 119.000đ" },
 { id:"tuoi-xi-lay", title:'Combo "Tuổi Xì Lây"', price:"169.000", originalPrice:"" }
] as const satisfies readonly MerchCombo[];

export const ticketMerchOptions = [
  "Không kèm merch",
  ...merchCombos.map((combo) => `${combo.title} · ${combo.price}đ`),
] as const;
