import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the Stage 2 server-action layer only. The data layer itself (validation,
 * status transitions, property scoping, asset completeness) is already covered by
 * lib/content/{validation,pipeline,repository}.test.ts (Stage 1) — these tests cover what
 * only exists at this layer: role gating, property/id resolution before the repository is
 * ever touched, protected-field stripping, migration-hint message mapping, and that raw
 * errors/exceptions never leak a user-unsafe message.
 */
let role: "owner" | "editor" | "viewer" | null = "owner";

vi.mock("@/lib/control-center/access", () => ({
  getControlCenterRole: () => Promise.resolve(role)
}));

vi.mock("@/lib/control-center/data", () => ({
  getSiteConfig: (value?: string | null) => ({ id: value === "jonathan-tripp" ? "jonathan-tripp" : "jmt-music" })
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

const repoMocks = {
  createContentItem: vi.fn(),
  updateContentItem: vi.fn(),
  updateContentStatus: vi.fn(),
  archiveContentItem: vi.fn()
};
vi.mock("@/lib/content/repository", () => repoMocks);

const CONTENT_ID = "11111111-1111-4111-8111-111111111111";

function fakeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTENT_ID,
    propertyId: "property-1",
    title: "Test item",
    contentType: null,
    status: "idea",
    priority: "normal",
    platforms: [],
    platformUrls: {},
    notes: null,
    projectId: null,
    clientId: null,
    beatId: null,
    scheduledAt: null,
    publishedAt: null,
    assetVideoReady: false,
    assetVideoUrl: null,
    assetAudioReady: false,
    assetAudioUrl: null,
    assetArtworkReady: false,
    assetArtworkUrl: null,
    assetThumbnailReady: false,
    assetThumbnailUrl: null,
    assetCaptionReady: false,
    caption: null,
    assetHashtagsReady: false,
    hashtags: [],
    createdBy: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

async function importActions() {
  return import("./actions");
}

beforeEach(() => {
  role = "owner";
  delete process.env.CONTROL_CENTER_SUPABASE_USER_ID;
  for (const fn of Object.values(repoMocks)) fn.mockReset();
});

describe("role gating", () => {
  it("rejects every mutation from a viewer", async () => {
    role = "viewer";
    const { createContentItemAction, updateContentItemAction, updateContentStatusAction, archiveContentItemAction, restoreContentItemAction } =
      await importActions();

    const results = await Promise.all([
      createContentItemAction({ property: "jmt-music", title: "x" }),
      updateContentItemAction({ property: "jmt-music", id: CONTENT_ID, title: "x" }),
      updateContentStatusAction({ property: "jmt-music", id: CONTENT_ID, status: "planned" }),
      archiveContentItemAction({ property: "jmt-music", id: CONTENT_ID }),
      restoreContentItemAction({ property: "jmt-music", id: CONTENT_ID })
    ]);

    for (const result of results) {
      expect(result.status).toBe("error");
      if (result.status === "error") expect(result.message).toMatch(/permission/i);
    }
    for (const fn of Object.values(repoMocks)) expect(fn).not.toHaveBeenCalled();
  });

  it("rejects every mutation when there is no authenticated role", async () => {
    role = null;
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "x" });
    expect(result.status).toBe("error");
    expect(repoMocks.createContentItem).not.toHaveBeenCalled();
  });

  it("allows an owner", async () => {
    role = "owner";
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "New idea" });
    expect(result.status).toBe("success");
  });

  it("allows an editor, not just an owner", async () => {
    role = "editor";
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "New idea" });
    expect(result.status).toBe("success");
  });
});

describe("property resolution", () => {
  it("rejects an unrecognized property before the repository is ever called", async () => {
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "not-a-real-property", title: "x" });
    expect(result.status).toBe("error");
    expect(repoMocks.createContentItem).not.toHaveBeenCalled();
  });
});

