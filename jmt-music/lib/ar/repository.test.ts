import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Same minimal in-memory fake as lib/sales/repository.test.ts — the subset of the Supabase
 * query builder this repository actually calls: `.from().select().eq().order()` for lists,
 * `.maybeSingle()`/`.single()` for single-row reads/writes, `.insert()`, `.update()`.
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
  tables: Record<string, Row[]> = { properties: [], clients: [], ar_artists: [] };
  private defaults: Record<string, Row> = {
    ar_artists: { status: "discovered", priority: "medium", fit_score: null, fit_score_overridden: false, related_client_id: null, related_sales_opportunity_id: null }
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
  artistName: "Coastal Lights",
  primaryPlatform: "instagram"
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

describe("createArArtist", () => {
  it("creates an artist starting at status 'discovered' regardless of what's requested", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, BASE_INPUT);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.status).toBe("discovered");
    expect(result.artist.propertyId).toBe(PROPERTY_ID);
    expect(result.artist.relatedSalesOpportunityId).toBeNull();
  });

  it("rejects invalid input before ever touching the database (no platform or source)", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { artistName: "No Source Artist" });
    expect(result.status).toBe("error");
  });

  it("computes fit_score from whichever categories are provided", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { ...BASE_INPUT, fitGenreScore: 4, fitMusicalInterestScore: 4 });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.fitScore).toBe(4);
    expect(result.artist.fitScoreOverridden).toBe(false);
  });

  it("stores a manual fit score override, flagged as overridden, even with no categories scored", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { ...BASE_INPUT, fitScoreOverride: 3.5 });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.fitScore).toBe(3.5);
    expect(result.artist.fitScoreOverridden).toBe(true);
  });

  it("leaves fit_score null when no categories or override are provided — not yet reviewed", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, BASE_INPUT);
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.fitScore).toBeNull();
  });

  it("links a valid relatedClientId from the same property", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { ...BASE_INPUT, relatedClientId: CLIENT_ID });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.relatedClientId).toBe(CLIENT_ID);
  });

  it("rejects a relatedClientId belonging to a different property (client ownership validation)", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { ...BASE_INPUT, relatedClientId: OTHER_PROPERTY_CLIENT_ID });
    expect(result.status).toBe("error");
  });

  it("anchors a bare date-only nextReviewAt to noon UTC through the full create path", async () => {
    const { createArArtist } = await importRepository();
    const result = await createArArtist(site, { ...BASE_INPUT, nextReviewAt: "2026-07-16" });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.artist.nextReviewAt).toBe("2026-07-16T12:00:00.000Z");
  });
});

describe("updateArArtist — general edit and fit-score recompute", () => {
  it("applies only the fields supplied, leaving everything else unchanged", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, { ...BASE_INPUT, genre: "Indie Pop" });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, { artistName: "Renamed Artist" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.artistName).toBe("Renamed Artist");
    expect(updated.artist.genre).toBe("Indie Pop");
  });

  it("recomputes fit_score from merged existing+new category values when a category is touched", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, { ...BASE_INPUT, fitGenreScore: 4 });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, { fitMusicalInterestScore: 2 });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.fitScore).toBe(3);
    expect(updated.artist.fitScoreOverridden).toBe(false);
  });

  it("stores a manual override and marks it overridden, taking precedence over the computed value", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, { ...BASE_INPUT, fitGenreScore: 4, fitMusicalInterestScore: 4 });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, { fitScoreOverride: 2 });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.fitScore).toBe(2);
    expect(updated.artist.fitScoreOverridden).toBe(true);
  });

  it("clears an override back to computed via clearFitScoreOverride", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, { ...BASE_INPUT, fitGenreScore: 4, fitScoreOverride: 1 });
    if (created.status !== "success") throw new Error("expected success");
    expect(created.artist.fitScoreOverridden).toBe(true);

    const updated = await updateArArtist(site, created.artist.id, { clearFitScoreOverride: true });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.fitScore).toBe(4);
    expect(updated.artist.fitScoreOverridden).toBe(false);
  });

  it("leaves fit_score entirely untouched on a plain metadata edit that doesn't mention scores", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, { ...BASE_INPUT, fitScoreOverride: 4.5 });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, { location: "Austin, TX" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.fitScore).toBe(4.5);
    expect(updated.artist.fitScoreOverridden).toBe(true);
  });

  it("preserves protected fields: a raw payload attempting to smuggle status/relatedSalesOpportunityId never changes them", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, {
      artistName: "Still editable",
      status: "converted",
      relatedSalesOpportunityId: "11111111-1111-4111-8111-111111111111"
    });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.artistName).toBe("Still editable");
    expect(updated.artist.status).toBe("discovered");
    expect(updated.artist.relatedSalesOpportunityId).toBeNull();
  });

  it("rejects a relatedClientId belonging to a different property, without partially applying the update", async () => {
    const { createArArtist, updateArArtist, getArArtistById } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(site, created.artist.id, { relatedClientId: OTHER_PROPERTY_CLIENT_ID, artistName: "Should Not Apply" });
    expect(updated.status).toBe("error");

    const lookup = await getArArtistById(site, created.artist.id);
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.artist.relatedClientId).toBeNull();
    expect(lookup.artist.artistName).toBe(BASE_INPUT.artistName);
  });

  it("rejects updating an artist that belongs to a different property", async () => {
    const { createArArtist, updateArArtist } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtist(otherSite, created.artist.id, { artistName: "Cross-property attempt" });
    expect(updated.status).toBe("error");
  });
});

