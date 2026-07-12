import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These wrap the real lib/project-setup/repository.ts functions rather than mocking
 * them — actions.ts has no logic of its own worth isolating (it's a thin, unauthenticated
 * passthrough by design, since the raw token IS the authorization), so the only way to
 * meaningfully test it is end-to-end against the same in-memory fake Supabase client
 * lib/project-setup/repository.test.ts already uses.
 */
type Row = Record<string, unknown>;

class FakeQueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private pendingInsert: Row | null = null;
  private pendingUpdate: Row | null = null;

  constructor(
    private readonly table: Row[],
    private readonly uniqueColumns: string[],
    private readonly defaults: Row = {}
  ) {}

  select(_columns: string) {
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }

  insert(row: Row) {
    this.pendingInsert = row;
    return this;
  }

  update(row: Row) {
    this.pendingUpdate = row;
    return this;
  }

  private matches(row: Row) {
    return this.filters.every(([key, value]) => row[key] === value);
  }

  private conflict(candidate: Row): boolean {
    return this.uniqueColumns.some((column) => candidate[column] !== undefined && this.table.some((row) => row[column] === candidate[column]));
  }

  private doInsert() {
    if (this.conflict(this.pendingInsert as Row)) return { data: null, error: { code: "23505", message: "duplicate key" } };
    const now = new Date().toISOString();
    // `this.defaults` mirrors this table's real Postgres column defaults (e.g.
    // `status text not null default 'draft'`) for any column repository.ts's own INSERT
    // deliberately omits, relying on the database to fill it in.
    const row: Row = { id: `row-${this.table.length + 1}-${Math.random().toString(36).slice(2)}`, created_at: now, updated_at: now, ...this.defaults, ...this.pendingInsert };
    this.table.push(row);
    return { data: { ...row }, error: null };
  }

  private doUpdate() {
    const matched = this.table.filter((row) => this.matches(row));
    for (const row of matched) Object.assign(row, this.pendingUpdate);
    if (!matched.length) return { data: null, error: { message: "no matching row" } };
    return { data: { ...matched[0] }, error: null };
  }

  async maybeSingle() {
    if (this.pendingInsert) return this.doInsert();
    if (this.pendingUpdate) return this.doUpdate();
    const found = this.table.filter((row) => this.matches(row));
    return { data: found[0] ? { ...found[0] } : null, error: null };
  }

  async single() {
    if (this.pendingInsert) return this.doInsert();
    if (this.pendingUpdate) return this.doUpdate();
    const found = this.table.filter((row) => this.matches(row));
    if (found.length !== 1) return { data: null, error: { message: "expected exactly one row" } };
    return { data: { ...found[0] }, error: null };
  }
}

class FakeDb {
  tables: Record<string, Row[]> = { properties: [], projects: [], clients: [], project_setups: [] };
  private uniqueColumns: Record<string, string[]> = { project_setups: ["project_id", "access_token_hash"] };
  // Mirrors what a real Postgres row looks like immediately after repository.ts's INSERT:
  // `status`/`responses` get the migration's own `not null default` values (`'draft'` /
  // `'{}'`), and every other nullable column repository.ts's INSERT never mentions
  // (access_revoked_at, completed_by, internal_notes, sent_at, started_at, submitted_at,
  // confirmed_at, reopened_at) reads back as an explicit `null` in real Postgres — not a
  // missing key. Without this, mapRow() reads `undefined` for those columns forever, since
  // nothing else in this fake ever sets them until an actual update touches them.
  private defaults: Record<string, Row> = {
    project_setups: {
      status: "draft",
      responses: {},
      access_revoked_at: null,
      completed_by: null,
      internal_notes: null,
      sent_at: null,
      started_at: null,
      submitted_at: null,
      confirmed_at: null,
      reopened_at: null
    }
  };

  from(name: string) {
    return new FakeQueryBuilder(this.tables[name], this.uniqueColumns[name] || [], this.defaults[name] || {});
  }

  seedProperty(id: string, slug: string) {
    this.tables.properties.push({ id, slug });
  }

  seedProject(id: string, propertyId: string, extra: Row = {}) {
    this.tables.projects.push({ id, property_id: propertyId, title: "Test Project", type: "client_work", client_id: null, ...extra });
  }

  seedClient(id: string, propertyId: string, extra: Row = {}) {
    this.tables.clients.push({ id, property_id: propertyId, artist_name: "Test Artist", contact_name: null, ...extra });
  }
}

let db = new FakeDb();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => db
}));

const site = { id: "jmt-music", name: "JMT Music", domain: "jmtmusic.studio", connected: true, initials: "JM" } as never;

// validateProjectId() requires a real UUID shape (lib/project-setup/validation.ts) — a
// plain placeholder id fails that check before ever touching the fake database, which is
// exactly what surfaced this fixture bug once these tests could actually run for the
// first time on a real machine. Must stay a real UUID shape — note validation.ts's regex
// additionally requires the version nibble (3rd group) to be 1-8 and the variant nibble
// (4th group) to be 8/9/a/b, not just "8 hex - 4 hex - 4 hex - 4 hex - 12 hex".
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

async function importAll() {
  const actions = await import("./actions");
  const repository = await import("@/lib/project-setup/repository");
  return { ...actions, ...repository };
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty("property-1", "jmt-music");
  db.seedProject(PROJECT_ID, "property-1", { client_id: "client-1" });
  db.seedClient("client-1", "property-1", { artist_name: "Some Artist" });
});

