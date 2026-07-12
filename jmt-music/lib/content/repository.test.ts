import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A minimal in-memory fake for the subset of the Supabase query builder this repository
 * actually calls — `.from().select().eq().order()` for lists, `.maybeSingle()`/`.single()`
 * for single-row reads/writes, `.insert()`, `.update()`. Unlike lib/project-setup's fake
 * (which never needs a genuine multi-row "list" query, since a Project has at most one
 * Setup), this repository's listContentItems awaits a builder directly after `.order()`
 * with no terminal `.single()`/`.maybeSingle()` call — so this fake's builder itself is
 * thenable, mirroring how the real supabase-js query builder is itself awaitable.
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

  /** Makes a plain `await query` (no `.single()`/`.maybeSingle()`) resolve — the path listContentItems actually uses. */
  then(resolve: (value: { data: Row[]; error: null }) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve({ data: this.resultRows(), error: null }).then(resolve, reject);
  }
}

class FakeDb {
  tables: Record<string, Row[]> = { properties: [], projects: [], clients: [], beats: [], content_items: [] };
  // Mirrors the migration's own column defaults for anything createContentItem's INSERT
  // doesn't explicitly set: `status` defaults to 'idea', `published_at` has no default
  // (null) and is only ever set by updateContentStatus.
  private defaults: Record<string, Row> = {
    content_items: { status: "idea", published_at: null }
  };

  from(name: string) {
    if (!this.tables[name]) this.tables[name] = [];
    return new FakeQueryBuilder(this.tables[name], this.defaults[name] || {}, name);
  }

  seedProperty(id: string, slug: string) {
    this.tables.properties.push({ id, slug });
  }

  seedProject(id: string, propertyId: string) {
    this.tables.projects.push({ id, property_id: propertyId });
  }

  seedClient(id: string, propertyId: string) {
    this.tables.clients.push({ id, property_id: propertyId });
  }

  seedBeat(id: string, propertyId: string) {
    this.tables.beats.push({ id, property_id: propertyId });
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
const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const BEAT_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_PROPERTY_PROJECT_ID = "44444444-4444-4444-8444-444444444444";

async function importRepository() {
  return import("./repository");
}

beforeEach(() => {
  db = new FakeDb();
  db.seedProperty(PROPERTY_ID, "jmt-music");
  db.seedProperty(OTHER_PROPERTY_ID, "jonathan-tripp");
  db.seedProject(PROJECT_ID, PROPERTY_ID);
  db.seedClient(CLIENT_ID, PROPERTY_ID);
  db.seedBeat(BEAT_ID, PROPERTY_ID);
  db.seedProject(OTHER_PROPERTY_PROJECT_ID, OTHER_PROPERTY_ID);
});

describe("createContentItem", () => {
  it("creates an item starting at status 'idea' regardless of what's requested", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, { title: "New reel idea" });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.item.status).toBe("idea");
    expect(result.item.title).toBe("New reel idea");
    expect(result.item.propertyId).toBe(PROPERTY_ID);
  });

  it("rejects an invalid input before ever touching the database", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, { title: "" });
    expect(result.status).toBe("error");
  });

  it("creates successfully with every optional relationship absent", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, { title: "Standalone idea" });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.item.projectId).toBeNull();
    expect(result.item.clientId).toBeNull();
    expect(result.item.beatId).toBeNull();
  });

  it("links a valid Project/Client/Beat from the same property", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, {
      title: "Client delivery highlight",
      projectId: PROJECT_ID,
      clientId: CLIENT_ID,
      beatId: BEAT_ID
    });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.item.projectId).toBe(PROJECT_ID);
    expect(result.item.clientId).toBe(CLIENT_ID);
    expect(result.item.beatId).toBe(BEAT_ID);
  });

  it("rejects a Project id that belongs to a different property", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, { title: "Cross-property attempt", projectId: OTHER_PROPERTY_PROJECT_ID });
    expect(result.status).toBe("error");
  });

  it("accepts multiple platforms", async () => {
    const { createContentItem } = await importRepository();
    const result = await createContentItem(site, { title: "Multi-platform post", platforms: ["instagram_reel", "youtube_short", "tiktok"] });
    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.item.platforms).toEqual(["instagram_reel", "youtube_short", "tiktok"]);
  });
});

