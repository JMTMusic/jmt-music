import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A minimal in-memory fake for the subset of the Supabase query builder this repository
 * actually calls — same shape as lib/content/repository.test.ts's fake, reused rather than
 * reinvented: `.from().select().eq().order()` for lists, `.maybeSingle()`/`.single()` for
 * single-row reads/writes, `.insert()`, `.update()`.
 */
type Row = Record<string, unknown>;

class FakeQueryBuilder {
  private filters: Array<[string, unknown]> = [];
  private pendingInsert: Row | null = null;
  private pendingUpdate: Row | null = null;
  private orderColumn: string | null = null;
  private orderAscending = true;

  constructor(
    private readonly table: Row[],
    private readonly defaults: Row = {},
    private readonly idPrefix = "row"
  ) {}

  select(_columns: string) {
    return this;
  }

  eq(key: string, value: unknown) {
    this.filters.push([key, value]);
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.orderAscending = opts?.ascending ?? true;
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
    const now = new Date().toISOString();
    const row: Row = {
      id: `${this.idPrefix}-${this.table.length + 1}`,
      created_at: now,
      updated_at: now,
      ...this.defaults,
      ...this.pendingInsert
    };
    this.table.push(row);
    return { data: { ...row }, error: null };
  }

  private doUpdate() {
    const matched = this.table.filter((row) => this.matches(row));
    for (const row of matched) Object.assign(row, this.pendingUpdate);
    if (!matched.length) return { data: null, error: { message: "no matching row" } };
    return { data: { ...matched[0] }, error: null };
  }

  private resultRows(): Row[] {
    let rows = this.table.filter((row) => this.matches(row));
    if (this.orderColumn) {
      const column = this.orderColumn;
      rows = [...rows].sort((a, b) => {
        const av = String(a[column] ?? "");
        const bv = String(b[column] ?? "");
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return this.orderAscending ? cmp : -cmp;
      });
    }
    return rows.map((row) => ({ ...row }));
  }

  async maybeSingle() {
    if (this.pendingInsert) return this.doInsert();
    if (this.pendingUpdate) return this.doUpdate();
    const rows = this.resultRows();
    return { data: rows[0] || null, error: null };
  }

  async single() {
    if (this.pendingInsert) return this.doInsert();
    if (this.pendingUpdate) return this.doUpdate();
    const rows = this.resultRows();
    if (rows.length !== 1) return { data: null, error: { message: "expected exactly one row" } };
    return { data: rows[0], error: null };
  }

  then(resolve: (value: { data: Row[]; error: null }) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve({ data: this.resultRows(), error: null }).then(resolve, reject);
  }
}

class FakeDb {
  tables: Record<string, Row[]> = { properties: [], clients: [], projects: [], sales_opportunities: [] };
  // Mirrors the migration's own column defaults for anything createSalesOpportunity's
  // INSERT doesn't explicitly set.
  private defaults: Record<string, Row> = {
    sales_opportunities: { status: "new_lead", probability: "medium", currency: "USD", client_id: null, converted_project_id: null, converted_client_id: null }
  };

  from(name: string) {
    if (!this.tables[name]) this.tables[name] = [];
    return new FakeQueryBuilder(this.tables[name], this.defaults[name] || {}, name);
  }

  seedProperty(id: string, slug: string) {
    this.tables.properties.push({ id, slug });
  }

  seedClient(id: string, propertyId: string) {
    this.tables.clients.push({ id, property_id: propertyId });
  }
}

let db = new FakeDb();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => db
}));

const site = { id: "jmt-music", name: "JMT Music", domain: "jmtmusic.studio", connected: true, initials: "JM" } as never;
const otherSite = { id: "jonathan-tripp", name: "Jonathan Tripp", domain: "jonathan-tripp.com", connected: false, initials: "JT" } as never;

const PROPERTY_ID = "property-1";
const OTHER_PROPERTY_ID = "property-2";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_PROPERTY_CLIENT_ID = "33333333-3333-4333-8333-333333333333";