describe("createContentItemAction", () => {
  it("passes the resolved site and the content fields through to the repository", async () => {
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "New idea", priority: "high" });

    expect(result.status).toBe("success");
    expect(repoMocks.createContentItem).toHaveBeenCalledTimes(1);
    const [site, fields] = repoMocks.createContentItem.mock.calls[0];
    expect(site.id).toBe("jmt-music");
    expect(fields.title).toBe("New idea");
    expect(fields.priority).toBe("high");
  });

  it("assigns createdBy from the server identity, ignoring anything the caller supplies", async () => {
    process.env.CONTROL_CENTER_SUPABASE_USER_ID = "server-user-id";
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();

    await createContentItemAction({
      property: "jmt-music",
      title: "New idea",
      // @ts-expect-error — deliberately smuggling a spoofed createdBy past the type system
      createdBy: "attacker-supplied-id"
    });

    const [, fields] = repoMocks.createContentItem.mock.calls[0];
    expect(fields.createdBy).toBe("server-user-id");
  });

  it("defaults createdBy to null when no server identity is configured", async () => {
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();
    await createContentItemAction({ property: "jmt-music", title: "New idea" });
    const [, fields] = repoMocks.createContentItem.mock.calls[0];
    expect(fields.createdBy).toBeNull();
  });

  it("protected-field rejection: status/publishedAt/propertyId/createdAt/updatedAt never reach the repository call", async () => {
    repoMocks.createContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { createContentItemAction } = await importActions();

    await createContentItemAction({
      property: "jmt-music",
      title: "New idea",
      // @ts-expect-error — deliberately smuggling protected fields past the type system
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
      propertyId: "some-other-property",
      createdAt: "2020-01-01T00:00:00.000Z",
      updatedAt: "2020-01-01T00:00:00.000Z"
    });

    const [, fields] = repoMocks.createContentItem.mock.calls[0];
    expect(fields).not.toHaveProperty("status");
    expect(fields).not.toHaveProperty("publishedAt");
    expect(fields).not.toHaveProperty("propertyId");
    expect(fields).not.toHaveProperty("createdAt");
    expect(fields).not.toHaveProperty("updatedAt");
  });

  it("maps a migration-hint repository error to the user-safe missing-schema message", async () => {
    repoMocks.createContentItem.mockResolvedValue({
      status: "error",
      message: "Supabase query failed — has migration 20260711200000_content_items.sql been applied yet?"
    });
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "x" });
    expect(result).toEqual({ status: "error", message: "Content Workspace is not available until the latest Supabase migration is applied." });
  });

  it("passes through an already user-safe repository error unchanged", async () => {
    repoMocks.createContentItem.mockResolvedValue({ status: "error", message: "That project does not belong to the selected property." });
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "x", projectId: CONTENT_ID });
    expect(result).toEqual({ status: "error", message: "That project does not belong to the selected property." });
  });

  it("never leaks a raw thrown exception", async () => {
    repoMocks.createContentItem.mockRejectedValue(new Error("relation \"content_items\" does not exist"));
    const { createContentItemAction } = await importActions();
    const result = await createContentItemAction({ property: "jmt-music", title: "x" });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.message).not.toMatch(/relation|content_items|does not exist/i);
    }
  });
});

describe("updateContentItemAction", () => {
  it("rejects a malformed content item id before the repository is ever called", async () => {
    const { updateContentItemAction } = await importActions();
    const result = await updateContentItemAction({ property: "jmt-music", id: "not-a-uuid", title: "x" });
    expect(result.status).toBe("error");
    expect(repoMocks.updateContentItem).not.toHaveBeenCalled();
  });

  it("passes id and fields through, without id/property mixed into the field patch", async () => {
    repoMocks.updateContentItem.mockResolvedValue({ status: "success", item: fakeItem({ title: "Renamed" }) });
    const { updateContentItemAction } = await importActions();
    const result = await updateContentItemAction({ property: "jmt-music", id: CONTENT_ID, title: "Renamed" });

    expect(result.status).toBe("success");
    const [site, id, fields] = repoMocks.updateContentItem.mock.calls[0];
    expect(site.id).toBe("jmt-music");
    expect(id).toBe(CONTENT_ID);
    expect(fields).toEqual({ title: "Renamed" });
  });

  it("does not silently clear unspecified fields — only supplied keys are forwarded", async () => {
    repoMocks.updateContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { updateContentItemAction } = await importActions();
    await updateContentItemAction({ property: "jmt-music", id: CONTENT_ID, notes: "just notes" });
    const [, , fields] = repoMocks.updateContentItem.mock.calls[0];
    expect(Object.keys(fields)).toEqual(["notes"]);
  });

  it("protected-field rejection: status/publishedAt/createdBy never reach the repository call", async () => {
    repoMocks.updateContentItem.mockResolvedValue({ status: "success", item: fakeItem() });
    const { updateContentItemAction } = await importActions();

    await updateContentItemAction({
      property: "jmt-music",
      id: CONTENT_ID,
      title: "Renamed",
      // @ts-expect-error — deliberately smuggling protected fields past the type system
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z",
      createdBy: "attacker-supplied-id"
    });

    const [, , fields] = repoMocks.updateContentItem.mock.calls[0];
    expect(fields).not.toHaveProperty("status");
    expect(fields).not.toHaveProperty("publishedAt");
    expect(fields).not.toHaveProperty("createdBy");
    expect(fields).toEqual({ title: "Renamed" });
  });

  it("maps a migration-hint repository error to the user-safe missing-schema message", async () => {
    repoMocks.updateContentItem.mockResolvedValue({
      status: "error",
      message: "Supabase query failed — has migration 20260711200000_content_items.sql been applied yet?"
    });
    const { updateContentItemAction } = await importActions();
    const result = await updateContentItemAction({ property: "jmt-music", id: CONTENT_ID, title: "x" });
    expect(result).toEqual({ status: "error", message: "Content Workspace is not available until the latest Supabase migration is applied." });
  });
});

