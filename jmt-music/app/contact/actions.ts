"use server";
import { saveBeatInquiry, saveContactMessage } from "@/lib/inbound/repository";
import { validateBeatInquiry, validateContact } from "@/lib/inbound/validation";
import type { SubmissionResult } from "@/lib/inbound/types";
export async function submitContact(input:unknown):Promise<SubmissionResult>{try{return await saveContactMessage(validateContact(input));}catch{return {status:"error",message:"Your message could not be sent."};}}
export async function submitBeatInquiry(input:unknown):Promise<SubmissionResult>{try{return await saveBeatInquiry(validateBeatInquiry(input));}catch{return {status:"error",message:"Your beat inquiry could not be sent."};}}
