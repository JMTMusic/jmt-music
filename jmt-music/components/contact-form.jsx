"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, Send } from "lucide-react";

const FORM_ENDPOINT = "https://formsubmit.co/ajax/hello@jmtmusic.studio";
const THANK_YOU_URL = "https://jmtmusic.studio/thank-you";

export function ContactForm() {
  const [status, setStatus] = useState("idle");

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
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      });

      if (!response.ok) throw new Error("Form delivery failed");
      setStatus("success");
      form.reset();
      window.location.assign(THANK_YOU_URL);
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      className="inquiry-form"
      action="https://formsubmit.co/hello@jmtmusic.studio"
      method="POST"
      onSubmit={submitForm}
      noValidate
    >
      <input type="hidden" name="_subject" value="New JMT Music project inquiry" />
      <input type="hidden" name="_template" value="table" />
      <input type="hidden" name="_captcha" value="false" />
      <input type="hidden" name="_next" value={THANK_YOU_URL} />
      <input type="text" name="_honey" tabIndex="-1" autoComplete="off" hidden />

      <div className="form-status" aria-live="polite">
        {status === "success" && <div className="form-success"><CheckCircle2 />Thank you. Your inquiry was sent to JMT Music. We&apos;ll be in touch soon.</div>}
        {status === "error" && <div className="form-error"><AlertCircle />We couldn&apos;t send your inquiry. Please try again or email hello@jmtmusic.studio.</div>}
        {status === "invalid" && <div className="form-error"><AlertCircle />Please complete every required field before sending.</div>}
      </div>

      <div className="form-row">
        <label>Name<input name="name" required autoComplete="name" /></label>
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      </div>
      <div className="form-row">
        <label>Project type<span className="select-wrap"><select name="project" required defaultValue=""><option value="" disabled>Select a service</option><option>Custom Production</option><option>Mixing</option><option>Mastering</option><option>Piano / Keyboard Recording</option><option>Beat Licensing</option><option>Sync Licensing</option></select></span></label>
        <label>Budget<span className="select-wrap"><select name="budget" required defaultValue=""><option value="" disabled>Select a range</option><option>Under $500</option><option>$500 - $1,000</option><option>$1,000 - $2,500</option><option>$2,500+</option></select></span></label>
      </div>
      <label>Timeline<span className="select-wrap"><select name="timeline" required defaultValue=""><option value="" disabled>When do you need it?</option><option>Within 2 weeks</option><option>Within 1 month</option><option>1 - 3 months</option><option>Flexible</option></select></span></label>
      <label>Tell me about the project<textarea name="description" rows="7" required placeholder="What are you making, and what should it feel like?" /></label>
      <button className="button button-primary form-submit" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? <><LoaderCircle className="spin" />Sending inquiry</> : <>Send inquiry <Send /></>}
      </button>
      <p className="form-note">Your project details are sent securely to hello@jmtmusic.studio.</p>
    </form>
  );
}
