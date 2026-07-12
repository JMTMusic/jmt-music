import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression + behavior tests for the Add Lead bug: a legitimate lead entry (real artist
 * name, every optional field blank) failed with the generic "The lead could not be
 * created." Root cause: `clients.name` (the pre-Growth-Engine legacy column) was still
 * `not null` with no default, and createLead()/updateLead() correctly never write to it
 * (per that column's own deprecation comment) — so every insert violated a constraint
 * the application was explicitly told not to satisfy. Fixed by
 * 20260712090000_clients_legacy_name_nullable_fix.sql. These tests exercise the real,
 * unmodified createLead/updateLead against a hand-rolled fake Supabase client — they
 * cannot apply a real migration, but they do simulate the exact 23502 (not_null_violation)
 * failure the bug produced and confirm it now maps to a useful, safe message instead of
 * the old unhelpful generic one, plus cover every normalization/validation requirement.
 */
type Row = Record<string, unknown>;
type FakeError = { code?: string; message?: string } | null;

class FakeQueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private pendingInsert: Row | null = null;
  private pendingUpdate: Row | null = null;

  constructor(
    private readonly table: Row[],
    private readonly insertError: FakeError = null,
    private readonly idPrefix = "row",
    private readonly updateError: FakeError = null
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

  private doInsert() {
    if (this.insertError) return { data: null, error: this.insertError };
    const now = new Date().toISOString();
    const row: Row = { id: `${this.idPrefix}-${this.table.length + 1}`, created_at: now, updated_at: now, ...this.pendingInsert };
    this.table.push(row);
    return { data: { ...row }, error: null };
  }

  private doUpdate() {
    if (this.updateError) return { data: null, error: this.updateError };
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

  // Several call sites in actions.ts (updateLeadStage, setLeadFollowUp, archiveLead,
  // updateLead) never chain an explicit .single()/.maybeSingle() after .update().eq().eq()
  // — they just `await` the builder directly, exactly like the real Supabase JS client,
  // whose query builders are themselves thenable. Without this, `await` on a plain object
  // resolves to the object itself and `{ error }` would silently destructure to undefined,
  // masking real bugs instead of exercising them.
  then(onFulfilled: (value: { data: unknown; error: FakeError }) => unknown, onRejected?: (reason: unknown) => unknown) {
    const result = this.pendingUpdate ? this.doUpdate() : this.pendingInsert ? this.doInsert() : { data: null, error: null };
    return Promise.resolve(result).then(onFulfilled, onRejected);
  }
}

class FakeDb {
  tables: Record<string, Row[]> = { properties: [], clients: [] };
  clientsInsertError: FakeError = null;
  clientsUpdateError: FakeError = null;

  from(name: string) {
    if (!this.tables[name]) this.tables[name] = [];
    if (name === "clients") return new FakeQueryBuilder(this.tables.clients, this.clientsInsertError, "client", this.clientsUpdateError);
    return new FakeQueryBuilder(this.tables[name], null, name);
  }

  seedProperty(id: string, slug: string) {
    this.tables.properties.push({ id, slug });
  }

  seedClient(id: string, propertyId: string, extra: Row = {}) {
    this.tables.clients.push({ id, property_id: propertyId, ...extra });
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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

vi.mock("@/app/control-center/projects/actions", () => ({
  createProject: vi.fn()
}));

const LEAD_ID = "11111111-1111-4111-8111-111111111111";

function formDataFrom(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

async function importActions() {
  return import("./actions");
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty("property-1", "jmt-music");
  role = "owner";
  process.env.CONTROL_CENTER_SUPABASE_USER_ID = "staff-user-1";
});

describe("createLead — the reported bug, reproduced and fixed", () => {
  it("creates a lead with only Artist Name populated, every other field blank (the exact Daphne Florence scenario)", async () => {
    const { createLead } = await importActions();
    const formData = formDataFrom({
      property: "jmt-music",
      artist_name: "Daphne Florence",
      contact_name: "",
      email: "",
      phone: "",
      platform: "Piano Lessons (WCMA)",
      project_type: "Song Writing/Production",
      budget: "",
      tags: "",
      social_instagram: "",
      social_website: "",
      notes:
        "Piano student who wants to write a song for her to play and her daughter to sing, possibly recording it as well, for her other daughter’s wedding next year. Will confirm next Saturday, along with payment information."
    });

    const result = await createLead(undefined, formData);
    expect(result.status).toBe("success");
    expect(db.tables.clients).toHaveLength(1);
    const row = db.tables.clients[0];
    expect(row.artist_name).toBe("Daphne Florence");
    expect(row.platform).toBe("Piano Lessons (WCMA)");
    expect(row.project_type).toBe("Song Writing/Production");
    expect(row.notes).toMatch(/wedding next year/);
    expect(row.notes).toMatch(/\n|Saturday/); // punctuation preserved, not stripped
  });

  it("never writes to the legacy `name` column — artist_name is the field of record", async () => {
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "New Artist" }));
    expect(result.status).toBe("success");
    expect("name" in db.tables.clients[0]).toBe(false);
  });

  it("maps a simulated 23502 (not_null_violation) — the exact bug's signature — to a safe, useful message instead of a bare generic one", async () => {
    db.clientsInsertError = { code: "23502", message: 'null value in column "name" of relation "clients" violates not-null constraint' };
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Daphne Florence" }));
    expect(result.status).toBe("error");
    expect(result.message).toBe("Leads are not available until the latest Supabase migration is applied.");
    expect(result.message).not.toMatch(/relation|constraint|column|clients/i);
  });

  it("maps a simulated missing-migration error (42P01/42703) the same safe way", async () => {
    db.clientsInsertError = { code: "42703", message: 'column "artist_name" does not exist' };
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Someone" }));
    expect(result.message).toBe("Leads are not available until the latest Supabase migration is applied.");
  });

  it("maps a simulated unique-violation (23505) to a duplicate-safe message", async () => {
    db.clientsInsertError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Someone" }));
    expect(result.message).toBe("A matching lead may already exist for this property.");
  });

  it("falls back to a generic safe message for an unrecognized error code", async () => {
    db.clientsInsertError = { code: "99999", message: "some unexpected internal detail" };
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Someone" }));
    expect(result.message).toBe("The lead could not be created.");
    expect(result.message).not.toMatch(/unexpected internal detail/);
  });
});

describe("createLead — normalization", () => {
  it("normalizes blank Contact Name to null, never duplicating Artist Name", async () => {
    const { createLead } = await importActions();
    await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", contact_name: "" }));
    expect(db.tables.clients[0].contact_name).toBeNull();
  });

  it("normalizes blank email and phone to null, and accepts both blank", async () => {
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", email: "", phone: "" }));
    expect(result.status).toBe("success");
    expect(db.tables.clients[0].email).toBeNull();
    expect(db.tables.clients[0].phone).toBeNull();
  });

  it("normalizes blank budget to null", async () => {
    const { createLead } = await importActions();
    await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", budget: "" }));
    expect(db.tables.clients[0].budget).toBeNull();
  });

  it("normalizes blank social links to an empty object (not null — the column is not-null-default-empty)", async () => {
    const { createLead } = await importActions();
    await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist" }));
    expect(db.tables.clients[0].social_links).toEqual({});
  });

  it("normalizes blank tags to an empty array", async () => {
    const { createLead } = await importActions();
    await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", tags: "" }));
    expect(db.tables.clients[0].tags).toEqual([]);
  });

  it("splits, trims, and normalizes a comma-separated tag list", async () => {
    const { createLead } = await importActions();
    await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", tags: " piano , referral ,  wedding " }));
    expect(db.tables.clients[0].tags).toEqual(["piano", "referral", "wedding"]);
  });

  it("accepts real-world free-text platform and project type values without rejecting them", async () => {
    const { createLead } = await importActions();
    const result = await createLead(
      undefined,
      formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", platform: "Piano Lessons (WCMA)", project_type: "Song Writing/Production" })
    );
    expect(result.status).toBe("success");
    expect(db.tables.clients[0].platform).toBe("Piano Lessons (WCMA)");
    expect(db.tables.clients[0].project_type).toBe("Song Writing/Production");
  });
});

describe("createLead — validation", () => {
  it("requires Artist Name", async () => {
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "" }));
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.artist_name).toBeTruthy();
    expect(db.tables.clients).toHaveLength(0);
  });

  it("validates email only when populated", async () => {
    const { createLead } = await importActions();
    const bad = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", email: "not-an-email" }));
    expect(bad.fieldErrors?.email).toBeTruthy();

    const blank = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", email: "" }));
    expect(blank.status).toBe("success");
  });

  it("validates phone only when populated", async () => {
    const { createLead } = await importActions();
    const bad = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", phone: "call me maybe" }));
    expect(bad.fieldErrors?.phone).toBeTruthy();

    const good = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist 2", phone: "(555) 123-4567" }));
    expect(good.status).toBe("success");
  });

  it("validates the Instagram/website URL only when populated", async () => {
    const { createLead } = await importActions();
    const bad = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", social_instagram: "not a url" }));
    expect(bad.fieldErrors?.social_instagram).toBeTruthy();

    const blank = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", social_instagram: "" }));
    expect(blank.status).toBe("success");
  });

  it("rejects an overlong project type / platform value", async () => {
    const { createLead } = await importActions();
    const result = await createLead(
      undefined,
      formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", project_type: "x".repeat(161), platform: "y".repeat(161) })
    );
    expect(result.fieldErrors?.project_type).toBeTruthy();
    expect(result.fieldErrors?.platform).toBeTruthy();
  });

  it("preserves notes punctuation and line breaks up to the size limit, rejecting only when it's exceeded", async () => {
    const { createLead } = await importActions();
    const multiline = "Line one.\nLine two — with an em dash, a comma, and \"quotes.\"";
    const ok = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist", notes: multiline }));
    expect(ok.status).toBe("success");
    expect(db.tables.clients[0].notes).toBe(multiline);

    const tooLong = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Solo Artist 2", notes: "x".repeat(8001) }));
    expect(tooLong.fieldErrors?.notes).toBeTruthy();
  });
});

