import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the Stage 3 server-action layer only. The data layer itself (duplicate
 * prevention, token invalidation, status transitions, revoke/reopen interaction) is
 * already covered by lib/project-setup/repository.test.ts — these tests cover what only
 * exists at this layer: role gating, property scoping, the "no Client" creation block,
 * and that raw tokens/DB errors never leak through unexpectedly.
 */
type Row = Record<string, unknown>;

class FakeQueryBuilder {
  private filters: Array<[string, unknown]> = [];
  constructor(private readonly table: Row[]) {}
  select(_columns: string) {
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }
  private matches(row: Row) {
    return this.filters.every(([key, value]) => row[key] === value);
  }
  async maybeSingle() {
    const found = this.table.filter((row) => this.matches(row));
    return { data: found[0] ? { ...found[0] } : null, error: null };
  }
}

class FakeDb {
  tables: Record<string, Row[]> = { properties: [], projects: [] };
  from(name: string) {
    return new FakeQueryBuilder(this.tables[name] || []);
  }
  seedProperty(id: string, slug: string) {
    this.tables.properties.push({ id, slug });
  }
  seedProject(id: string, propertyId: string, clientId: string | null) {
    this.tables.projects.push({ id, property_id: propertyId, client_id: clientId });
  }
}

let db = new FakeDb();
let role: "owner" | "editor" | "viewer" | null = "owner";

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => db
}));

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
  createProjectSetup: vi.fn(),
  reissueProjectSetupToken: vi.fn(),
  revokeProjectSetupAccess: vi.fn(),
  reopenProjectSetup: vi.fn(),
  confirmProjectSetup: vi.fn()
};
vi.mock("@/lib/project-setup/repository", () => repoMocks);

const PROJECT_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_PROJECT_ID = "22222222-2222-2222-2222-222222222222";
const CLIENT_ID = "33333333-3333-3333-3333-333333333333";

async function importActions() {
  return import("./setup-actions");
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty("property-1", "jmt-music");
  role = "owner";
  for (const fn of Object.values(repoMocks)) fn.mockReset();
});

describe("role gating", () => {
  it("rejects mutations from a viewer", async () => {
    role = "viewer";
    const { createProjectSetupAction, confirmProjectSetupAction, reissueProjectSetupLinkAction, reopenProjectSetupAction, revokeProjectSetupAccessAction } = await importActions();

    for (const action of [createProjectSetupAction, reissueProjectSetupLinkAction, revokeProjectSetupAccessAction, reopenProjectSetupAction, confirmProjectSetupAction]) {
      const result = await action({ property: "jmt-music", projectId: PROJECT_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") expect(result.message).toMatch(/permission/i);
    }
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
    expect(repoMocks.reissueProjectSetupToken).not.toHaveBeenCalled();
    expect(repoMocks.revokeProjectSetupAccess).not.toHaveBeenCalled();
    expect(repoMocks.reopenProjectSetup).not.toHaveBeenCalled();
    expect(repoMocks.confirmProjectSetup).not.toHaveBeenCalled();
  });

  it("rejects mutations when there is no authenticated role", async () => {
    role = null;
    const { revokeProjectSetupAccessAction } = await importActions();
    const result = await revokeProjectSetupAccessAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result.status).toBe("error");
  });

  it("allows an editor, not just an owner", async () => {
    role = "editor";
    db.seedProject(PROJECT_ID, "property-1", CLIENT_ID);
    repoMocks.createProjectSetup.mockResolvedValue({ status: "created", setup: {}, rawToken: "raw-token" });
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result.status).toBe("created");
  });
});

