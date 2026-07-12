import { describe, expect, it } from "vitest";
import { validateBeatInquiry, validateContact, validateDiscovery } from "./validation";
const token="019535d9-1b4c-7abc-8def-123456789abc";
describe("inbound validation",()=>{
  it("normalizes a valid discovery and ignores protected fields",()=>{const value=validateDiscovery({submissionToken:token,firstName:"  Ava ",artistName:"Ava Blue",email:" AVA@EXAMPLE.COM ",projectType:"Production",vision:"A record about home",inspiration:"Family",currentStage:"Writing",timeline:"Flexible",status:"accepted",internal_notes:"public attempt"});expect(value.email).toBe("ava@example.com");expect(value).not.toHaveProperty("status");expect(value).not.toHaveProperty("internal_notes");});
  it("rejects invalid discovery email",()=>expect(()=>validateDiscovery({submissionToken:token,firstName:"A",email:"bad",projectType:"Mixing",vision:"v",inspiration:"i",currentStage:"Writing",timeline:"Flexible"})).toThrow());
  it("rejects missing discovery fields",()=>expect(()=>validateDiscovery({submissionToken:token,email:"a@b.com"})).toThrow());
  it("accepts a valid contact and rejects an empty message",()=>{expect(validateContact({submissionToken:token,name:"Sam",email:"sam@example.com",subject:"Pricing",message:"Hello"}).name).toBe("Sam");expect(()=>validateContact({submissionToken:token,name:"Sam",email:"sam@example.com",message:""})).toThrow();});
  it("retains beat context",()=>{const value=validateBeatInquiry({submissionToken:token,name:"Mia",email:"mia@example.com",beatTitle:"Cloud Nine",beatSlug:"cloud-nine",beatUrl:"https://jmtmusic.studio/beats",message:"Exclusive license?"});expect(value.beatTitle).toBe("Cloud Nine");expect(value.beatSlug).toBe("cloud-nine");});
  it("drops malformed beat context without rejecting the useful inquiry",()=>{const value=validateBeatInquiry({submissionToken:token,name:"Mia",email:"mia@example.com",beatTitle:"Cloud Nine",beatSlug:"../unsafe",beatUrl:"javascript:alert(1)",message:"Can I license this?"});expect(value.beatSlug).toBe("");expect(value.beatUrl).toBe("");});
  it("rejects malformed idempotency tokens",()=>expect(()=>validateContact({submissionToken:"not-a-token",name:"Sam",email:"sam@example.com",message:"Hello"})).toThrow());
});