const BASE_INPUT = {
  title: "Ambient Pop Production, Mixing & Mastering",
  artistName: "Unknown Artist",
  platform: "airgigs",
  serviceType: "production_mix_master"
};

async function importRepository() {
  return import("./repository");
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty(PROPERTY_ID, "jmt-music");
  db.seedProperty(OTHER_PROPERTY_ID, "jonathan-tripp");
  db.seedClient(CLIENT_ID, PROPERTY_ID);
  db.seedClient(OTHER_PROPERTY_CLIENT_ID, OTHER_PROPERTY_ID);
});

describe("createSalesOpportunity", () => {
  it("creates an opportunity starting at status 'new_lead' regardless of what's requested", async () => {
    const { createSalesOpportunity } = await importRepository();
    const result = await createSalesOpportunity(site, BASE_INPUT);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.opportunity.status).toBe("new_lead");
    expect(result.opportunity.propertyId).toBe(PROPERTY_ID);
    expect(result.opportunity.convertedProjectId).toBeNull();
    expect(result.opportunity.convertedClientId).toBeNull();
  });

  it("rejects invalid input before ever touching the database", async () => {
    const { createSalesOpportunity } = await importRepository();
    const result = await createSalesOpportunity(site, { ...BASE_INPUT, title: "" });
    expect(result.status).toBe("error");
  });

  it("links a valid clientId from the same property", async () => {
    const { createSalesOpportunity } = await importRepository();
    const result = await createSalesOpportunity(site, { ...BASE_INPUT, clientId: CLIENT_ID });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.opportunity.clientId).toBe(CLIENT_ID);
  });

  it("rejects a clientId that belongs to a different property", async () => {
    const { createSalesOpportunity } = await importRepository();
    const result = await createSalesOpportunity(site, { ...BASE_INPUT, clientId: OTHER_PROPERTY_CLIENT_ID });
    expect(result.status).toBe("error");
  });
});

describe("updateSalesOpportunity — general edit", () => {
  it("applies only the fields supplied, leaving everything else unchanged", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, { ...BASE_INPUT, genre: "Electronic Pop" });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { title: "Updated Title" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.title).toBe("Updated Title");
    expect(updated.opportunity.genre).toBe("Electronic Pop");
    expect(updated.opportunity.artistName).toBe(BASE_INPUT.artistName);
  });

  it("anchors a bare date-only follow_up_at/proposal_sent_at to noon UTC through the full update path", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { followUpAt: "2026-07-16", proposalSentAt: "2026-07-12" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.followUpAt).toBe("2026-07-16T12:00:00.000Z");
    expect(updated.opportunity.proposalSentAt).toBe("2026-07-12T12:00:00.000Z");
  });

  it("links to an existing client from the same property", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { clientId: CLIENT_ID });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.clientId).toBe(CLIENT_ID);
  });

  it("rejects a clientId belonging to a different property (client ownership validation)", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { clientId: OTHER_PROPERTY_CLIENT_ID });
    expect(updated.status).toBe("error");

    // Confirm the rejected update did not partially apply — clientId is still unset.
    const { getSalesOpportunityById } = await importRepository();
    const lookup = await getSalesOpportunityById(site, created.opportunity.id);
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.opportunity.clientId).toBeNull();
  });

  it("clears clientId when explicitly set to null", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, { ...BASE_INPUT, clientId: CLIENT_ID });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { clientId: null });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.clientId).toBeNull();
  });

  it("preserves conversion IDs: a raw payload attempting to smuggle status/convertedProjectId/convertedClientId never changes them", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, {
      title: "Still editable",
      status: "converted",
      convertedProjectId: "11111111-1111-4111-8111-111111111111",
      convertedClientId: CLIENT_ID
    });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.title).toBe("Still editable");
    expect(updated.opportunity.status).toBe("new_lead");
    expect(updated.opportunity.convertedProjectId).toBeNull();
    expect(updated.opportunity.convertedClientId).toBeNull();
  });

  it("updates a lost reason", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(site, created.opportunity.id, { lostReason: "Budget too low" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.lostReason).toBe("Budget too low");
  });

  it("rejects updating an opportunity that belongs to a different property", async () => {
    const { createSalesOpportunity, updateSalesOpportunity } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunity(otherSite, created.opportunity.id, { title: "Cross-property attempt" });
    expect(updated.status).toBe("error");
  });
});

