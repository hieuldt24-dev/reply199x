import type { RadioChannel, RadioHeaderCopy } from "../_types/channels";
import { projectLinks } from "./brief";

/** Zalo community group name, shown exactly as the group displays it. */
export const ZALO_GROUP_NAME = "HỘI ĐỒNG NIÊN REPLY 199X TẠI ĐÀ NẴNG";

export const PRESETS_LABEL = "KÊNH CÀI SẴN — BẤM ĐỂ BẮT SÓNG";
export const DIAL_LABEL = "4 KÊNH · 1 TẦN SỐ THANH XUÂN";

export const radioHeader: RadioHeaderCopy = {
  eyebrow: "BẮT SÓNG KÝ ỨC",
  title: "Theo dòng ký ức, kết nối mọi khoảnh khắc",
  intro:
    "Dòng chảy hoài niệm của REPLY 199X không chỉ ở những trải nghiệm trực tiếp mà còn lan tỏa trên TikTok, Facebook, Instagram và cộng đồng Zalo, nơi dự án chia sẻ câu chuyện, hình ảnh và những nội dung gợi nhắc một thời thanh xuân.",
};

export const radioChannels: readonly RadioChannel[] = [
  {
    id: "tiktok",
    order: 1,
    frequency: "FM 199.1",
    name: "TikTok",
    handle: "@loihoidap199x",
    description: "Ký ức tái hiện qua video ngắn, nội dung tương tác và những câu chuyện gần gũi với thế hệ 8X, 9X.",
    cta: "Bắt sóng TikTok ↗",
    href: projectLinks.tiktok,
    iconId: "tiktok",
  },
  {
    id: "facebook",
    order: 2,
    frequency: "FM 199.2",
    name: "Facebook",
    handle: "@loihoidap199x",
    description: "Cập nhật mới nhất về dự án, các hoạt động nổi bật và những dấu ấn trên hành trình REPLY 199X.",
    cta: "Bắt sóng Facebook ↗",
    href: projectLinks.facebook,
    iconId: "facebook",
  },
  {
    id: "instagram",
    order: 3,
    frequency: "FM 199.3",
    name: "Instagram",
    handle: "@loihoidap199x",
    description: "Hình ảnh và những khoảnh khắc đáng nhớ trên hành trình REPLY 199X, cập nhật qua từng sự kiện.",
    cta: "Bắt sóng Instagram ↗",
    href: projectLinks.instagram,
    iconId: "instagram",
  },
  {
    id: "zalo",
    order: 4,
    frequency: "FM 199.4",
    name: "Zalo",
    handle: `Nhóm ${ZALO_GROUP_NAME}`,
    description: "Nhóm cộng đồng REPLY 199X trên Zalo: trò chuyện cùng những người chung ký ức và nhận thông tin sự kiện.",
    cta: "Vào nhóm Zalo ↗",
    href: projectLinks.zalo,
    iconId: "zalo",
  },
];
