"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminCard } from "@/components/control-center/ui";
import { CONTENT_PLATFORMS, CONTENT_TYPES } from "@/lib/content/types";
import { CONTENT_TYPE_LABELS, PLATFORM_LABELS, STATUS_LABELS } from "@/lib/content/display";
import type { ContentItemRecord, ContentPlatform, ContentType } from "@/lib/content/types";

type ContentCalendarProps = {
  items: ContentItemRecord[];
  siteQuery: string;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - result.getDay());
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayKey(date: Date): string {
  return date.toDateString();
}

/**
 * A planning calendar only — no drag-and-drop rescheduling, no external calendar sync.
 * Positions each item on the day of its scheduledAt (regardless of pipeline status, since
 * scheduledAt is set independently of status); clicking a day opens that day's items below
 * the grid instead of a modal, so it stays keyboard- and screen-reader-simple.
 */
export function ContentCalendar({ items, siteQuery }: ContentCalendarProps) {
  const [view, setView] = useState<"month" | "week">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const today = new Date();

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (platformFilter && !item.platforms.includes(platformFilter as ContentPlatform)) return false;
      if (typeFilter && item.contentType !== (typeFilter as ContentType)) return false;
      return true;
    });
  }, [items, platformFilter, typeFilter]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItemRecord[]>();
    for (const item of filtered) {
      if (!item.scheduledAt) continue;
      const key = dayKey(new Date(item.scheduledAt));
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [filtered]);

  const gridDays = useMemo(() => {
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i));
    const gridStart = startOfWeek(startOfMonth(cursor));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [cursor, view]);

  const goPrev = () => setCursor((c) => (view === "month" ? new Date(c.getFullYear(), c.getMonth() - 1, 1) : addDays(c, -7)));
  const goNext = () => setCursor((c) => (view === "month" ? new Date(c.getFullYear(), c.getMonth() + 1, 1) : addDays(c, 7)));
  const goToday = () => {
    setCursor(new Date());
    setSelectedDay(new Date());
  };

  const selectClass = "min-h-10 rounded-lg border border-white/10 bg-black/25 px-3 text-xs text-slate-200 outline-none focus:border-sky-300/60";
  const selectedItems = selectedDay ? itemsByDay.get(dayKey(selectedDay)) || [] : [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
          <button type="button" onClick={goPrev} aria-label="Previous" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={goToday} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.05] hover:text-white">Today</button>
          <button type="button" onClick={goNext} aria-label="Next" className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-white"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <p className="text-sm font-semibold text-slate-100">{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(cursor)}</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            <button type="button" onClick={() => setView("month")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === "month" ? "bg-sky-300/12 text-sky-200" : "text-slate-400 hover:text-white"}`}>Month</button>
            <button type="button" onClick={() => setView("week")} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${view === "week" ? "bg-sky-300/12 text-sky-200" : "text-slate-400 hover:text-white"}`}>Week</button>
          </div>
          <select aria-label="Filter by platform" value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)} className={selectClass}>
            <option value="">All platforms</option>
            {CONTENT_PLATFORMS.map((platform) => <option key={platform} value={platform}>{PLATFORM_LABELS[platform]}</option>)}
          </select>
          <select aria-label="Filter by content type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={selectClass}>
            <option value="">All types</option>
            {CONTENT_TYPES.map((type) => <option key={type} value={type}>{CONTENT_TYPE_LABELS[type]}</option>)}
          </select>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-1.5 ${view === "month" ? "" : "sm:gap-3"}`}>
        {WEEKDAY_LABELS.map((label) => <div key={label} className="px-1 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">{label}</div>)}
        {gridDays.map((day) => {
          const dayItems = itemsByDay.get(dayKey(day)) || [];
          const inCurrentMonth = view === "week" || day.getMonth() === cursor.getMonth();
          const isToday = isSameDay(day, today);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`min-h-20 rounded-xl border p-2 text-left align-top transition sm:min-h-24 ${
                isSelected ? "border-sky-300/60 bg-sky-300/10" : isToday ? "border-sky-300/25 bg-white/[0.03]" : "border-white/6 bg-white/[0.015] hover:border-white/15"
              } ${inCurrentMonth ? "" : "opacity-40"}`}
            >
              <span className={`text-xs font-semibold ${isToday ? "text-sky-300" : "text-slate-300"}`}>{day.getDate()}</span>
              {dayItems.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {dayItems.slice(0, view === "week" ? 4 : 2).map((item) => <p key={item.id} className="truncate rounded bg-sky-300/10 px-1.5 py-0.5 text-[10px] text-sky-200">{item.title}</p>)}
                  {dayItems.length > (view === "week" ? 4 : 2) && <p className="text-[10px] text-slate-500">+{dayItems.length - (view === "week" ? 4 : 2)} more</p>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <AdminCard className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {selectedDay ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(selectedDay) : "Select a day"}
          </p>
          {selectedDay && selectedItems.length === 0 && <p className="text-sm text-slate-500">Nothing scheduled this day.</p>}
          {selectedDay && selectedItems.length > 0 && (
            <div className="space-y-1">
              {selectedItems.map((item) => (
                <Link key={item.id} href={`/control-center/content/pipeline/${item.id}${siteQuery}`} className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-white/[0.035]">
                  <CalendarClock className="h-4 w-4 shrink-0 text-sky-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{item.title}</p>
                    <p className="truncate text-xs text-slate-500">{STATUS_LABELS[item.status]}{item.platforms.length ? ` · ${item.platforms.map((platform) => PLATFORM_LABELS[platform]).join(", ")}` : ""}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-600">{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(item.scheduledAt as string))}</span>
                </Link>
              ))}
            </div>
          )}
          {!selectedDay && <p className="text-sm text-slate-500">Click a day above to see what's scheduled.</p>}
        </AdminCard>
      </div>
    </div>
  );
}
