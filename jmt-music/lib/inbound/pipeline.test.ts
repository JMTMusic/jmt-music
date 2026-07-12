import { describe, expect, it } from "vitest";
import { canConvertInbound, countNew, isAllowedStatus, nextActionForInbound, projectTypeForInbound, sanitizeDiscoveryDraft, thankYouFirstName } from "./pipeline";

describe("inbound workflow rules",()=>{
  it("allows only statuses belonging to each pipeline",()=>{expect(isAllowedStatus("discoveries","accepted")).toBe(true);expect(isAllowedStatus("messages","accepted")).toBe(false);expect(isAllowedStatus("beat-inquiries","licensed")).toBe(true);expect(isAllowedStatus("discoveries","licensed")).toBe(false);});
  it("maps conversion types and next actions",()=>{expect(projectTypeForInbound("discoveries")).toBe("client_work");expect(projectTypeForInbound("beat-inquiries")).toBe("beat");expect(projectTypeForInbound("messages")).toBeNull();expect(nextActionForInbound("discoveries")).toContain("Project Setup");});
  it("guards converted records and all contact messages",()=>{expect(canConvertInbound("discoveries",{project_id:null})).toBe(true);expect(canConvertInbound("discoveries",{project_id:"existing"})).toBe(false);expect(canConvertInbound("messages",{project_id:null})).toBe(false);});
  it("counts only new items as active dashboard attention",()=>expect(countNew([{status:"new"},{status:"resolved"},{status:"declined"},{status:"converted"},{status:"licensed"},{status:"archived"}])).toBe(1));
  it("ignores removed and non-string draft fields",()=>{const empty={name:"",email:"",vision:""};expect(sanitizeDiscoveryDraft({name:"Ava",email:42,emotionalDirection:"removed"},empty)).toEqual({name:"Ava",email:"",vision:""});expect(sanitizeDiscoveryDraft("bad",empty)).toEqual(empty);});
  it("uses a first name when present and falls back cleanly",()=>{expect(thankYouFirstName("  Ava Blue ")).toBe("Ava");expect(thankYouFirstName(42)).toBe("");expect(thankYouFirstName("  ")).toBe("");});
});
