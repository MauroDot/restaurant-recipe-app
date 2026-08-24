import "server-only";

/**
 * Firestore REST access for Next.js API routes, authenticated as the
 * CALLER'S own ID token — not an admin client. firebase-admin can't be used
 * here (Vercel's serverless bundling breaks on its jwks-rsa dependency chain
 * — see src/lib/verifyIdToken.ts), so this is the only server-side read path
 * available to API routes.
 *
 * Using the caller's own token is deliberate, not just a workaround: it
 * means firestore.rules' own isRestaurantMember() checks are what actually
 * enforce restaurant scoping on these reads. The route never needs to (and
 * shouldn't) re-implement that check — a wrong/spoofed restaurantId just
 * gets an empty/403 result from Firestore itself, not a leak. See chunk 7
 * plan, correction #9.
 */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

function baseUrl(): string {
  if (!PROJECT_ID) {
    throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured.");
  }
  return `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
}

/** Decodes one Firestore REST typed value into a plain JS value. */
function decodeValue(value: Record<string, unknown>): unknown {
  if (value.nullValue !== undefined) return null;
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) {
    const values =
      (value.arrayValue as { values?: Record<string, unknown>[] }).values ?? [];
    return values.map(decodeValue);
  }
  if (value.mapValue !== undefined) {
    return decodeFields(
      (value.mapValue as { fields?: Record<string, Record<string, unknown>> })
        .fields ?? {}
    );
  }
  return null;
}

/** Decodes a Firestore REST document's `fields` object into a plain object. */
function decodeFields(
  fields: Record<string, Record<string, unknown>>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = decodeValue(value);
  }
  return out;
}

/**
 * Fetches one document by its path (e.g. "users/abc123"). Returns null if
 * it doesn't exist OR the caller isn't allowed to read it (Firestore REST
 * returns 404 for both a missing doc and a rules-denied read on a `get`, so
 * this deliberately doesn't distinguish the two — callers shouldn't leak
 * that distinction either).
 */
export async function getDocument(
  idToken: string,
  path: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${baseUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) {
    throw new Error(`Firestore getDocument(${path}) failed: ${res.status}`);
  }
  const doc = (await res.json()) as { fields?: Record<string, Record<string, unknown>> };
  return decodeFields(doc.fields ?? {});
}

export type FieldFilter = {
  field: string;
  op: "EQUAL" | "GREATER_THAN_OR_EQUAL" | "LESS_THAN_OR_EQUAL";
  value: string | number | boolean;
};

function encodeFilterValue(value: string | number | boolean): Record<string, unknown> {
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  return Number.isInteger(value)
    ? { integerValue: String(value) }
    : { doubleValue: value };
}

/**
 * Runs a structured query scoped under `parentPath` (e.g.
 * "restaurants/abc123" to query its "costHistory" subcollection, or "" for
 * a top-level collection). Combines `filters` with AND. Returns decoded
 * documents (docs the caller can't read per rules are simply absent from
 * the result, same as any other Firestore query).
 */
export async function runQuery(
  idToken: string,
  parentPath: string,
  collectionId: string,
  filters: FieldFilter[]
): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const url = parentPath
    ? `${baseUrl()}/${parentPath}:runQuery`
    : `${baseUrl()}:runQuery`;

  const structuredQuery: Record<string, unknown> = {
    from: [{ collectionId }],
  };
  if (filters.length === 1) {
    const f = filters[0];
    structuredQuery.where = {
      fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: encodeFilterValue(f.value) },
    };
  } else if (filters.length > 1) {
    structuredQuery.where = {
      compositeFilter: {
        op: "AND",
        filters: filters.map((f) => ({
          fieldFilter: { field: { fieldPath: f.field }, op: f.op, value: encodeFilterValue(f.value) },
        })),
      },
    };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });
  if (!res.ok) {
    throw new Error(`Firestore runQuery(${collectionId}) failed: ${res.status}`);
  }
  const rows = (await res.json()) as {
    document?: { name: string; fields?: Record<string, Record<string, unknown>> };
  }[];

  return rows
    .filter((r) => r.document)
    .map((r) => ({
      id: r.document!.name.split("/").pop()!,
      data: decodeFields(r.document!.fields ?? {}),
    }));
}
