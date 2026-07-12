import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A minimal in-memory fake for the subset of the Supabase query builder this repository
 * actually calls (.from().select().eq().maybeSingle()/.single(), .insert(), .update()).
 * Live Supabase access is unavailable in this environment, so behavioral tests (duplicate
 * creation, token reissue, revocation, status transitions) run against this fake instead
 * of a real database — see the required-tests list this module implements.
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
    if (this.conflict(this.pendingInsert as Row)) {
      return { data: null, error: { code: "23505", message: "duplicate key" } };
    }
    const now = new Date().toISOString();
    // `this.defaults` mirrors this table's real Postgres column defaults (e.g.
    // `status text not null default 'draft'`) for any column repository.ts's own INSERT
    // deliberately omits, relying on the database to fill it in — omitted here, `row.status`
    // would be `undefined` forever, since nothing else in this fake ever sets it.
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
}

let db = new FakeDb();

// The mock factory reads `db` at call time (it's a closure over the outer `let`), so
// reassigning `db` in beforeEach is enough to give every test a clean, isolated store —
// no module re-importing needed, since repository.ts holds no module-level state itself.
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => db
}));

const site = { id: "jmt-music", name: "JMT Music", domain: "jmtmusic.studio", connected: true, initials: "JM" } as never;

// validateProjectId() correctly requires a real UUID shape (see lib/project-setup/validation.ts)
// — a plain placeholder id like the old "project-1" fails that check before ever touching
// the fake database, which is exactly what surfaced this fixture bug once tests could
// actually run for the first time. Must stay a real UUID shape — note validation.ts's
// regex additionally requires the version nibble (3rd group) to be 1-8 and the variant
// nibble (4th group) to be 8/9/a/b, not just "8 hex - 4 hex - 4 hex - 4 hex - 12 hex".
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

async function importRepository() {
  return import("./repository");
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty("property-1", "jmt-music");
  db.seedProject(PROJECT_ID, "property-1");
});

describe("createProjectSetup", () => {
  it("creates a Setup and returns a raw token that is not the stored hash", async () => {
    const { createProjectSetup } = await importRepository();
    const result = await createProjectSetup(site, { projectId: PROJECT_ID });
    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("expected created");
    expect(result.rawToken).toBeTruthy();
    expect(result.setup.projectId).toBe(PROJECT_ID);
    expect(result.setup.status).toBe("draft");
    expect(result.setup.tokenVersion).toBe(1);

    const storedRow = db.tables.project_setups[0];
    expect(storedRow.access_token_hash).not.toBe(result.rawToken);
    expect(JSON.stringify(storedRow)).not.toContain(result.rawToken);
  });

  it("returns the existing Setup on a duplicate create, without a raw token", async () => {
    const { createProjectSetup } = await importRepository();
    const first = await createProjectSetup(site, { projectId: PROJECT_ID });
    expect(first.status).toBe("created");

    const second = await createProjectSetup(site, { projectId: PROJECT_ID });
    expect(second.status).toBe("exists");
    if (second.status !== "exists") throw new Error("expected exists");
    expect("rawToken" in second).toBe(false);
    if (first.status === "created") expect(second.setup.id).toBe(first.setup.id);

    expect(db.tables.project_setups).toHaveLength(1);
  });

  it("rejects a malformed project id before touching the database", async () => {
    const { createProjectSetup } = await importRepository();
    const result = await createProjectSetup(site, { projectId: "not-a-uuid" });
    expect(result.status).toBe("error");
    expect(db.tables.project_setups).toHaveLength(0);
  });
});

describe("getProjectSetupByRawToken", () => {
  it("succeeds with the correct token", async () => {
    const { createProjectSetup, getProjectSetupByRawToken } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const lookup = await getProjectSetupByRawToken(created.rawToken);
    expect(lookup.status).toBe("found");
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.view.id).toBe(created.setup.id);
    expect(lookup.view.project.id).toBe(PROJECT_ID);
  });

  it("fails with an incorrect token", async () => {
    const { createProjectSetup, getProjectSetupByRawToken } = await importRepository();
    await createProjectSetup(site, { projectId: PROJECT_ID });

    const { generateRawToken } = await import("./tokens");
    const lookup = await getProjectSetupByRawToken(generateRawToken());
    expect(lookup.status).toBe("not_found");
  });

  it("rejects a revoked token", async () => {
    const { createProjectSetup, getProjectSetupByRawToken, revokeProjectSetupAccess } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await revokeProjectSetupAccess(site, PROJECT_ID);
    const lookup = await getProjectSetupByRawToken(created.rawToken);
    expect(lookup.status).toBe("revoked");
  });
});

describe("reissueProjectSetupToken", () => {
  it("invalidates the old token, increments token version, and preserves responses", async () => {
    const { createProjectSetup, getProjectSetupByRawToken, reissueProjectSetupToken, saveProjectSetupDraft } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await saveProjectSetupDraft(created.rawToken, { favoriteKey: "C minor" });

    const reissued = await reissueProjectSetupToken(site, PROJECT_ID);
    expect(reissued.status).toBe("success");
    if (reissued.status !== "success") throw new Error("expected success");
    expect(reissued.setup.tokenVersion).toBe(2);
    expect(reissued.rawToken).not.toBe(created.rawToken);

    const oldLookup = await getProjectSetupByRawToken(created.rawToken);
    expect(oldLookup.status).toBe("not_found");

    const newLookup = await getProjectSetupByRawToken(reissued.rawToken);
    expect(newLookup.status).toBe("found");
    if (newLookup.status !== "found") throw new Error("expected found");
    expect(newLookup.view.responses).toEqual({ favoriteKey: "C minor" });
  });
});

