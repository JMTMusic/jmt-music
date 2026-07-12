"use server";
import { saveDiscovery } from "@/lib/inbound/repository";
import { validateDiscovery } from "@/lib/inbound/validation";
import type { SubmissionResult } from "@/lib/inbound/types";

export async function submitProjectDiscovery(input: unknown): Promise<SubmissionResult> {
  try { return await saveDiscovery(validateDiscovery(input)); }
  catch { return { status:"error", message:"Your Project Discovery could not be sent." }; }
}