describe("updateArArtistStatus — converted-status protection", () => {
  it("moves between selectable statuses freely (permissive, any-to-any)", async () => {
    const { createArArtist, updateArArtistStatus } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtistStatus(site, created.artist.id, "watchlist");
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.artist.status).toBe("watchlist");
  });

  it("refuses to set status to 'converted' directly — only markArArtistConverted may do that", async () => {
    const { createArArtist, updateArArtistStatus, getArArtistById } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtistStatus(site, created.artist.id, "converted");
    expect(updated.status).toBe("error");

    const lookup = await getArArtistById(site, created.artist.id);
    if (lookup.status !== "found") throw new Error("expected found");
    expect(lookup.artist.status).toBe("discovered");
  });

  it("rejects an unrecognized status string", async () => {
    const { createArArtist, updateArArtistStatus } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtistStatus(site, created.artist.id, "signed");
    expect(updated.status).toBe("error");
  });

  it("rejects a status change for an artist in a different property", async () => {
    const { createArArtist, updateArArtistStatus } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateArArtistStatus(otherSite, created.artist.id, "watchlist");
    expect(updated.status).toBe("error");
  });
});

describe("markArArtistConverted", () => {
  it("sets status to converted and records related_sales_opportunity_id and related_client_id", async () => {
    const { createArArtist, markArArtistConverted } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const opportunityId = "11111111-1111-4111-8111-111111111111";
    const marked = await markArArtistConverted(site, created.artist.id, opportunityId, CLIENT_ID, false);
    expect(marked.status).toBe("success");
    if (marked.status !== "success") throw new Error("expected success");
    expect(marked.artist.status).toBe("converted");
    expect(marked.artist.relatedSalesOpportunityId).toBe(opportunityId);
    expect(marked.artist.relatedClientId).toBe(CLIENT_ID);
  });

  it("keeps the artist on the watchlist instead of converted when keepOnWatchlist is true", async () => {
    const { createArArtist, markArArtistConverted } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const opportunityId = "11111111-1111-4111-8111-111111111111";
    const marked = await markArArtistConverted(site, created.artist.id, opportunityId, CLIENT_ID, true);
    expect(marked.status).toBe("success");
    if (marked.status !== "success") throw new Error("expected success");
    expect(marked.artist.status).toBe("watchlist");
    expect(marked.artist.relatedSalesOpportunityId).toBe(opportunityId);
  });

  it("does not hard-block a second conversion — the soft confirm-to-override decision lives in the action layer, not here", async () => {
    const { createArArtist, markArArtistConverted } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const firstOpportunityId = "11111111-1111-4111-8111-111111111111";
    const secondOpportunityId = "44444444-4444-4444-8444-444444444444";
    const first = await markArArtistConverted(site, created.artist.id, firstOpportunityId, CLIENT_ID, false);
    expect(first.status).toBe("success");

    const second = await markArArtistConverted(site, created.artist.id, secondOpportunityId, CLIENT_ID, false);
    expect(second.status).toBe("success");
    if (second.status !== "success") throw new Error("expected success");
    expect(second.artist.relatedSalesOpportunityId).toBe(secondOpportunityId);
  });

  it("preserves the complete A&R research record after conversion", async () => {
    const { createArArtist, markArArtistConverted } = await importRepository();
    const created = await createArArtist(site, {
      ...BASE_INPUT,
      fitGenreScore: 5,
      fitSummary: "Strong catalog fit.",
      strengths: "Consistent release cadence.",
      discoveryNotes: "Found via a referral from an existing client."
    });
    if (created.status !== "success") throw new Error("expected success");

    const marked = await markArArtistConverted(site, created.artist.id, "11111111-1111-4111-8111-111111111111", CLIENT_ID, false);
    expect(marked.status).toBe("success");
    if (marked.status !== "success") throw new Error("expected success");
    expect(marked.artist.fitSummary).toBe("Strong catalog fit.");
    expect(marked.artist.strengths).toBe("Consistent release cadence.");
    expect(marked.artist.discoveryNotes).toBe("Found via a referral from an existing client.");
    expect(marked.artist.fitScore).toBe(5);
  });
});

describe("property scoping", () => {
  it("does not return another property's artist by id", async () => {
    const { createArArtist, getArArtistById } = await importRepository();
    const created = await createArArtist(site, BASE_INPUT);
    if (created.status !== "success") throw new Error("expected success");

    const lookup = await getArArtistById(otherSite, created.artist.id);
    expect(lookup.status).toBe("not_found");
  });

  it("listArArtists only returns artists for the requested property", async () => {
    const { createArArtist, listArArtists } = await importRepository();
    await createArArtist(site, { ...BASE_INPUT, artistName: "Property A Artist" });
    await createArArtist(otherSite, { ...BASE_INPUT, artistName: "Property B Artist" });

    const resultA = await listArArtists(site);
    expect(resultA.artists).toHaveLength(1);
    expect(resultA.artists[0].artistName).toBe("Property A Artist");

    const resultB = await listArArtists(otherSite);
    expect(resultB.artists).toHaveLength(1);
    expect(resultB.artists[0].artistName).toBe("Property B Artist");
  });
});
