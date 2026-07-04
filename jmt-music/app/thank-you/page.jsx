import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Reveal } from "@/components/motion";

export const metadata = {
  title: "Thank You",
  description: "Your JMT Music project inquiry has been received."
};

export default function ThankYouPage() {
  return (
    <section className="thank-you-page">
      <div className="thank-you-glow" />
      <div className="site-width thank-you-inner">
        <Reveal>
          <CheckCircle2 className="thank-you-icon" aria-hidden="true" />
          <p className="eyebrow">Message received</p>
          <h1>Thank you for reaching out.</h1>
          <p className="thank-you-lead">Your message has been received. I&apos;ll review your project and get back to you as soon as possible.</p>
          <p className="thank-you-detail">In the meantime, feel free to explore the work, browse available beats, or learn more about how JMT Music can help bring your project to life.</p>
          <div className="button-row thank-you-actions">
            <Link className="button button-primary" href="/beats">Browse Beats <ArrowRight /></Link>
            <Link className="button button-secondary" href="/portfolio">View Portfolio</Link>
            <Link className="button button-secondary" href="/services">Explore Services</Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