describe("revokeProjectSetupAccess", () => {
  it("does not delete or reset the Setup, and does not change its status", async () => {
    const { createProjectSetup, getProjectSetupByProjectId, revokeProjectSetupAccess, startProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");
    await startProjectSetup(created.rawToken);

    const revoked = await revokeProjectSetupAccess(site, PROJECT_ID);
    expect(revoked.status).toBe("success");

    const stillThere = await getProjectSetupByProjectId(site, PROJECT_ID);
    expect(stillThere.status).toBe("found");
    if (stillThere.status !== "found") throw new Error("expected found");
    expect(stillThere.setup.status).toBe("in_progress");
    expect(stillThere.setup.accessRevokedAt).not.toBeNull();
  });
});

describe("status transitions via the repository", () => {
  it("moves draft -> in_progress -> submitted -> confirmed, timestamping each step", async () => {
    const { confirmProjectSetup, createProjectSetup, getProjectSetupByProjectId, startProjectSetup, submitProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    const started = await startProjectSetup(created.rawToken);
    expect(started.status).toBe("success");
    if (started.status === "success") expect(started.view.status).toBe("in_progress");

    const submitted = await submitProjectSetup(created.rawToken, "client");
    expect(submitted.status).toBe("success");
    if (submitted.status === "success") expect(submitted.view.status).toBe("submitted");

    const confirmed = await confirmProjectSetup(site, PROJECT_ID);
    expect(confirmed.status).toBe("success");
    if (confirmed.status === "success") {
      expect(confirmed.setup.status).toBe("confirmed");
      expect(confirmed.setup.confirmedAt).not.toBeNull();
      expect(confirmed.setup.submittedAt).not.toBeNull();
      expect(confirmed.setup.startedAt).not.toBeNull();
    }

    const reloaded = await getProjectSetupByProjectId(site, PROJECT_ID);
    if (reloaded.status === "found") expect(reloaded.setup.status).toBe("confirmed");
  });

  it("rejects confirm before submit (invalid transition)", async () => {
    const { confirmProjectSetup, createProjectSetup } = await importRepository();
    await createProjectSetup(site, { projectId: PROJECT_ID });
    const result = await confirmProjectSetup(site, PROJECT_ID);
    expect(result.status).toBe("error");
  });

  it("reopen sets status back to in_progress and stamps reopenedAt", async () => {
    const { confirmProjectSetup, createProjectSetup, reopenProjectSetup, submitProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");
    await submitProjectSetup(created.rawToken, "client");
    await confirmProjectSetup(site, PROJECT_ID);

    const reopened = await reopenProjectSetup(site, PROJECT_ID);
    expect(reopened.status).toBe("success");
    if (reopened.status === "success") {
      expect(reopened.setup.status).toBe("in_progress");
      expect(reopened.setup.reopenedAt).not.toBeNull();
    }
  });
});

describe("revoke + reopen interaction", () => {
  it("reopening a revoked, submitted Setup does not restore access", async () => {
    const { createProjectSetup, getProjectSetupByRawToken, reopenProjectSetup, revokeProjectSetupAccess, submitProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");

    await submitProjectSetup(created.rawToken, "client");
    await revokeProjectSetupAccess(site, PROJECT_ID);

    const revokedLookup = await getProjectSetupByRawToken(created.rawToken);
    expect(revokedLookup.status).toBe("revoked");

    const reopened = await reopenProjectSetup(site, PROJECT_ID);
    expect(reopened.status).toBe("success");
    if (reopened.status === "success") {
      expect(reopened.setup.status).toBe("in_progress");
      expect(reopened.setup.accessRevokedAt).not.toBeNull();
    }

    // The old link must still be rejected as revoked after reopening — reopening the
    // Setup's status must never silently restore a previously revoked link.
    const stillRevokedLookup = await getProjectSetupByRawToken(created.rawToken);
    expect(stillRevokedLookup.status).toBe("revoked");
  });
});

describe("saveProjectSetupDraft", () => {
  it("preserves prior lifecycle fields when saving a new draft", async () => {
    const { createProjectSetup, saveProjectSetupDraft, startProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");
    await startProjectSetup(created.rawToken);

    const saved = await saveProjectSetupDraft(created.rawToken, { timeline: "Flexible" });
    expect(saved.status).toBe("success");
    if (saved.status === "success") {
      expect(saved.view.startedAt).not.toBeNull();
      expect(saved.view.status).toBe("in_progress");
      expect(saved.view.responses).toEqual({ timeline: "Flexible" });
    }
  });

  it("rejects further draft saves once submitted", async () => {
    const { createProjectSetup, saveProjectSetupDraft, submitProjectSetup } = await importRepository();
    const created = await createProjectSetup(site, { projectId: PROJECT_ID });
    if (created.status !== "created") throw new Error("setup not created");
    await submitProjectSetup(created.rawToken, "client");

    const result = await saveProjectSetupDraft(created.rawToken, { timeline: "ASAP" });
    expect(result.status).toBe("error");
  });
});
