import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Renders published custom visual-editor sections with existing public-site styles. */
export function PublicCmsSections({ sections = [] }) {
  return sections.map((section) => <PublicCmsSection key={section.sectionKey} section={section} />);
}

function PublicCmsSection({ section }) {
  const content = section.content;
  if (content.hidden || content.deleted) return null;
  const cta = content.section_type === "cta";
  const hero = content.section_type === "hero";
  const imageStyle = content.image_url ? {
    backgroundImage: `linear-gradient(90deg, rgba(5,7,10,.94), rgba(5,7,10,.55)), url("${content.image_url}")`,
    backgroundPosition: `${content.image_position?.x ?? 50}% ${content.image_position?.y ?? 50}%`,
    backgroundSize: "cover"
  } : undefined;
  const className = hero ? "page-hero" : cta ? "cta-band" : "section";

  return <section className={className} style={imageStyle}><div className="site-width narrow">
    {content.eyebrow && <p className="eyebrow">{content.eyebrow}</p>}
    {content.heading && (hero
      ? <h1>{content.heading}</h1>
      : <h2 style={{ fontSize: "clamp(44px, 5vw, 72px)", lineHeight: .96 }}>{content.heading}</h2>)}
    {content.body && <p style={{ maxWidth: 760, color: "var(--muted)", fontSize: 17 }}>{content.body}</p>}
    {(content.primary_cta_label || content.secondary_cta_label) && <div className="button-row" style={cta ? { justifyContent: "center" } : undefined}>
      {content.primary_cta_label && <Link className="button button-primary" href={content.primary_cta_url || "/contact"}>{content.primary_cta_label} <ArrowRight /></Link>}
      {content.secondary_cta_label && <Link className="button button-secondary" href={content.secondary_cta_url || "/"}>{content.secondary_cta_label}</Link>}
    </div>}
  </div></section>;
}
