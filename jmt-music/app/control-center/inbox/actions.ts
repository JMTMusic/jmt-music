"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getControlCenterRole } from "@/lib/control-center/access";
import type { InboundKind } from "@/lib/inbound/types";
import { isAllowedStatus } from "@/lib/inbound/pipeline";
const tables={discoveries:"project_discoveries",messages:"contact_messages","beat-inquiries":"beat_inquiries"} as const;
const uuid=/^[0-9a-f-]{36}$/i;
async function context(property:string){const role=await getControlCenterRole();if(role!=="owner"&&role!=="editor")throw new Error("unauthorized");const db=createSupabaseAdminClient();const p=await db.from("properties").select("id").eq("slug",property).single();if(!p.data)throw new Error("property");return {db,propertyId:p.data.id};}
export async function updateInbound(formData:FormData){const kind=String(formData.get("kind")) as InboundKind;const id=String(formData.get("id"));const status=String(formData.get("status"));const notes=String(formData.get("internal_notes")||"").trim().slice(0,8000)||null;if(!tables[kind]||!uuid.test(id)||!isAllowedStatus(kind,status))return;try{const {db,propertyId}=await context(String(formData.get("property")));await db.from(tables[kind]).update({status,internal_notes:notes,reviewed_at:status==="new"?null:new Date().toISOString()}).eq("id",id).eq("property_id",propertyId);revalidatePath("/control-center/inbox");revalidatePath("/control-center");}catch{}}
export async function convertInbound(formData:FormData){const kind=String(formData.get("kind")) as InboundKind;if(kind==="messages")return;const id=String(formData.get("id"));if(!uuid.test(id))return;try{const {db,propertyId}=await context(String(formData.get("property")));await db.rpc("convert_inbound_to_project",{p_kind:kind,p_inbound_id:id,p_property_id:propertyId});revalidatePath("/control-center/inbox");revalidatePath("/control-center");revalidatePath("/control-center/projects");}catch{}}
