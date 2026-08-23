"use client";

import { useEffect, useState } from "react";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { uploadInvoiceFile } from "@/lib/storage";
import type { Ingredient, Invoice } from "@/lib/types";
import type { InvoiceParseResult } from "@/lib/invoiceSchema";
import InvoiceUpload from "@/components/InvoiceUpload";
import InvoiceReview, {
  type ConfirmedInvoiceEdits,
} from "@/components/InvoiceReview";
import InvoiceToInventory from "@/components/InvoiceToInventory";
import InvoicesList from "@/components/InvoicesList";

type Stage =
  | { phase: "idle" }
  | { phase: "review"; file: File; parsed: InvoiceParseResult }
  | { phase: "saving" }
  | { phase: "quickAdd"; invoice: Invoice };

export default function InvoicesTab() {
  const { currentUser, profile } = useAuth();
  const [stage, setStage] = useState<Stage>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const snap = await getDocs(collection(db, "ingredients"));
      if (cancelled) return;
      setIngredients(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Ingredient)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile || !currentUser) return null;

  async function handleConfirm(edited: ConfirmedInvoiceEdits) {
    if (stage.phase !== "review" || !profile || !currentUser) return;
    setError(null);
    setStage({ phase: "saving" });
    try {
      const storagePath = await uploadInvoiceFile(
        stage.file,
        profile.restaurantId,
        currentUser.uid
      );

      const invoiceRef = doc(
        collection(db, "restaurants", profile.restaurantId, "invoices")
      );
      const invoiceDoc = {
        fileName: stage.file.name,
        storageUrl: storagePath,
        supplier: edited.supplier,
        invoiceDate: Timestamp.fromDate(edited.invoiceDate),
        total: edited.total,
        rawOcrText: stage.parsed.rawText,
        status: "confirmed" as const,
        lineItems: edited.lineItems,
        parsedErrors: stage.parsed.parsedErrors,
        createdAt: serverTimestamp(),
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser.uid,
      };
      await setDoc(invoiceRef, invoiceDoc);

      setStage({
        phase: "quickAdd",
        invoice: {
          id: invoiceRef.id,
          fileName: invoiceDoc.fileName,
          storageUrl: invoiceDoc.storageUrl,
          supplier: invoiceDoc.supplier,
          invoiceDate: invoiceDoc.invoiceDate,
          total: invoiceDoc.total,
          rawOcrText: invoiceDoc.rawOcrText,
          status: invoiceDoc.status,
          lineItems: invoiceDoc.lineItems,
          parsedErrors: invoiceDoc.parsedErrors,
          reviewedBy: invoiceDoc.reviewedBy,
        },
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(
        err instanceof FirebaseError && err.code === "permission-denied"
          ? "Save was denied by security rules."
          : "Couldn't save invoice. Please try again."
      );
      setStage({
        phase: "review",
        file: stage.file,
        parsed: stage.parsed,
      });
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {stage.phase === "idle" && (
        <>
          <InvoiceUpload
            onParsed={(file, parsed) => {
              setError(null);
              setStage({ phase: "review", file, parsed });
            }}
            onError={setError}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <InvoicesList
            restaurantId={profile.restaurantId}
            reloadKey={reloadKey}
            onChanged={() => setReloadKey((k) => k + 1)}
          />
        </>
      )}

      {stage.phase === "review" && (
        <>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <InvoiceReview
            parsed={stage.parsed}
            onConfirm={handleConfirm}
            onReject={() => setStage({ phase: "idle" })}
          />
        </>
      )}

      {stage.phase === "saving" && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Saving…</p>
      )}

      {stage.phase === "quickAdd" && (
        <InvoiceToInventory
          invoice={stage.invoice}
          restaurantId={profile.restaurantId}
          ingredients={ingredients}
          onDone={() => setStage({ phase: "idle" })}
        />
      )}
    </div>
  );
}
