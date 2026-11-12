import Image from "next/image";
import { projectLinks } from "../_data/brief";
import { assets, merchCombos } from "../_data/home";

const products = [
  {
    id: "combo-tuoi-xi-tin",
    image: assets.merchXiTin,
    imageHeight: 1500,
    alt: "Combo Tuổi Xì Tin gồm túi tote và sổ tay REPLY 199X, giá 99.000đ",
    label: "Combo hoài niệm 01",
    title: merchCombos[0].title,
    description: "01 túi tote vải canvas vintage và 01 sổ tay lưu bút.",
    price: `${merchCombos[0].price}đ`,
    originalPrice: merchCombos[0].originalPrice,
    note: "Giá ưu đãi: 06/11/2026 – 12/11/2026. Số lượng ưu đãi có hạn.",
    href: projectLinks.merch,
    cta: "Mua ngay",
    featured: false,
    external: true,
  },
  {
    id: "combo-tuoi-xi-lay",
    image: assets.merchXiLay,
    imageHeight: 1500,
    alt: "Combo Tuổi Xì Lây gồm túi tote, sổ tay, ly và phiếu nước, giá 169.000đ",
    label: "Combo ưu đãi · Mua 1 tặng 1",
    title: merchCombos[1].title,
    description: "01 túi tote, 01 sổ tay và 01 ly; tặng 01 phiếu nước trị giá 169.000đ.",
    price: `${merchCombos[1].price}đ`,
    originalPrice: "",
    note: "Phiếu nước dùng ngày 22.11.2026 tại On The Radio. Ưu đãi 06/11/2026 – 12/11/2026, số lượng giới hạn.",
    href: projectLinks.merch,
    cta: "Mua ngay",
    featured: true,
    external: true,
  },
] as const;

export function MerchSection() {
  return (
    <section className="reply-merch" id="merch">
      <div className="reply-shell">
        <header className="reply-merch-intro-row">
          <div>
            <span className="reply-eyebrow">Gói ghém một thời</span>
            <h2>Mang theo những điều thân thuộc</h2>
          </div>
          <p>Những món đồ nhỏ lưu giữ ký ức và mang tinh thần REPLY 199X vào cuộc sống hôm nay.</p>
        </header>

        <div className="reply-merch-grid" id="bo-suu-tap">
          {products.map((product) => (
            <article className={`reply-merch-card${product.featured ? " reply-merch-card--featured" : ""}`} id={product.id} key={product.id}>
              <div className="reply-merch-card__image">
                <Image src={product.image} alt={product.alt} width={1500} height={product.imageHeight} sizes="(max-width: 639px) calc(100vw - 88px), (max-width: 1023px) 520px, 360px" />
              </div>
              <div className="reply-merch-card__label"><span>{product.label}</span></div>
              <h3>{product.title}</h3>
              <p className="reply-merch-card__description">{product.description}</p>
              <div className="reply-merch-card__price">
                <div className="reply-merch-card__original">{product.originalPrice && <s>{product.originalPrice}</s>}</div>
                <strong>{product.price}</strong>
              </div>
              <p className="reply-merch-card__note">{product.note}</p>
              <a className={`reply-merch-card__cta${product.external ? "" : " reply-merch-card__cta--secondary"}`} href={product.href} target={product.external ? "_blank" : undefined} rel={product.external ? "noopener noreferrer" : undefined}>
                {product.cta}<span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
