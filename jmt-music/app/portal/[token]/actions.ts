"use server";

import { revalidatePath } from "next/cache";
import { addClientPortalComment, setClientPortalApproval } from "@/lib/client-portal/repository";

export async function addPortalCommentAction(token: string, formData: FormData) {
  const timestampRaw = String(formData.get("timestamp") || "").trim();
  const result = await addClientPortalComment(token, {
    fileId: String(formData.get("fileId") || ""),
    authorName: String(formData.get("authorName") || ""),
    body: String(formData.get("body") || ""),
    timestampSeconds: timestampRaw ? Number(timestampRaw) : null
  });
  if (result.status === "success") revalidatePath(`/portal/${token}`);
}

export async function setPortalApprovalAction(token: string, formData: FormData) {
  const result = await setClientPortalApproval(token, {
    fileId: String(formData.get("fileId") || ""),
    clientName: String(formData.get("clientName") || ""),
    status: String(formData.get("status") || "") as "approved" | "changes_requested",
    note: String(formData.get("note") || "")
  });
  if (result.status === "success") revalidatePath(`/portal/${token}`);
}
