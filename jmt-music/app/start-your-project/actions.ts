"use server";
import { saveDiscovery } from "@/lib/inbound/repository";
import { notifyDiscovery } from "@/lib/inbound/notifications";
import { validateDiscovery } from "@/lib/inbound/validation";
import type { SubmissionResult } from "@/lib/inbound/types";

export async function submitProjectDiscovery(input: unknown): Promise<SubmissionResult> {
  try { const value=validateDiscovery(input);const result=await saveDiscovery(value);if(result.status==="error")return result;await notifyDiscovery(value);return result; }
  catch { return { status:"error", message:"Your Project Discovery could not be sent." }; }
}
