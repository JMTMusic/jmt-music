import { afterEach, describe, expect, it, vi } from "vitest";
import { notifyContact, notifyDiscovery } from "./notifications";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("inbound email notifications", () => {
  it("sends a Project Discovery to the JMT inbox with reply-to and idempotency", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await notifyDiscovery({
      submissionToken: "11111111-1111-4111-8111-111111111111",
      firstName: "Ava",
      artistName: "Ava Blue",
      email: "ava@example.com",
      phone: "",
      projectType: "Single",
      vision: "A record about home",
      inspiration: "Family",
      currentStage: "Writing",
      timeline: "Flexible",
      additionalNotes: ""
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(init.headers["Idempotency-Key"]).toBe("project-discovery/11111111-1111-4111-8111-111111111111");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["jmtmusicproductions@gmail.com"]);
    expect(body.reply_to).toBe("ava@example.com");
    expect(body.from).toBe("JMT Music Website <onboarding@resend.dev>");
    expect(body.text).toContain("A record about home");
  });

  it("fails safely when delivery is not configured or rejected", async () => {
    await expect(notifyContact({submissionToken:"22222222-2222-4222-8222-222222222222",name:"Sam",email:"sam@example.com",subject:"Hello",message:"Hi"})).rejects.toThrow("not configured");

    process.env.RESEND_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(notifyContact({submissionToken:"22222222-2222-4222-8222-222222222222",name:"Sam",email:"sam@example.com",subject:"Hello",message:"Hi"})).rejects.toThrow("403");
  });
});
