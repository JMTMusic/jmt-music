"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  return (
    <form className="inquiry-form" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
      {sent && <div className="form-success" role="status">Thanks. Your inquiry is ready for the studio.</div>}
      <div className="form-row">
        <label>Name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="form-row">
        <label>Project type<select name="project" required defaultValue=""><option value="" disabled>Select a service</option><option>Custom Production</option><option>Mixing</option><option>Mastering</option><option>Piano / Keyboard Recording</option><option>Beat Licensing</option><option>Sync Licensing</option></select></label>
        <label>Budget<select name="budget" required defaultValue=""><option value="" disabled>Select a range</option><option>Under $500</option><option>$500 - $1,000</option><option>$1,000 - $2,500</option><option>$2,500+</option></select></label>
      </div>
      <label>Timeline<select name="timeline" required defaultValue=""><option value="" disabled>When do you need it?</option><option>Within 2 weeks</option><option>Within 1 month</option><option>1 - 3 months</option><option>Flexible</option></select></label>
      <label>Tell me about the project<textarea name="description" rows="7" required placeholder="What are you making, and what should it feel like?" /></label>
      <button className="button button-primary" type="submit">Send inquiry <Send /></button>
      <p className="form-note">This demo form does not transmit data yet. Email hello@jmtmusic.studio for a direct reply.</p>
    </form>
  );
}
