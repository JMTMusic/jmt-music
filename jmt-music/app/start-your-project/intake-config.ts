export type IntakeAnswers = {
  name: string;
  artistName: string;
  email: string;
  phone: string;
  projectType: string;
  projectStory: string;
  inspiration: string;
  currentStage: string;
  timeline: string;
  finalNotes: string;
};

type AnswerId = keyof IntakeAnswers;

type BaseQuestion = {
  id: AnswerId;
  heading: string;
  prompt?: string;
  optional?: boolean;
  reviewLabel: string;
};

export type IntakeQuestion =
  | (BaseQuestion & { type: "text" | "email" | "phone"; placeholder: string; autoComplete: string; alternateChoice?: string })
  | (BaseQuestion & { type: "textarea"; placeholder: string; helper?: string })
  | (BaseQuestion & { type: "choice"; options: readonly string[] });

export type ReviewSection = {
  title: string;
  answerIds: readonly AnswerId[];
};

export type DiscoveryScreen =
  | { id: string; type: "question"; questionId: AnswerId }
  | { id: string; type: "breathing"; heading: string; body: readonly string[]; action: string };

export const welcomeCopy = {
  heading: "Welcome.",
  lead: "Every great project begins with a conversation.",
  body: "Over the next few minutes, I’ll learn more about your music, your vision, and what you’re hoping to create. Once you’re finished, I’ll personally review everything you share and reach out with the next steps.",
  action: "Begin"
} as const;

export const discoveryStorageKey = "jmt-project-discovery";
export const discoveryTokenKey = "jmt-project-discovery-token";
export const discoveryThankYouNameKey = "jmt-project-discovery-thank-you-name";

export const questions: readonly IntakeQuestion[] = [
  { id: "name", type: "text", heading: "What should I call you?", placeholder: "Your name", autoComplete: "name", reviewLabel: "Name" },
  { id: "artistName", type: "text", heading: "What is your artist or project name?", placeholder: "Artist or project name", autoComplete: "organization", alternateChoice: "I don’t have one yet.", reviewLabel: "Artist or project name" },
  { id: "email", type: "email", heading: "What’s the best email to reach you?", prompt: "You can also share a phone number if you’d like.", placeholder: "you@example.com", autoComplete: "email", reviewLabel: "Email" },
  { id: "phone", type: "phone", heading: "Would you like to share a phone number?", prompt: "This is completely optional.", placeholder: "Phone number", autoComplete: "tel", optional: true, reviewLabel: "Phone" },
  { id: "projectType", type: "choice", heading: "What are we creating?", options: ["Production", "Mixing", "Mastering", "Mixing & Mastering", "Beat Licensing", "Session Piano or Keyboards", "Artist Partnership", "Something Else"], reviewLabel: "Project type" },
  { id: "projectStory", type: "textarea", heading: "Tell me about your vision.", prompt: "This is the heart of our conversation. Share what you hope to create and what matters most about it.", placeholder: "Tell me about the music you see taking shape…", helper: "Press ⌘ or Ctrl + Return to continue", reviewLabel: "Your vision" },
  { id: "inspiration", type: "textarea", heading: "What inspired you to create it?", placeholder: "A moment, an artist, a feeling, or anything that set it in motion…", helper: "Press ⌘ or Ctrl + Return to continue", reviewLabel: "Inspiration" },
  { id: "currentStage", type: "choice", heading: "Where are you in the process today?", options: ["Just an idea", "Writing", "Recording", "Producing", "Ready for Mixing", "Ready for Mastering", "Ready for Release", "Not sure yet"], reviewLabel: "Current stage" },
  { id: "timeline", type: "choice", heading: "Do you have a target timeline in mind?", options: ["As soon as possible", "Within a month", "Within a few months", "Flexible", "Just exploring"], reviewLabel: "Timeline" },
  { id: "finalNotes", type: "textarea", heading: "Is there anything else you’d like me to know before I personally review your project?", optional: true, placeholder: "Anything else you’d like to share…", helper: "Optional", reviewLabel: "Additional notes" }
] as const;

