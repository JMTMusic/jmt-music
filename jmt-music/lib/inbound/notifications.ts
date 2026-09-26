import "server-only";
import type { BeatInquiryInput, ContactMessageInput, ProjectDiscoveryInput } from "./types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RECIPIENT = "jmtmusicproductions@gmail.com";
const FROM = process.env.RESEND_FROM_EMAIL || "JMT Music Website <onboarding@resend.dev>";

type Notification = {
  subject: string;
  replyTo: string;
  text: string;
  idempotencyKey: string;
};

async function send(notification: Notification) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Email delivery is not configured.");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": notification.idempotencyKey
    },
    body: JSON.stringify({
      from: FROM,
      to: [RECIPIENT],
      reply_to: notification.replyTo,
      subject: notification.subject,
      text: notification.text
    })
  });

  if (!response.ok) throw new Error(`Email delivery failed (${response.status}).`);
}

const line = (label: string, value?: string) => `${label}: ${value || "Not provided"}`;

export function notifyDiscovery(value: ProjectDiscoveryInput) {
  const displayName = value.artistName || value.firstName;
  return send({
    subject: `New Project Discovery — ${displayName}`,
    replyTo: value.email,
    idempotencyKey: `project-discovery/${value.submissionToken}`,
    text: [
      "A new Project Discovery was submitted.", "",
      line("Name", value.firstName),
      line("Artist name", value.artistName),
      line("Email", value.email),
      line("Phone", value.phone),
      line("Project type", value.projectType),
      line("Current stage", value.currentStage),
      line("Timeline", value.timeline), "",
      "Vision:", value.vision, "",
      "Inspiration:", value.inspiration, "",
      "Additional notes:", value.additionalNotes || "Not provided"
    ].join("\n")
  });
}

export function notifyContact(value: ContactMessageInput) {
  return send({
    subject: value.subject || `New website inquiry — ${value.name}`,
    replyTo: value.email,
    idempotencyKey: `contact-message/${value.submissionToken}`,
    text: [
      "A new website inquiry was submitted.", "",
      line("Name", value.name),
      line("Email", value.email),
      line("Phone", value.phone),
      line("Subject", value.subject), "",
      "Message:", value.message
    ].join("\n")
  });
}

export function notifyBeatInquiry(value: BeatInquiryInput) {
  return send({
    subject: `New beat inquiry — ${value.beatTitle}`,
    replyTo: value.email,
    idempotencyKey: `beat-inquiry/${value.submissionToken}`,
    text: [
      "A new beat inquiry was submitted.", "",
      line("Name", value.name),
      line("Artist name", value.artistName),
      line("Email", value.email),
      line("Phone", value.phone),
      line("Beat", value.beatTitle),
      line("Beat URL", value.beatUrl),
      line("License interest", value.licenseInterest),
      line("Intended use", value.intendedUse), "",
      "Message:", value.message
    ].join("\n")
  });
}
