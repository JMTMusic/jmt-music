"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { discoveryScreens, discoveryStorageKey, discoveryThankYouNameKey, discoveryTokenKey, emptyAnswers, IntakeAnswers, questionFor, questionScreenIndexFor, reviewCopy, reviewSections, welcomeCopy } from "./intake-config";
import { submitProjectDiscovery } from "./actions";
import { sanitizeDiscoveryDraft } from "@/lib/inbound/pipeline";
import styles from "./project-intake.module.css";

export function ProjectIntake() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<IntakeAnswers>(emptyAnswers);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const screen = discoveryScreens[step - 1];
  const question = screen?.type === "question" ? questionFor(screen.questionId) : undefined;
  const reviewStep = discoveryScreens.length + 1;
  const isReview = step === reviewStep;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(discoveryStorageKey);
      if (saved) setAnswers(sanitizeDiscoveryDraft(JSON.parse(saved), emptyAnswers) as IntakeAnswers);
    } catch { /* Local persistence is an enhancement, not a requirement. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(discoveryStorageKey, JSON.stringify(answers)); } catch { /* Continue without persistence. */ }
  }, [answers, ready]);

  useEffect(() => { if (step > 0) headingRef.current?.focus({ preventScroll: true }); }, [step]);

  const value = question ? answers[question.id] : "";
  const valid = question ? question.optional || isValid(question.type, value) : true;

  function continueFlow(event?: FormEvent) {
    event?.preventDefault();
    if (valid) setStep((current) => Math.min(current + 1, reviewStep));
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && valid) continueFlow();
  }

  function updateAnswer(id: keyof IntakeAnswers, nextValue: string) { setAnswers((current) => ({ ...current, [id]: nextValue })); }
  function editSection(firstAnswerId: keyof IntakeAnswers) { setStep(questionScreenIndexFor(firstAnswerId) + 1); }

  async function completeDiscovery() {
    if (submitting) return;
    setSubmitting(true); setSubmitError("");
    let token=window.localStorage.getItem(discoveryTokenKey);
    if(!token){token=crypto.randomUUID();window.localStorage.setItem(discoveryTokenKey,token);}
    const result=await submitProjectDiscovery({submissionToken:token,firstName:answers.name,artistName:answers.artistName,email:answers.email,phone:answers.phone,projectType:answers.projectType,vision:answers.projectStory,inspiration:answers.inspiration,currentStage:answers.currentStage,timeline:answers.timeline,additionalNotes:answers.finalNotes});
    if(result.status==="error"){setSubmitting(false);setSubmitError(reviewCopy.submitError);return;}
    window.localStorage.setItem(discoveryThankYouNameKey,answers.name);
    window.localStorage.removeItem(discoveryStorageKey);
    window.localStorage.removeItem(discoveryTokenKey);
    router.push("/start-your-project/thank-you");
  }

  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="JMT Music home"><span className={styles.mark}>JMT</span><span>JMT MUSIC</span></a>
        {step > 0 && !isReview && <div className={styles.progress} aria-label={`Step ${step} of ${discoveryScreens.length}`}>{discoveryScreens.map((item, index) => <span key={item.id} className={index < step ? styles.progressActive : ""} />)}</div>}
      </header>

      <section className={`${styles.stage} ${isReview ? styles.reviewStage : ""}`} key={step}>
        {step === 0 && <div className={`${styles.content} ${styles.welcome}`}><p className={styles.eyebrow}>A personal beginning</p><h1>{welcomeCopy.heading}</h1><p className={styles.lead}>{welcomeCopy.lead}</p><p className={styles.body}>{welcomeCopy.body}</p><button className={styles.primary} onClick={() => setStep(1)}>{welcomeCopy.action}<ArrowRight /></button></div>}

        {question && <form className={styles.content} onSubmit={continueFlow}>
          <p className={styles.eyebrow}>Project Discovery</p>
          <h1 ref={headingRef} tabIndex={-1}>{question.heading}</h1>
          {question.prompt && <p className={styles.prompt}>{question.prompt}</p>}
          {(question.type === "text" || question.type === "email" || question.type === "phone") && <>
            <label className={styles.field}><span className={styles.srOnly}>{question.placeholder}</span><input autoFocus type={question.type === "phone" ? "tel" : question.type} inputMode={question.type === "phone" ? "tel" : undefined} autoComplete={question.autoComplete} value={value} placeholder={question.placeholder} onChange={(event) => updateAnswer(question.id, event.target.value)} /></label>
            {question.alternateChoice && <label className={`${styles.alternate} ${value === question.alternateChoice ? styles.alternateSelected : ""}`}><input type="checkbox" checked={value === question.alternateChoice} onChange={(event) => updateAnswer(question.id, event.target.checked ? question.alternateChoice! : "")} /><span className={styles.checkbox}><Check /></span>{question.alternateChoice}</label>}
          </>}
          {question.type === "choice" && <fieldset className={styles.choices}><legend className={styles.srOnly}>{question.heading}</legend>{question.options.map((option) => <label className={`${styles.choice} ${value === option ? styles.selected : ""}`} key={option}><input type="radio" name={question.id} value={option} checked={value === option} onChange={() => updateAnswer(question.id, option)} /><span>{option}</span><Check aria-hidden="true" /></label>)}</fieldset>}
          {question.type === "textarea" && <label className={styles.field}><span className={styles.srOnly}>{question.heading}</span><textarea autoFocus rows={5} value={value} placeholder={question.placeholder} onKeyDown={handleTextareaKeyDown} onChange={(event) => updateAnswer(question.id, event.target.value)} />{question.helper && <small>{question.helper}</small>}</label>}
          <nav className={styles.actions} aria-label="Question navigation"><button type="button" className={styles.back} onClick={() => setStep((current) => current - 1)}><ArrowLeft />Back</button><button type="submit" className={styles.primary} disabled={!valid}>{question.optional && !value.trim() ? "Skip" : "Continue"}<ArrowRight /></button></nav>
        </form>}

        {screen?.type === "breathing" && <div className={`${styles.content} ${styles.welcome}`}>
          <p className={styles.eyebrow}>A moment to reflect</p>
          <h1 ref={headingRef} tabIndex={-1}>{screen.heading}</h1>
          {screen.body.map((paragraph, index) => <p className={index === 0 ? styles.lead : styles.body} key={paragraph}>{paragraph}</p>)}
          <nav className={`${styles.actions} ${styles.breathingActions}`} aria-label="Guidance navigation"><button type="button" className={styles.back} onClick={() => setStep((current) => current - 1)}><ArrowLeft />Back</button><button type="button" className={styles.primary} onClick={() => setStep((current) => current + 1)}>{screen.action}<ArrowRight /></button></nav>
        </div>}

        {isReview && <div className={`${styles.content} ${styles.review}`}>
          <p className={styles.eyebrow}>{reviewCopy.eyebrow}</p><h1 ref={headingRef} tabIndex={-1}>{reviewCopy.heading}</h1><p className={styles.prompt}>{reviewCopy.body}</p>
          <div className={styles.reviewSections}>{reviewSections.map((section) => {
            const entries = section.answerIds.map((id) => ({ id, value: answers[id], question: questionFor(id) })).filter((entry) => entry.value.trim());
            if (!entries.length) return null;
            return <section className={styles.reviewSection} key={section.title}><header><h2>{section.title}</h2><button onClick={() => editSection(section.answerIds[0])}>{reviewCopy.editAction}</button></header><dl>{entries.map((entry) => <div className={entry.id === "projectType" ? styles.featuredAnswer : ""} key={entry.id}><dt>{entry.question?.reviewLabel}</dt><dd>{entry.value}</dd></div>)}</dl></section>;
          })}</div>
          {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}
          <nav className={styles.actions} aria-label="Review navigation"><button type="button" className={styles.back} disabled={submitting} onClick={() => setStep(discoveryScreens.length)}><ArrowLeft />{reviewCopy.secondaryAction}</button><button type="button" className={styles.primary} disabled={submitting} onClick={completeDiscovery}>{submitting ? reviewCopy.submittingAction : reviewCopy.primaryAction}{!submitting&&<ArrowRight />}</button></nav>
        </div>}

      </section>
    </main>
  );
}

function isValid(type: string, value: string) {
  const trimmed = value.trim();
  if (type === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return trimmed.length > 0;
}
