"use client";

import { useRef, useState } from "react";
import { submitContact } from "@/app/contact/actions";
import { trackEvent } from "@/lib/analytics";
import styles from "./jmt.module.css";

const WORKING_ON = ["Single", "Multiple Songs", "EP", "Album", "Unreleased Idea", "Other"];
const LOOKING_FOR = ["Production", "Song Development", "Arrangement", "Mixing", "Not Sure Yet", "Other"];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InquiryForm() {
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [statusMsg, setStatusMsg] = useState("");
  const token = useRef(null);
  const formRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === "sending") return;

    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const musicLink = String(data.get("musicLink") || "").trim();
    const workingOn = String(data.get("workingOn") || "");
    const lookingFor = String(data.get("lookingFor") || "");
    const project = String(data.get("project") || "").trim();
    const honey = String(data.get("_honey") || "");

    const nextErrors = {};
    if (!name) nextErrors.name = "Please enter your name or artist name.";
    if (!email || !emailRe.test(email)) nextErrors.email = "Please enter a valid email address.";
    if (!workingOn) nextErrors.workingOn = "Please choose one.";
    if (!project) nextErrors.project = "Tell me a little about the project.";
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setStatus("error");
      setStatusMsg("Please fix the fields above.");
      return;
    }

    if (honey) return; // bot trap, silently drop

    setStatus("sending");
    setStatusMsg("Sending your inquiry…");

    const messageLines = [];
    if (musicLink) messageLines.push(`Music link: ${musicLink}`);
    messageLines.push(`Working on: ${workingOn}`);
    if (lookingFor) messageLines.push(`Looking for: ${lookingFor}`);
    messageLines.push("", project);

    try {
      token.current ||= crypto.randomUUID();
      const result = await submitContact({
        submissionToken: token.current,
        name,
        email,
        subject: `Project inquiry — ${workingOn}`,
        message: messageLines.join("\n")
      });
      if (result.status === "error") throw new Error("send failed");
      trackEvent("contact_form_submit", { source: "inquiries_page", working_on: workingOn, looking_for: lookingFor || "not specified" });
      setStatus("success");
      setStatusMsg("");
      token.current = null;
    } catch {
      setStatus("error");
      setStatusMsg("Something went wrong sending your message. Try again, or email jmtmusicproductions@gmail.com directly.");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.successPanel}>
        <p className={styles.eyebrow} style={{ color: "var(--blue)" }}>Inquiry Received.</p>
        <h2>Thank you for reaching out.</h2>
        <p>I&apos;ll take a look at what you sent and be in touch.</p>
      </div>
    );
  }

  return (
    <form ref={formRef} className={styles.inquiryForm} onSubmit={handleSubmit} noValidate>
      <input type="text" name="_honey" tabIndex={-1} autoComplete="off" hidden />

      <div className={styles.fGroup}>
        <label className={styles.fLabel} htmlFor="f-name">Name / Artist Name <span className={styles.req}>*</span></label>
        <input className={styles.field} id="f-name" name="name" type="text" autoComplete="name" required aria-required="true" aria-describedby="err-name" />
        <span className={styles.fError} id="err-name">{errors.name || ""}</span>
      </div>

      <div className={styles.fGroup}>
        <label className={styles.fLabel} htmlFor="f-email">Email <span className={styles.req}>*</span></label>
        <input className={styles.field} id="f-email" name="email" type="email" autoComplete="email" required aria-required="true" aria-describedby="err-email" />
        <span className={styles.fError} id="err-email">{errors.email || ""}</span>
      </div>

      <div className={styles.fGroup}>
        <label className={styles.fLabel} htmlFor="f-link">Music Link <span className={styles.optTag}>(optional &mdash; Spotify, SoundCloud, YouTube, Apple Music, Drive, Dropbox, etc.)</span></label>
        <input className={styles.field} id="f-link" name="musicLink" type="url" placeholder="https://" autoComplete="url" />
      </div>

      <div className={styles.fGroup}>
        <span className={styles.fLabel} id="lbl-working">What are you working on? <span className={styles.req}>*</span></span>
        <div className={styles.optGroup} role="radiogroup" aria-labelledby="lbl-working" aria-describedby="err-working">
          {WORKING_ON.map((opt) => (
            <label className={styles.opt} key={opt}>
              <input type="radio" name="workingOn" value={opt} required />
              <span>{opt}</span>
            </label>
          ))}
        </div>
        <span className={styles.fError} id="err-working">{errors.workingOn || ""}</span>
      </div>

      <div className={styles.fGroup}>
        <span className={styles.fLabel} id="lbl-looking">What are you looking for? <span className={styles.optTag}>(optional)</span></span>
        <div className={styles.optGroup} role="radiogroup" aria-labelledby="lbl-looking">
          {LOOKING_FOR.map((opt) => (
            <label className={styles.opt} key={opt}>
              <input type="radio" name="lookingFor" value={opt} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.fGroup}>
        <label className={styles.fLabel} htmlFor="f-project">Tell Me About The Project <span className={styles.req}>*</span></label>
        <textarea
          className={`${styles.field} ${styles.textarea}`}
          id="f-project"
          name="project"
          rows={6}
          placeholder="Tell me about the music, where you're at with it, and what you're hoping to build."
          required
          aria-required="true"
          aria-describedby="err-project"
        />
        <span className={styles.fError} id="err-project">{errors.project || ""}</span>
      </div>

      <div className={styles.fGroup}>
        <button type="submit" className={`${styles.pillBtn} ${styles.pillBtnStatic} ${styles.pillBtnFullMobile}`} disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : <>Send Inquiry &rarr;</>}
        </button>
        <span className={`${styles.formStatus} ${status === "error" ? styles.formStatusError : ""}`} role="status" aria-live="polite">{statusMsg}</span>
      </div>
    </form>
  );
}