describe("createProjectSetupAction", () => {
  it("rejects an invalid property", async () => {
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "not-a-real-property", projectId: PROJECT_ID });
    expect(result.status).toBe("error");
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
  });

  it("rejects a malformed project id", async () => {
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: "not-a-uuid" });
    expect(result.status).toBe("error");
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
  });

  it("rejects a project that does not belong to the selected property (property scoping)", async () => {
    db.seedProperty("property-2", "jonathan-tripp");
    db.seedProject(PROJECT_ID, "property-2", CLIENT_ID);
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toMatch(/does not belong/i);
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
  });

  it("blocks creation when the Project has no linked Client, without auto-creating one", async () => {
    db.seedProject(PROJECT_ID, "property-1", null);
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.message).toBe("Link a Client to this Project before creating Project Setup.");
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
  });

  it("returns a raw token exactly once, on a fresh create", async () => {
    db.seedProject(PROJECT_ID, "property-1", CLIENT_ID);
    repoMocks.createProjectSetup.mockResolvedValue({ status: "created", setup: { id: "setup-1" }, rawToken: "brand-new-token" });
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "created", rawToken: "brand-new-token" });
  });

  it("returns 'exists' with no rawToken on a duplicate create", async () => {
    db.seedProject(PROJECT_ID, "property-1", CLIENT_ID);
    repoMocks.createProjectSetup.mockResolvedValue({ status: "exists", setup: { id: "setup-1" } });
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result.status).toBe("exists");
    expect("rawToken" in result).toBe(false);
  });

  it("maps a migration-hint repository error to the user-safe missing-schema message", async () => {
    db.seedProject(PROJECT_ID, "property-1", CLIENT_ID);
    repoMocks.createProjectSetup.mockResolvedValue({
      status: "error",
      message: "Supabase query failed — has migration 20260711190000_project_setups.sql been applied yet?"
    });
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "error", message: "Project Setup is not available until the latest Supabase migration is applied." });
  });

  it("never touches the repository for a different, unrelated project id", async () => {
    db.seedProject(PROJECT_ID, "property-1", CLIENT_ID);
    const { createProjectSetupAction } = await importActions();
    const result = await createProjectSetupAction({ property: "jmt-music", projectId: OTHER_PROJECT_ID });
    expect(result.status).toBe("error");
    expect(repoMocks.createProjectSetup).not.toHaveBeenCalled();
  });
});

describe("reissueProjectSetupLinkAction", () => {
  it("returns a new raw token on success", async () => {
    repoMocks.reissueProjectSetupToken.mockResolvedValue({ status: "success", setup: {}, rawToken: "reissued-token" });
    const { reissueProjectSetupLinkAction } = await importActions();
    const result = await reissueProjectSetupLinkAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "reissued", rawToken: "reissued-token" });
  });

  it("passes through a repository error as a user-safe message", async () => {
    repoMocks.reissueProjectSetupToken.mockResolvedValue({ status: "error", message: "No Setup exists for this project yet." });
    const { reissueProjectSetupLinkAction } = await importActions();
    const result = await reissueProjectSetupLinkAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "error", message: "No Setup exists for this project yet." });
  });
});

describe("revokeProjectSetupAccessAction / reopenProjectSetupAction / confirmProjectSetupAction", () => {
  it("revoke returns success with no setup/token payload", async () => {
    repoMocks.revokeProjectSetupAccess.mockResolvedValue({ status: "success", setup: {} });
    const { revokeProjectSetupAccessAction } = await importActions();
    const result = await revokeProjectSetupAccessAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "success" });
  });

  it("reopen returns success", async () => {
    repoMocks.reopenProjectSetup.mockResolvedValue({ status: "success", setup: {} });
    const { reopenProjectSetupAction } = await importActions();
    const result = await reopenProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "success" });
  });

  it("reopen surfaces a repository rejection (e.g. invalid transition) as an error", async () => {
    repoMocks.reopenProjectSetup.mockResolvedValue({ status: "error", message: "Only a submitted or confirmed Setup can be reopened." });
    const { reopenProjectSetupAction } = await importActions();
    const result = await reopenProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "error", message: "Only a submitted or confirmed Setup can be reopened." });
  });

  it("confirm returns success", async () => {
    repoMocks.confirmProjectSetup.mockResolvedValue({ status: "success", setup: {} });
    const { confirmProjectSetupAction } = await importActions();
    const result = await confirmProjectSetupAction({ property: "jmt-music", projectId: PROJECT_ID });
    expect(result).toEqual({ status: "success" });
  });

  it("none of the non-create/reissue results ever carry a rawToken field", async () => {
    repoMocks.revokeProjectSetupAccess.mockResolvedValue({ status: "success", setup: {} });
    repoMocks.reopenProjectSetup.mockResolvedValue({ status: "success", setup: {} });
    repoMocks.confirmProjectSetup.mockResolvedValue({ status: "success", setup: {} });
    const { confirmProjectSetupAction, reopenProjectSetupAction, revokeProjectSetupAccessAction } = await importActions();

    for (const action of [revokeProjectSetupAccessAction, reopenProjectSetupAction, confirmProjectSetupAction]) {
      const result = await action({ property: "jmt-music", projectId: PROJECT_ID });
      expect("rawToken" in result).toBe(false);
    }
  });
});
