import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "@/lib/firebase";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Uploads an invoice file and returns the Storage OBJECT PATH — never
 * getDownloadURL()'s result. A minted download URL is a standing bearer
 * credential independent of security rules; storing one in a Firestore
 * field readable by any restaurant member (a financial document) is
 * unnecessary exposure. Viewers resolve a fresh URL on demand via
 * getInvoiceViewUrl() instead, which re-checks storage.rules at call time.
 *
 * The path embeds `uploaderUid` as its own segment
 * (restaurants/{restaurantId}/invoices/{uploaderUid}/{file}) so
 * storage.rules can restrict writes to the actual uploader via a plain
 * path-variable comparison. That's a deliberate fallback: Storage Rules'
 * firestore.get()/exists() cross-service calls (which would otherwise
 * verify "is this uid a member of this restaurant" the same way
 * firestore.rules does) don't work in this project — confirmed empirically
 * across several syntax variants, all returning 403 even for a
 * trivially-true check. Reads stay open to any signed-in user as a result;
 * see storage.rules for the full trade-off note.
 */
export async function uploadInvoiceFile(
  file: File,
  restaurantId: string,
  uploaderUid: string
): Promise<string> {
  const path = `restaurants/${restaurantId}/invoices/${uploaderUid}/${Date.now()}_${sanitizeFileName(
    file.name
  )}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type });
  return path;
}

/** Resolves a fresh, rules-checked viewing URL for an invoice file path. */
export async function getInvoiceViewUrl(path: string): Promise<string> {
  return getDownloadURL(ref(storage, path));
}

export async function deleteInvoiceFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path));
}