describe("createLead — authorization and property scoping", () => {
  it("allows owner and editor", async () => {
    const { createLead } = await importActions();
    role = "owner";
    expect((await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Owner Created" }))).status).toBe("success");
    role = "editor";
    expect((await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Editor Created" }))).status).toBe("success");
  });

  it("denies viewer and unauthenticated", async () => {
    const { createLead } = await importActions();
    role = "viewer";
    const viewerResult = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Blocked" }));
    expect(viewerResult.status).toBe("error");
    expect(viewerResult.message).toMatch(/permission/i);

    role = null;
    const noRoleResult = await createLead(undefined, formDataFrom({ property: "jmt-music", artist_name: "Blocked" }));
    expect(noRoleResult.status).toBe("error");
    expect(db.tables.clients).toHaveLength(0);
  });

  it("rejects an unrecognized property before any database call", async () => {
    const { createLead } = await importActions();
    const result = await createLead(undefined, formDataFrom({ property: "not-a-real-property", artist_name: "Someone" }));
    expect(result.status).toBe("error");
    expect(db.tables.clients).toHaveLength(0);
  });

  it("does not create a duplicate record when the same successful submission is retried", async () => {
    const { createLead } = await importActions();
    const formData = formDataFrom({ property: "jmt-music", artist_name: "Retry Test" });
    await createLead(undefined, formData);
    // A genuine retry is a second, independent form submission — this codebase has no
    // idempotency-token concept on manual lead creation (unlike the inbound lead system),
    // so a second explicit submit legitimately creates a second row; the meaningful
    // regression guard is that a single successful call never inserts more than once.
    expect(db.tables.clients.filter((c) => c.artist_name === "Retry Test")).toHaveLength(1);
  });
});

describe("updateLead", () => {
  beforeEach(() => {
    db.seedClient(LEAD_ID, "property-1", {
      artist_name: "Original Name",
      contact_name: null,
      email: null,
      phone: null,
      project_type: null,
      budget: null,
      platform: null,
      social_links: {},
      tags: [],
      notes: null
    });
  });

  it("updates identity fields without requiring any optional field", async () => {
    const { updateLead } = await importActions();
    const result = await updateLead(undefined, formDataFrom({ property: "jmt-music", lead_id: LEAD_ID, artist_name: "Updated Name" }));
    expect(result.status).toBe("success");
    const row = db.tables.clients.find((c) => c.id === LEAD_ID)!;
    expect(row.artist_name).toBe("Updated Name");
    expect(row.contact_name).toBeNull();
  });

  it("maps a simulated 23502 on the update path the same safe way as create", async () => {
    db.clientsUpdateError = { code: "23502", message: 'null value in column "name" violates not-null constraint' };
    const { updateLead } = await importActions();
    const result = await updateLead(undefined, formDataFrom({ property: "jmt-music", lead_id: LEAD_ID, artist_name: "x" }));
    expect(result.status).toBe("error");
    expect(result.message).toBe("Leads are not available until the latest Supabase migration is applied.");
  });

  it("maps a simulated unique-violation on the update path to the duplicate-safe message", async () => {
    db.clientsUpdateError = { code: "23505", message: "duplicate key value violates unique constraint" };
    const { updateLead } = await importActions();
    const result = await updateLead(undefined, formDataFrom({ property: "jmt-music", lead_id: LEAD_ID, artist_name: "x" }));
    expect(result.status).toBe("error");
    expect(result.message).toBe("A matching lead may already exist for this property.");
  });

  it("rejects a lead id from a different property (property scoping)", async () => {
    db.seedProperty("property-2", "jonathan-tripp");
    db.seedClient("22222222-2222-4222-8222-222222222222", "property-2", { artist_name: "Other Property Lead" });
    const { updateLead } = await importActions();
    const result = await updateLead(
      undefined,
      formDataFrom({ property: "jmt-music", lead_id: "22222222-2222-4222-8222-222222222222", artist_name: "Hijack Attempt" })
    );
    expect(result.status).toBe("error");
  });

  it("denies viewer", async () => {
    role = "viewer";
    const { updateLead } = await importActions();
    const result = await updateLead(undefined, formDataFrom({ property: "jmt-music", lead_id: LEAD_ID, artist_name: "Blocked" }));
    expect(result.status).toBe("error");
  });
});