describe("property scoping", () => {
  it("does not return another property's content item by id", async () => {
    const { createContentItem, getContentItemById } = await importRepository();
    const created = await createContentItem(site, { title: "JMT Music only" });
    if (created.status !== "success") throw new Error("expected success");

    const lookup = await getContentItemById(otherSite, created.item.id);
    expect(lookup.status).toBe("not_found");
  });

  it("listContentItems only returns items for the requested property", async () => {
    const { createContentItem, listContentItems } = await importRepository();
    await createContentItem(site, { title: "Property A item" });
    await createContentItem(otherSite, { title: "Property B item" });

    const resultA = await listContentItems(site);
    expect(resultA.items).toHaveLength(1);
    expect(resultA.items[0].title).toBe("Property A item");

    const resultB = await listContentItems(otherSite);
    expect(resultB.items).toHaveLength(1);
    expect(resultB.items[0].title).toBe("Property B item");
  });
});

describe("updateContentItem — create/update behavior and protected fields", () => {
  it("updates only the fields supplied", async () => {
    const { createContentItem, updateContentItem } = await importRepository();
    const created = await createContentItem(site, { title: "Original title", notes: "original notes" });
    if (created.status !== "success") throw new Error("expected success");

    const updated = await updateContentItem(site, created.item.id, { title: "Updated title" });
    expect(updated.status).toBe("success");
    if (updated.status !== "success") throw new Error("expected success");
    expect(updated.item.title).toBe("Updated title");
    expect(updated.item.notes).toBe("original notes");
  });

  it("rejects updating an item that does not belong to the requested property", async () => {
    const { createContentItem, updateContentItem } = await importRepository();
    const created = await createContentItem(site, { title: "Property A item" });
    if (created.status !== "success") throw new Error("expected success");

    const result = await updateContentItem(otherSite, created.item.id, { title: "Hijacked" });
    expect(result.status).toBe("error");
  });

  it("protected field rejection: status and publishedAt in the payload never change the row", async () => {
    const { createContentItem, updateContentItem } = await importRepository();
    const created = await createContentItem(site, { title: "Still an idea" });
    if (created.status !== "success") throw new Error("expected success");

    const result = await updateContentItem(site, created.item.id, {
      title: "Still an idea, renamed",
      status: "published",
      publishedAt: "2020-01-01T00:00:00.000Z"
    } as Record<string, unknown>);

    expect(result.status).toBe("success");
    if (result.status !== "success") throw new Error("expected success");
    expect(result.item.status).toBe("idea");
    expect(result.item.publishedAt).toBeNull();
  });
});

describe("updateContentStatus", () => {
  it("moves through the documented forward pipeline", async () => {
    const { createContentItem, updateContentStatus } = await importRepository();
    const created = await createContentItem(site, { title: "Full pipeline run" });
    if (created.status !== "success") throw new Error("expected success");
    const id = created.item.id;

    for (const next of ["planned", "needs_filming", "needs_editing", "ready", "scheduled", "published"]) {
      const result = await updateContentStatus(site, id, next);
      expect(result.status).toBe("success");
      if (result.status !== "success") throw new Error(`expected success moving to ${next}`);
      expect(result.item.status).toBe(next);
    }
  });

  it("rejects an arbitrary transition", async () => {
    const { createContentItem, updateContentStatus } = await importRepository();
    const created = await createContentItem(site, { title: "Cannot skip ahead" });
    if (created.status !== "success") throw new Error("expected success");

    const result = await updateContentStatus(site, created.item.id, "published");
    expect(result.status).toBe("error");
  });

  it("rejects an unrecognized status value", async () => {
    const { createContentItem, updateContentStatus } = await importRepository();
    const created = await createContentItem(site, { title: "Bad status" });
    if (created.status !== "success") throw new Error("expected success");

    const result = await updateContentStatus(site, created.item.id, "not_a_real_status");
    expect(result.status).toBe("error");
  });

  it("sets publishedAt exactly once and never overwrites it on a later restore", async () => {
    const { createContentItem, updateContentStatus } = await importRepository();
    const created = await createContentItem(site, { title: "Publish once" });
    if (created.status !== "success") throw new Error("expected success");
    const id = created.item.id;

    let last = created;
    for (const next of ["planned", "ready", "published"]) {
      const result = await updateContentStatus(site, id, next);
      if (result.status !== "success") throw new Error(`expected success moving to ${next}`);
      last = result;
    }
    const firstPublishedAt = last.item.publishedAt;
    expect(firstPublishedAt).not.toBeNull();

    const archived = await updateContentStatus(site, id, "archived");
    expect(archived.status).toBe("success");
    if (archived.status !== "success") throw new Error("expected success");
    expect(archived.item.publishedAt).toBe(firstPublishedAt);

    const restored = await updateContentStatus(site, id, "published");
    expect(restored.status).toBe("success");
    if (restored.status !== "success") throw new Error("expected success");
    expect(restored.item.publishedAt).toBe(firstPublishedAt);
  });

  it("archived only restores to published, never anywhere else", async () => {
    const { createContentItem, updateContentStatus } = await importRepository();
    const created = await createContentItem(site, { title: "Archive and restore" });
    if (created.status !== "success") throw new Error("expected success");
    const id = created.item.id;

    for (const next of ["planned", "ready", "published", "archived"]) {
      const result = await updateContentStatus(site, id, next);
      expect(result.status).toBe("success");
    }

    const backToIdea = await updateContentStatus(site, id, "idea");
    expect(backToIdea.status).toBe("error");

    const restored = await updateContentStatus(site, id, "published");
    expect(restored.status).toBe("success");
  });
});

