"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { submitBeatInquiry, submitContact } from "@/app/contact/actions";

const THANK_YOU_URL = "https://jmtmusic.studio/thank-you";

const projectOptions = [
  "Custom Production",
  "Beat Licensing / Customization",
  "Mixing & Polish",
  "Session Piano / Keys",
  "Sync / Custom Cue"
];

export function ContactForm({ initialProject = "", initialBeat = "", initialBeatSlug = "" }) {
  const [status, setStatus] = useState("idle");
  const token = useRef(null);

  const submitForm = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("invalid");
      return;
    }

    setStatus("submitting");
    try {
      const formData = new FormData(form);
      token.current ||= crypto.randomUUID();
      const common = { submissionToken:token.current,name:formData.get("name"),email:formData.get("email"),subject:formData.get("project"),message:formData.get("description") };
      const result = initialBeat
        ? await submitBeatInquiry({...common,beatTitle:initialBeat,beatSlug:initialBeatSlug,beatUrl:window.location.href,licenseInterest:formData.get("project"),intendedUse:`Timeline: ${formData.get("timeline") || "Not provided"}. Budget: ${formData.get("budget") || "Not provided"}. References: ${formData.get("references") || "None"}.`})
        : await submitContact(common);
      if(result.status === "error") throw new Error("Form delivery failed");
      trackEvent("contact_form_submit", {
        project_type: formData.get("project"),
        budget_range: formData.get("budget"),
        timeline: formData.get("timeline")
      });
      setStatus("success");
      form.reset();
      token.current = null;
      window.location.assign(THANK_YOU_URL);
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      className="inquiry-form"
      onSubmit={submitForm}
      noValidate
    >
      <input type="text" name="_honey" tabIndex="-1" autoComplete="off" hidden />
      {initialBeat && <input type="hidden" name="beat" value={initialBeat} />}

      <div className="form-status" aria-live="polite">
        {status === "success" && <div className="form-success"><CheckCircle2 />Thank you. Your inquiry was sent to JMT Music. We&apos;ll be in touch soon.</div>}
        {status === "error" && <div className="form-error"><AlertCircle />We couldn&apos;t send your inquiry. Please try again or email hello@jmtmusic.studio.</div>}
        {status === "invalid" && <div className="form-error"><AlertCircle />Please complete every required field before sending.</div>}
      </div>

      {(initialProject || initialBeat) && <div className="inquiry-context"><span>Inquiry selected</span><strong>{initialProject || "Beat Licensing / Customization"}{initialBeat ? ` · ${initialBeat}` : ""}</strong></div>}

      <div className="form-row">
        <label>Name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="form-row">
        <label>Service / project type<span className="select-wrap"><select name="project" required defaultValue={initialProject}><option value="" disabled>Select a service</option>{projectOptions.map((option) => <option key={option}>{option}</option>)}</select></span></label>
        <label>Budget range<span className="select-wrap"><select name="budget" required defaultValue=""><option value="" disabled>Select a working range</option><option>Under $500</option><option>$500 - $1,000</option><option>$1,000 - $2,500</option><option>$2,500+</option><option>Not sure yet</option><option>Prefer to discuss</option></select></span></label>
      </div>
      <div className="form-row">
        <label>Timeline<span className="select-wrap"><select name="timeline" required defaultValue=""><option value="" disabled>When are you aiming to finish?</option><option>As soon as possible</option><option>Within 2 - 4 weeks</option><option>Within 1 - 2 months</option><option>Within 2 - 3 months</option><option>Flexible</option></select></span></label>
        <label>Reference links<input name="references" type="text" inputMode="url" placeholder="Demo, playlist, private link, or references" /></label>
      </div>
      <label>Project details<textarea name="description" rows="6" required placeholder="What are you making, where is the project now, and what should the music feel like?" /></label>
      <button className="button button-primary form-submit" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? <><LoaderCircle className="spin" />Sending inquiry</> : <>Send inquiry <Send /></>}
      </button>
      <p className="form-note">Your inquiry is reviewed personally. Links to private demos and references are welcome.</p>
    </form>
  );
}