describe("updateSalesOpportunityStatus — converted-status protection", () => {
  it("moves between selectable statuses freely (permissive, any-to-any)", async () => {
    const { createSalesOpportunity, updateSalesOpportunityStatus } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunityStatus(site, created.opportunity.id, "won");
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.opportunity.status).toBe("won");
  });

  it("refuses to set status to 'converted' directly — only markSalesOpportunityConverted may do that", async () => {
    const { createSalesOpportunity, updateSalesOpportunityStatus } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunityStatus(site, created.opportunity.id, "converted");
    expect(updated.status).toBe("error");

    const { getSalesOpportunityById } = await importRepository();
    const lookup = await getSalesOpportunityById(site, created.opportunity.id);
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.opportunity.status).toBe("new_lead");
  });

  it("rejects an unrecognized status string", async () => {
    const { createSalesOpportunity, updateSalesOpportunityStatus } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunityStatus(site, created.opportunity.id, "in_escrow");
    expect(updated.status).toBe("error");
  });

  it("rejects a status change for an opportunity in a different property", async () => {
    const { createSalesOpportunity, updateSalesOpportunityStatus } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateSalesOpportunityStatus(otherSite, created.opportunity.id, "won");
    expect(updated.status).toBe("error");
  });
});

describe("markSalesOpportunityConverted", () => {
  it("sets status to converted and records both conversion ids", async () => {
    const { createSalesOpportunity, markSalesOpportunityConverted } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const projectId = "11111111-1111-4111-8111-111111111111";
    const marked = await markSalesOpportunityConverted(site, created.opportunity.id, projectId, CLIENT_ID);
    expect(marked.status).toBe("success");
    if (marked.status !== "success") throw new Error("expected success");
    expect(marked.opportunity.status).toBe("converted");
    expect(marked.opportunity.convertedProjectId).toBe(projectId);
    expect(marked.opportunity.convertedClientId).toBe(CLIENT_ID);
  });

  it("prevents a duplicate conversion once converted_project_id is already set", async () => {
    const { createSalesOpportunity, markSalesOpportunityConverted } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const firstProjectId = "11111111-1111-4111-8111-111111111111";
    const secondProjectId = "44444444-4444-4444-8444-444444444444";
    const first = await markSalesOpportunityConverted(site, created.opportunity.id, firstProjectId, CLIENT_ID);
    expect(first.status).toBe("success");

    const second = await markSalesOpportunityConverted(site, created.opportunity.id, secondProjectId, CLIENT_ID);
    expect(second.status).toBe("error");

    const { getSalesOpportunityById } = await importRepository();
    const lookup = await getSalesOpportunityById(site, created.opportunity.id);
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.opportunity.convertedProjectId).toBe(firstProjectId);
  });
});

describe("property scoping", () => {
  it("does not return another property's opportunity by id", async () => {
    const { createSalesOpportunity, getSalesOpportunityById } = await importRepository();
    const created = await createSalesOpportunity(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const lookup = await getSalesOpportunityById(otherSite, created.opportunity.id);
    expect(lookup.status).toBe("not_found");
  });

  it("listSalesOpportunities only returns opportunities for the requested property", async () => {
    const { createSalesOpportunity, listSalesOpportunities } = await importRepository();
    await createSalesOpportunity(site, { ...BASE_INPUT, title: "Property A opportunity" });
    await createSalesOpportunity(otherSite, { ...BASE_INPUT, title: "Property B opportunity" });

    const resultA = await listSalesOpportunities(site);
    expect(resultA.opportunities).toHaveLength(1);
    expect(resultA.opportunities[0].title).toBe("Property A opportunity");

    const resultB = await listSalesOpportunities(otherSite);
    expect(resultB.opportunities).toHaveLength(1);
    expect(resultB.opportunities[0].title).toBe("Property B opportunity");
  });
});