describe("loadProjectSetupAction", () => {
  it("renders the Setup for a valid token", async () => {
    const { createProjectSetup, loadProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const result = await loadProjectSetupAction(created.rawToken);
    expect(result.status).toBe("found");
    if (result.status === "found") expect(result.view.project.id).toBe(PROJECT_ID);
  });

  it("shows the unavailable state for an invalid/unknown token", async () => {
    const { loadProjectSetupAction } = await importAll();
    const result = await loadProjectSetupAction("not-a-real-token-at-all");
    expect(result.status).toBe("not_found");
  });

  it("shows the unavailable state for a revoked token", async () => {
    const { createProjectSetup, loadProjectSetupAction, revokeProjectSetupAccess } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await revokeProjectSetupAccess(site, PROJECT_ID);
    const result = await loadProjectSetupAction(created.rawToken);
    expect(result.status).toBe("revoked");
  });
});

describe("beginProjectSetupAction", () => {
  it("transitions draft to in_progress on first Begin", async () => {
    const { beginProjectSetupAction, createProjectSetup } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const begun = await beginProjectSetupAction(created.rawToken);
    expect(begun.status).toBe("success");
    if (begun.status === "success") {
      expect(begun.view.status).toBe("in_progress");
      expect(begun.view.startedAt).not.toBeNull();
    }
  });

  it("does not reset startedAt on a return visit", async () => {
    const { beginProjectSetupAction, createProjectSetup } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const first = await beginProjectSetupAction(created.rawToken);
    if (first.status !== "success") throw new Error("expected success");
    const firstStartedAt = first.view.startedAt;

    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await beginProjectSetupAction(created.rawToken);
    if (second.status !== "success") throw new Error("expected success");
    expect(second.view.startedAt).toBe(firstStartedAt);
  });
});

describe("saveProjectSetupDraftAction", () => {
  it("saves successfully", async () => {
    const { createProjectSetup, saveProjectSetupDraftAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const saved = await saveProjectSetupDraftAction(created.rawToken, { communication_preference: "Email" });
    expect(saved.status).toBe("success");
    if (saved.status === "success") expect(saved.view.responses.communication_preference).toBe("Email");
  });

  it("enforces the response size limit", async () => {
    const { createProjectSetup, saveProjectSetupDraftAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const oversized = { final_notes: "x".repeat(200_000) };
    const result = await saveProjectSetupDraftAction(created.rawToken, oversized);
    expect(result.status).toBe("error");
  });

  it("cannot set protected fields — only the responses column is ever written", async () => {
    const { createProjectSetup, getProjectSetupByProjectId, saveProjectSetupDraftAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    // An attacker-controlled responses payload cannot smuggle in a status/timestamp/
    // completed_by change — these keys, if present, land inside the jsonb `responses`
    // blob as harmless data, never as real column writes.
    await saveProjectSetupDraftAction(created.rawToken, {
      status: "confirmed",
      completed_by: "jonathan",
      confirmed_at: new Date().toISOString(),
      access_revoked_at: null,
      real_answer: "kept"
    });

    const reloaded = await getProjectSetupByProjectId(site, PROJECT_ID);
    expect(reloaded.status).toBe("found");
    if (reloaded.status === "found") {
      expect(reloaded.setup.status).toBe("draft");
      expect(reloaded.setup.completedBy).toBeNull();
      expect(reloaded.setup.confirmedAt).toBeNull();
      expect(reloaded.setup.accessRevokedAt).toBeNull();
      expect(reloaded.setup.responses.real_answer).toBe("kept");
    }
  });
});

describe("submitProjectSetupAction", () => {
  it("saves the latest responses and submits in one call", async () => {
    const { createProjectSetup, submitProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const result = await submitProjectSetupAction(created.rawToken, { availability: "Within a few days" });
    expect(result.status).toBe("success");
    if (result.status === "success") {
      expect(result.view.status).toBe("submitted");
      expect(result.view.responses.availability).toBe("Within a few days");
      expect(result.view.completedBy).toBe("client");
    }
  });

  it("a submitted Setup is read-only — a second submit attempt is rejected", async () => {
    const { createProjectSetup, submitProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await submitProjectSetupAction(created.rawToken, {});
    const result = await submitProjectSetupAction(created.rawToken, { availability: "Let's discuss it" });
    expect(result.status).toBe("error");
  });

  it("a confirmed Setup is read-only — submit is rejected", async () => {
    const { confirmProjectSetup, createProjectSetup, submitProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await submitProjectSetupAction(created.rawToken, {});
    await confirmProjectSetup(site, PROJECT_ID);

    const result = await submitProjectSetupAction(created.rawToken, { availability: "Let's discuss it" });
    expect(result.status).toBe("error");
  });

  it("a reopened Setup becomes editable again", async () => {
    const { createProjectSetup, reopenProjectSetup, submitProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await submitProjectSetupAction(created.rawToken, {});
    await reopenProjectSetup(site, PROJECT_ID);

    const result = await submitProjectSetupAction(created.rawToken, { availability: "My schedule varies" });
    expect(result.status).toBe("success");
    if (result.status === "success") expect(result.view.responses.availability).toBe("My schedule varies");
  });
});

describe("no raw token or hash ever appears in serialized public data", () => {
  it("a found view's serialized JSON never contains the raw token or an accessTokenHash-shaped key", async () => {
    const { createProjectSetup, loadProjectSetupAction } = await importAll();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const result = await loadProjectSetupAction(created.rawToken);
    expect(result.status).toBe("found");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain(created.rawToken);
    expect(serialized.toLowerCase()).not.toContain("accesstokenhash");
    expect(serialized.toLowerCase()).not.toContain("token_hash");
  });
});
