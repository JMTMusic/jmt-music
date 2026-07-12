"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { beginProjectSetupAction, saveProjectSetupDraftAction, submitProjectSetupAction } from "./actions";
import { firstNameFrom, hasValue, hydrateAnswers, renderModeForStatus, REVIEW_STEP, stepForQuestionKey, type SetupAnswers } from "./setup-flow-helpers";
import { questionByKey, SETUP_QUESTIONS, SETUP_SECTIONS, type SetupQuestion } from "@/lib/project-setup/config";
import type { ProjectSetupStatus } from "@/lib/project-setup/types";
import styles from "./setup-flow.module.css";

type PublicView = {
  status: ProjectSetupStatus;
  responses: Record<string, unknown>;
  project: { id: string; title: string; type: string };
  client: { artistName: string; contactName: string | null };
};

const PROJECT_TYPE_LABELS: Record<string, string> = {
  beat: "Beat",
  client_work: "Production",
  sync: "Sync",
  website: "Website",
  content: "Content",
  other: "Project"
};

/**
 * The interactive, artist-facing Project Setup experience. A submitted or confirmed
 * Setup never reaches the interactive branch at all — see the early returns below — so
 * there is no code path where a locked Setup can be edited from this component.
 */
export function SetupFlow({ rawToken, initialView }: { rawToken: string; initialView: PublicView }) {
  const [status, setStatus] = useState<ProjectSetupStatus>(initialView.status);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SetupAnswers>(() => hydrateAnswers(initialView.responses));
  const [beginning, setBeginning] = useState(false);
  const [beginError, setBeginError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (step > 0) headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [saved]);

  // A submitted or confirmed Setup is read-only, full stop — no screens, no editing.
  const renderMode = renderModeForStatus(status);
  if (renderMode === "locked_submitted") return <SubmittedLocked />;
  if (renderMode === "locked_confirmed") return <ConfirmedLocked />;

  const question = step >= 2 && step <= REVIEW_STEP - 1 ? SETUP_QUESTIONS[step - 2] : undefined;
  const isReview = step === REVIEW_STEP;
  const firstName = firstNameFrom(initialView.client);

  function updateAnswer(key: string, value: string | string[]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function toggleMultiSelect(key: string, option: string) {
    setAnswers((current) => {
      const existing = Array.isArray(current[key]) ? (current[key] as string[]) : [];
      const next = existing.includes(option) ? existing.filter((item) => item !== option) : [...existing, option];
      return { ...current, [key]: next };
    });
  }

  async function beginSetup() {
    setBeginning(true);
    setBeginError("");
    try {
      const result = await beginProjectSetupAction(rawToken);
      if (result.status === "error") {
        setBeginError("This Project Setup could not be started. Please try again.");
        return;
      }
      setStatus(result.view.status);
      setStep(1);
    } catch {
      setBeginError("This Project Setup could not be started. Please try again.");
    } finally {
      setBeginning(false);
    }
  }

  function isQuestionValid(target: SetupQuestion): boolean {
    if (target.optional) return true;
    const value = answers[target.key];
    if (target.type === "multi_select") return Array.isArray(value) && value.length > 0;
    return typeof value === "string" && value.trim().length > 0;
  }

  async function continueFromQuestion(event?: FormEvent) {
    event?.preventDefault();
    if (!question) return;
    if (!isQuestionValid(question)) return;

    setSaving(true);
    setSaveError("");
    try {
      const result = await saveProjectSetupDraftAction(rawToken, answers);
      if (result.status === "error") {
        setSaveError("Your progress could not be saved just now. Please try again — your answers are still here.");
        return;
      }
      setSaved(true);
      setStep((current) => Math.min(current + 1, REVIEW_STEP));
    } catch {
      setSaveError("Your progress could not be saved just now. Please try again — your answers are still here.");
    } finally {
      setSaving(false);
    }
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") continueFromQuestion();
  }

  function goBack() {
    setSaveError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function editQuestion(key: string) {
    setStep(stepForQuestionKey(key));
  }

  async function sendSetup() {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const result = await submitProjectSetupAction(rawToken, answers);
      if (result.status === "error") {
        setSubmitError("I'm sorry—your Project Setup could not be sent just yet. Everything you entered is still here. Please try again in a moment.");
        setSubmitting(false);
        return;
      }
      setStatus("submitted");
    } catch {
      setSubmitError("I'm sorry—your Project Setup could not be sent just yet. Everything you entered is still here. Please try again in a moment.");
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <span className={styles.brand}><span className={styles.mark}>JMT</span><span>JMT MUSIC</span></span>
        {question && (
          <div className={styles.progress} aria-label={`Step ${step - 1} of ${SETUP_QUESTIONS.length}`}>
            {SETUP_QUESTIONS.map((item, index) => (
              <span key={item.key} className={index < step - 1 ? styles.progressActive : ""} />
            ))}
          </div>
        )}
      </header>

      <section className={`${styles.stage} ${isReview ? styles.reviewStage : ""}`} key={step}>
        {step === 0 && (
          <div className={`${styles.content} ${styles.welcome}`}>
            <p className={styles.eyebrow}>Project Setup</p>
            <h1>{firstName ? `Welcome, ${firstName}.` : "Welcome."}</h1>
            <p className={styles.lead}>I&apos;m looking forward to working with you. This short setup will help us make sure the details of your project are clear before we begin.</p>
            <p className={styles.body}>You can save your progress and return using this private link at any time.</p>
            {beginError && <p className={styles.saveError} role="alert">{beginError}</p>}
            <button type="button" className={styles.primary} disabled={beginning} onClick={beginSetup}>
              {beginning ? "One moment…" : "Begin Setup"}
              {!beginning && <ArrowRight />}
            </button>
          </div>
        )}

        {step === 1 && (
          <div className={styles.content}>
            <p className={styles.eyebrow}>Your Project</p>
            <h1 ref={headingRef} tabIndex={-1}>Here&apos;s what we&apos;re preparing together.</h1>
            <div className={styles.overviewCard}>
              <dl>
                <div><dt>Project</dt><dd>{initialView.project.title}</dd></div>
                <div><dt>Service</dt><dd>{PROJECT_TYPE_LABELS[initialView.project.type] || initialView.project.type}</dd></div>
                <div><dt>Artist</dt><dd>{initialView.client.artistName}</dd></div>
              </dl>
            </div>
            <nav className={`${styles.actions} ${styles.breathingActions}`} aria-label="Overview navigation">
              <button type="button" className={styles.back} onClick={goBack}><ArrowLeft />Back</button>
              <button type="button" className={styles.primary} onClick={() => setStep(2)}>Continue<ArrowRight /></button>
            </nav>
          </div>
        )}

        {question && (
          <QuestionScreen
            question={question}
            answers={answers}
            saving={saving}
            saveError={saveError}
            saved={saved}
            onUpdate={updateAnswer}
            onToggleMultiSelect={toggleMultiSelect}
            onSubmit={continueFromQuestion}
            onTextareaKeyDown={handleTextareaKeyDown}
            onBack={goBack}
            headingRef={headingRef}
            valid={isQuestionValid(question)}
          />
        )}

        {isReview && (
          <ReviewScreen
            answers={answers}
            submitting={submitting}
            submitError={submitError}
            onEdit={editQuestion}
            onBack={() => setStep(REVIEW_STEP - 1)}
            onSubmit={sendSetup}
            headingRef={headingRef}
          />
        )}
      </section>
    </main>
  );
}

function QuestionScreen({
  question,
  answers,
  saving,
  saveError,
  saved,
  onUpdate,
  onToggleMultiSelect,
  onSubmit,
  onTextareaKeyDown,
  onBack,
  headingRef,
  valid
}: {
  question: SetupQuestion;
  answers: SetupAnswers;
  saving: boolean;
  saveError: string;
  saved: boolean;
  onUpdate: (key: string, value: string | string[]) => void;
  onToggleMultiSelect: (key: string, option: string) => void;
  onSubmit: (event?: FormEvent) => void;
  onTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onBack: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  valid: boolean;
}) {
  const value = answers[question.key];

  return (
    <form className={styles.content} onSubmit={onSubmit}>
      <p className={styles.eyebrow}>Project Setup</p>
      <h1 ref={headingRef} tabIndex={-1}>{question.prompt}</h1>
      {question.helperText && <p className={styles.helper}>{question.helperText}</p>}

      {question.type === "text" && (
        <label className={styles.field}>
          <span className={styles.srOnly}>{question.prompt}</span>
          <input autoFocus type="text" value={typeof value === "string" ? value : ""} onChange={(event) => onUpdate(question.key, event.target.value)} />
        </label>
      )}

      {question.type === "textarea" && (
        <label className={styles.field}>
          <span className={styles.srOnly}>{question.prompt}</span>
          <textarea autoFocus rows={5} value={typeof value === "string" ? value : ""} onKeyDown={onTextareaKeyDown} onChange={(event) => onUpdate(question.key, event.target.value)} />
          <small>Press ⌘ or Ctrl + Return to continue</small>
        </label>
      )}

      {question.type === "single_select" && (
        <fieldset className={styles.choices}>
          <legend className={styles.srOnly}>{question.prompt}</legend>
          {question.options?.map((option) => (
            <label className={`${styles.choice} ${value === option ? styles.selected : ""}`} key={option}>
              <input type="radio" name={question.key} value={option} checked={value === option} onChange={() => onUpdate(question.key, option)} />
              <span>{option}</span>
              <Check aria-hidden="true" />
            </label>
          ))}
        </fieldset>
      )}

      {question.type === "multi_select" && (
        <fieldset className={styles.choices}>
          <legend className={styles.srOnly}>{question.prompt}</legend>
          {question.options?.map((option) => {
            const selected = Array.isArray(value) && value.includes(option);
            return (
              <label className={`${styles.choice} ${selected ? styles.selected : ""}`} key={option}>
                <input type="checkbox" checked={selected} onChange={() => onToggleMultiSelect(question.key, option)} />
                <span>{option}</span>
                <Check aria-hidden="true" />
              </label>
            );
          })}
        </fieldset>
      )}

      {question.followUp && (
        <label className={styles.field}>
          <span style={{ display: "block", marginBottom: 8, color: "#8993a0", fontSize: 13 }}>{question.followUp.prompt}</span>
          <input type="text" value={typeof answers[question.followUp.key] === "string" ? (answers[question.followUp.key] as string) : ""} onChange={(event) => onUpdate(question.followUp!.key, event.target.value)} />
        </label>
      )}

      {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}

      <nav className={styles.actions} aria-label="Question navigation">
        <button type="button" className={styles.back} onClick={onBack} disabled={saving}><ArrowLeft />Back</button>
        <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {saved && (
            <span className={styles.savedNote}>
              <Check />Saved
            </span>
          )}
          <button type="submit" className={styles.primary} disabled={!valid || saving}>
            {saving ? "Saving…" : question.optional && !hasValue(value) ? "Skip" : "Continue"}
            {!saving && <ArrowRight />}
          </button>
        </span>
      </nav>
    </form>
  );
}

function ReviewScreen({
  answers,
  submitting,
  submitError,
  onEdit,
  onBack,
  onSubmit,
  headingRef
}: {
  answers: SetupAnswers;
  submitting: boolean;
  submitError: string;
  onEdit: (key: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div className={`${styles.content} ${styles.review}`}>
      <p className={styles.eyebrow}>Review</p>
      <h1 ref={headingRef} tabIndex={-1}>Take a moment to review.</h1>
      <p className={styles.prompt}>Make sure this reflects your project before it&apos;s sent.</p>

      <div className={styles.reviewSections}>
        {SETUP_SECTIONS.map((section) => {
          const entries = section.questionKeys
            .map((key) => ({ key, question: questionByKey(key), value: answers[key] }))
            .filter((entry) => entry.question && hasValue(entry.value));
          if (!entries.length) return null;
          return (
            <section className={styles.reviewSection} key={section.id}>
              <header>
                <h2>{section.title}</h2>
                <button type="button" onClick={() => onEdit(section.questionKeys[0])}>Edit</button>
              </header>
              <dl>
                {entries.map((entry) => (
                  <div key={entry.key}>
                    <dt>{entry.question!.label}</dt>
                    <dd>{Array.isArray(entry.value) ? entry.value.join(", ") : entry.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      {submitError && <p className={styles.submitError} role="alert">{submitError}</p>}

      <nav className={styles.actions} aria-label="Review navigation">
        <button type="button" className={styles.back} disabled={submitting} onClick={onBack}><ArrowLeft />Go Back</button>
        <button type="button" className={styles.primary} disabled={submitting} onClick={onSubmit}>
          {submitting ? "Sending your Project Setup…" : "Send Project Setup"}
          {!submitting && <ArrowRight />}
        </button>
      </nav>
    </div>
  );
}

function SubmittedLocked() {
  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.stage}>
        <div className={`${styles.content} ${styles.locked}`}>
          <p className={styles.eyebrow}>Project Setup</p>
          <h1>Your Project Setup has been sent.</h1>
          <p className={styles.lead}>I&apos;ll review everything you&apos;ve shared and reach out if anything needs clarification.</p>
        </div>
      </section>
    </main>
  );
}

/**
 * Deliberately does not reference the Project's phase at all — PublicProjectSetupView
 * never exposes it (Stage 2's data layer wasn't modified to add it), so this wording is
 * kept neutral by design rather than risk implying production has started when it may not
 * have. If a future stage wants phase-aware copy, it must add `phase` to
 * PublicProjectSetupView explicitly first.
 */
function ConfirmedLocked() {
  return (
    <main className={styles.experience}>
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.stage}>
        <div className={`${styles.content} ${styles.locked}`}>
          <p className={styles.eyebrow}>Project Setup</p>
          <h1>Your Project Setup has been reviewed and confirmed.</h1>
          <p className={styles.lead}>Thank you — I&apos;ll be in touch as your project moves forward.</p>
        </div>
      </section>
    </main>
  );
}
