"use server";
import { saveBeatInquiry, saveContactMessage } from "@/lib/inbound/repository";
import { notifyBeatInquiry, notifyContact } from "@/lib/inbound/notifications";
import { validateBeatInquiry, validateContact } from "@/lib/inbound/validation";
import type { SubmissionResult } from "@/lib/inbound/types";
export async function submitContact(input:unknown):Promise<SubmissionResult>{try{const value=validateContact(input);const result=await saveContactMessage(value);if(result.status==="error")return result;await notifyContact(value);return result;}catch{return {status:"error",message:"Your message could not be sent."};}}
export async function submitBeatInquiry(input:unknown):Promise<SubmissionResult>{try{const value=validateBeatInquiry(input);const result=await saveBeatInquiry(value);if(result.status==="error")return result;await notifyBeatInquiry(value);return result;}catch{return {status:"error",message:"Your beat inquiry could not be sent."};}}
