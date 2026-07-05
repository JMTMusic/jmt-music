import "server-only";
import type { Beat, Client, StatusItem } from "./types";

export const beats: Beat[] = [
  { id: "swagger", title: "Swagger", cover: "/assets/covers/swagger.jpg", genre: "Classic Hip-Hop", bpm: 92, musicalKey: "D minor", releaseDate: "Jun 28, 2026", featured: true },
  { id: "heat-check", title: "Heat Check", cover: "/assets/covers/heat-check.jpg", genre: "Trap", bpm: 144, musicalKey: "F minor", releaseDate: "Jun 18, 2026", featured: true },
  { id: "hoodie", title: "Hoodie", cover: "/assets/covers/hoodie.jpg", genre: "Lo-Fi", bpm: 78, musicalKey: "A minor", releaseDate: "Jun 04, 2026", featured: false },
  { id: "tlkin", title: "TLKIN", cover: "/assets/covers/tlkin.jpg", genre: "Hip-Hop", bpm: 98, musicalKey: "C minor", releaseDate: "May 24, 2026", featured: false },
  { id: "backpack", title: "Backpack", cover: "/assets/covers/backpack.jpg", genre: "Boom Bap", bpm: 88, musicalKey: "E minor", releaseDate: "May 10, 2026", featured: false },
  { id: "why-not", title: "Why Not", cover: "/assets/covers/why-not.jpg", genre: "Chill", bpm: 84, musicalKey: "G major", releaseDate: "Apr 26, 2026", featured: false }
];

export const clients: Client[] = [
  { id: "c1", name: "Maya Reynolds", email: "maya@example.com", project: "Single production", budget: "$1,200", date: "Jul 5", stage: "New" },
  { id: "c2", name: "Darius Cole", email: "darius@example.com", project: "Mix & master", budget: "$650", date: "Jul 4", stage: "Contacted" },
  { id: "c3", name: "Kira Lane", email: "kira@example.com", project: "Custom instrumental", budget: "$900", date: "Jul 2", stage: "In Progress" },
  { id: "c4", name: "Northline Media", email: "music@example.com", project: "Sync composition", budget: "$2,500", date: "Jun 28", stage: "In Progress" },
  { id: "c5", name: "Eli Monroe", email: "eli@example.com", project: "EP mastering", budget: "$800", date: "Jun 20", stage: "Completed" }
];

export const websiteStatuses: StatusItem[] = [
  { label: "Google Analytics", detail: "Measurement active", healthy: true },
  { label: "Microsoft Clarity", detail: "Recording active", healthy: true },
  { label: "Website Online", detail: "All systems operational", healthy: true },
  { label: "Deployment Status", detail: "Production ready", healthy: true }
];