describe("updateContentStatusAction", () => {
  it("rejects a malformed content item id before the repository is ever called", async () => {
    const { updateContentStatusAction } = await importActions();
    const result = await updateContentStatusAction({ property: "jmt-music", id: "not-a-uuid", status: "planned" });
    expect(result.status).toBe("error");
    expect(repoMocks.updateContentStatus).not.toHaveBeenCalled();
  });

  it("forwards a valid transition and returns the updated item", async () => {
    repoMocks.updateContentStatus.mockResolvedValue({ status: "success", item: fakeItem({ status: "planned" }) });
    const { updateContentStatusAction } = await importActions();
    const result = await updateContentStatusAction({ property: "jmt-music", id: CONTENT_ID, status: "planned" });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.item.status).toBe("planned");
    expect(repoMocks.updateContentStatus).toHaveBeenCalledWith(expect.objectContaining({ id: "jmt-music" }), CONTENT_ID, "planned");
  });

  it("surfaces a repository-rejected transition (e.g. skipping ahead) as an error", async () => {
    repoMocks.updateContentStatus.mockResolvedValue({ status: "error", message: 'A content item cannot move from "idea" to "published".' });
    const { updateContentStatusAction } = await importActions();
    const result = await updateContentStatusAction({ property: "jmt-music", id: CONTENT_ID, status: "published" });
    expect(result).toEqual({ status: "error", message: 'A content item cannot move from "idea" to "published".' });
  });

  it("returns publishedAt exactly as the repository computed it — this action does not set it itself", async () => {
    repoMocks.updateContentStatus.mockResolvedValue({
      status: "success",
      item: fakeItem({ status: "published", publishedAt: "2026-07-11T00:00:00.000Z" })
    });
    const { updateContentStatusAction } = await importActions();
    const result = await updateContentStatusAction({ property: "jmt-music", id: CONTENT_ID, status: "published" });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.item.publishedAt).toBe("2026-07-11T00:00:00.000Z");
  });
});

describe("archiveContentItemAction", () => {
  it("calls archiveContentItem, not a general status update", async () => {
    repoMocks.archiveContentItem.mockResolvedValue({ status: "success", item: fakeItem({ status: "archived" }) });
    const { archiveContentItemAction } = await importActions();
    const result = await archiveContentItemAction({ property: "jmt-music", id: CONTENT_ID });
    expect(result.status).toBe("success");
    expect(repoMocks.archiveContentItem).toHaveBeenCalledWith(expect.objectContaining({ id: "jmt-music" }), CONTENT_ID);
    expect(repoMocks.updateContentStatus).not.toHaveBeenCalled();
  });

  it("surfaces a repository rejection (item not yet published) as an error", async () => {
    repoMocks.archiveContentItem.mockResolvedValue({ status: "error", message: 'A content item cannot move from "idea" to "archived".' });
    const { archiveContentItemAction } = await importActions();
    const result = await archiveContentItemAction({ property: "jmt-music", id: CONTENT_ID });
    expect(result.status).toBe("error");
  });
});

describe("restoreContentItemAction", () => {
  it("calls updateContentStatus with 'published' specifically", async () => {
    repoMocks.updateContentStatus.mockResolvedValue({ status: "success", item: fakeItem({ status: "published" }) });
    const { restoreContentItemAction } = await importActions();
    const result = await restoreContentItemAction({ property: "jmt-music", id: CONTENT_ID });
    expect(result.status).toBe("success");
    expect(repoMocks.updateContentStatus).toHaveBeenCalledWith(expect.objectContaining({ id: "jmt-music" }), CONTENT_ID, "published");
  });

  it("surfaces a repository rejection (item was never published, or already published) as an error", async () => {
    repoMocks.updateContentStatus.mockResolvedValue({ status: "error", message: 'A content item cannot move from "idea" to "published".' });
    const { restoreContentItemAction } = await importActions();
    const result = await restoreContentItemAction({ property: "jmt-music", id: CONTENT_ID });
    expect(result.status).toBe("error");
  });
});

describe("migration-missing safe error across every action", () => {
  const migrationError = {
    status: "error",
    message: "Supabase query failed — has migration 20260711200000_content_items.sql been applied yet?"
  };
  const SAFE_MESSAGE = "Content Workspace is not available until the latest Supabase migration is applied.";

  it("createContentItemAction, updateContentItemAction, updateContentStatusAction, archiveContentItemAction, and restoreContentItemAction all map it identically", async () => {
    repoMocks.createContentItem.mockResolvedValue(migrationError);
    repoMocks.updateContentItem.mockResolvedValue(migrationError);
    repoMocks.updateContentStatus.mockResolvedValue(migrationError);
    repoMocks.archiveContentItem.mockResolvedValue(migrationError);

    const { createContentItemAction, updateContentItemAction, updateContentStatusAction, archiveContentItemAction, restoreContentItemAction } =
      await importActions();

    const results = await Promise.all([
      createContentItemAction({ property: "jmt-music", title: "x" }),
      updateContentItemAction({ property: "jmt-music", id: CONTENT_ID, title: "x" }),
      updateContentStatusAction({ property: "jmt-music", id: CONTENT_ID, status: "planned" }),
      archiveContentItemAction({ property: "jmt-music", id: CONTENT_ID }),
      restoreContentItemAction({ property: "jmt-music", id: CONTENT_ID })
    ]);

    for (const result of results) {
      expect(result).toEqual({ status: "error", message: SAFE_MESSAGE });
    }
  });
});
