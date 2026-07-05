import type { LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type Beat = {
  id: string;
  title: string;
  cover: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  releaseDate: string;
  featured: boolean;
};

export type Client = {
  id: string;
  name: string;
  email: string;
  project: string;
  budget: string;
  date: string;
  stage: "New" | "Contacted" | "In Progress" | "Completed";
};

export type StatusItem = {
  label: string;
  detail: string;
  healthy: boolean;
};
