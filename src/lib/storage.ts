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
 * Path: restaurants/{restaurantId}/invoices/{invoiceId}_{sanitizedFileName}.
 * `invoiceId` is the Firestore invoice doc's own id (allocated client-side
 * before this upload — see InvoicesTab.tsx). Now that request.auth.token.
 * restaurantId is available (a Cloud Function mirrors it from
 * users/{uid}.restaurantId — see functions/src/index.ts), storage.rules
 * can check restaurant membership directly, so the uid-segment write-lock
 * workaround from the previous chunk is no longer needed here.
 */
export async function uploadInvoiceFile(
  file: File,
  restaurantId: string,
  invoiceId: string
): Promise<string> {
  const path = `restaurants/${restaurantId}/invoices/${invoiceId}_${sanitizeFileName(
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