describe("archiveContentItem", () => {
  it("archives a published item", async () => {
    const { createContentItem, updateContentStatus, archiveContentItem } = await importRepository();
    const created = await createContentItem(site, { title: "Ready to archive" });
    if (created.status !== "success") throw new Error("expected success");
    const id = created.item.id;
    for (const next of ["planned", "ready", "published"]) await updateContentStatus(site, id, next);

    const archived = await archiveContentItem(site, id);
    expect(archived.status).toBe("success");
    if (archived.status !== "success") throw new Error("expected success");
    expect(archived.item.status).toBe("archived");
  });

  it("refuses to archive an item that has not been published", async () => {
    const { createContentItem, archiveContentItem } = await importRepository();
    const created = await createContentItem(site, { title: "Just an idea" });
    if (created.status !== "success") throw new Error("expected success");

    const result = await archiveContentItem(site, created.item.id);
    expect(result.status).toBe("error");
  });
});

describe("getContentAttentionCounts", () => {
  it("reflects the current mix of statuses for one property only", async () => {
    const { createContentItem, updateContentStatus, getContentAttentionCounts } = await importRepository();
    const a = await createContentItem(site, { title: "Idea A" });
    const b = await createContentItem(site, { title: "Idea B" });
    if (a.status !== "success" || b.status !== "success") throw new Error("expected success");
    await updateContentStatus(site, b.item.id, "planned");
    await createContentItem(otherSite, { title: "Other property idea" });

    const counts = await getContentAttentionCounts(site);
    expect(counts.counts.idea).toBe(1);
    expect(counts.counts.planned).toBe(1);
    expect(counts.counts.active).toBe(2);
  });
});

describe("getScheduledContent", () => {
  it("selects only items currently in 'scheduled', ordered soonest first", async () => {
    const { createContentItem, updateContentItem, updateContentStatus, getScheduledContent } = await importRepository();
    const soon = await createContentItem(site, { title: "Soon" });
    const later = await createContentItem(site, { title: "Later" });
    if (soon.status !== "success" || later.status !== "success") throw new Error("expected success");

    await updateContentItem(site, soon.item.id, { scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString() });
    await updateContentItem(site, later.item.id, { scheduledAt: new Date(Date.now() + 20 * 86400000).toISOString() });
    for (const id of [soon.item.id, later.item.id]) {
      await updateContentStatus(site, id, "planned");
      await updateContentStatus(site, id, "ready");
      await updateContentStatus(site, id, "scheduled");
    }

    const all = await getScheduledContent(site);
    expect(all.items.map((item) => item.title)).toEqual(["Soon", "Later"]);

    const withinWeek = await getScheduledContent(site, 7);
    expect(withinWeek.items.map((item) => item.title)).toEqual(["Soon"]);
  });
});

describe("getContentItemsByRelatedProject / Beat / Client", () => {
  it("finds items linked to a specific Project, Beat, or Client", async () => {
    const { createContentItem, getContentItemsByRelatedProject, getContentItemsByRelatedBeat, getContentItemsByRelatedClient } =
      await importRepository();
    await createContentItem(site, { title: "Linked to project", projectId: PROJECT_ID });
    await createContentItem(site, { title: "Linked to beat", beatId: BEAT_ID });
    await createContentItem(site, { title: "Linked to client", clientId: CLIENT_ID });
    await createContentItem(site, { title: "Unlinked" });

    expect((await getContentItemsByRelatedProject(site, PROJECT_ID)).items.map((i) => i.title)).toEqual(["Linked to project"]);
    expect((await getContentItemsByRelatedBeat(site, BEAT_ID)).items.map((i) => i.title)).toEqual(["Linked to beat"]);
    expect((await getContentItemsByRelatedClient(site, CLIENT_ID)).items.map((i) => i.title)).toEqual(["Linked to client"]);
  });
});