export const discoveryScreens: readonly DiscoveryScreen[] = [
  { id: "name", type: "question", questionId: "name" },
  { id: "artist-name", type: "question", questionId: "artistName" },
  { id: "email", type: "question", questionId: "email" },
  { id: "phone", type: "question", questionId: "phone" },
  { id: "project-type", type: "question", questionId: "projectType" },
  {
    id: "idea-reassurance",
    type: "breathing",
    heading: "Every great record starts with an idea.",
    body: ["Whether you’re beginning with a voice memo, a finished demo, or simply a melody that’s been living in your head for years, you’re exactly where you need to be.", "Let’s talk about what you’re hoping to create."],
    action: "Continue"
  },
  { id: "vision", type: "question", questionId: "projectStory" },
  { id: "inspiration", type: "question", questionId: "inspiration" },
  {
    id: "story-reassurance",
    type: "breathing",
    heading: "Every artist has a story worth telling.",
    body: ["Understanding the story behind your music helps me better understand the project itself.", "Thank you for sharing yours."],
    action: "Continue"
  },
  { id: "current-stage", type: "question", questionId: "currentStage" },
  { id: "timeline", type: "question", questionId: "timeline" },
  { id: "final-notes", type: "question", questionId: "finalNotes" },
  {
    id: "review-introduction",
    type: "breathing",
    heading: "Almost finished.",
    body: ["Take a moment to review everything you’ve shared.", "I’ll personally read every response before deciding on the next steps."],
    action: "Review My Discovery"
  }
] as const;

export const reviewCopy = {
  eyebrow: "Project Discovery",
  heading: "Take a moment to review.",
  body: "Make sure this reflects the music and vision you want me to understand.",
  primaryAction: "Send Project Discovery",
  secondaryAction: "Go Back",
  editAction: "Edit",
  submittingAction: "Sending your Project Discovery…",
  submitError: "I’m sorry—your Project Discovery could not be sent just yet. Everything you entered is still here. Please try again in a moment."
} as const;

export const reviewSections: readonly ReviewSection[] = [
  { title: "Artist", answerIds: ["name", "artistName", "email", "phone"] },
  { title: "Project", answerIds: ["projectType"] },
  { title: "Your Vision", answerIds: ["projectStory", "inspiration"] },
  { title: "Current Stage", answerIds: ["currentStage"] },
  { title: "Timeline", answerIds: ["timeline"] },
  { title: "Additional Notes", answerIds: ["finalNotes"] }
] as const;

export const thankYouCopy = {
  eyebrow: "A Note from Jonathan",
  heading: "Thank You.",
  personalizedHeading: (name: string) => `Thank You, ${name}.`,
  body: [
    "Thank you for taking the time to share your music with me.",
    "I know how much trust it takes to invite someone into your creative process, and I don’t take that responsibility lightly.",
    "Every Project Discovery is personally reviewed by me because I believe every artist deserves thoughtful attention from the very beginning. I’ll take the time to get to know your music, your vision, and what you’re hoping to create before reaching out personally with my thoughts and the next steps.",
    "Thank you again for considering JMT Music. I appreciate the opportunity to learn about your project, and I’ll be in touch soon."
  ],
  belief: "Every great project begins with understanding the artist behind the music.",
  signature: "— Jonathan Tripp",
  role: "Founder, JMT Music"
} as const;

export const emptyAnswers: IntakeAnswers = {
  name: "", artistName: "", email: "", phone: "", projectType: "", projectStory: "", inspiration: "", currentStage: "", timeline: "", finalNotes: ""
};

export function firstName(name: string) { return name.trim().split(/\s+/)[0] || "there"; }
export function questionFor(id: AnswerId) { return questions.find((question) => question.id === id); }
export function questionScreenIndexFor(id: AnswerId) { return discoveryScreens.findIndex((screen) => screen.type === "question" && screen.questionId === id); }
