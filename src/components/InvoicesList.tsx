"use client";

import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { deleteInvoiceFile, getInvoiceViewUrl } from "@/lib/storage";
import type { Invoice } from "@/lib/types";

export default function InvoicesList({
  restaurantId,
  reloadKey,
  onChanged,
}: {
  restaurantId: string;
  reloadKey: number;
  onChanged: () => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Single-field order only — no composite index needed.
        const q = query(
          collection(db, "restaurants", restaurantId, "invoices"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setInvoices(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Invoice)
        );
      } catch {
        if (!cancelled) setError("Couldn't load invoices. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, reloadKey]);

  async function handleView(invoice: Invoice) {
    try {
      const url = await getInvoiceViewUrl(invoice.storageUrl);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn't open invoice file.");
    }
  }

  async function handleDelete(invoice: Invoice) {
    if (!invoice.id) return;
    setBusyId(invoice.id);
    setError(null);
    try {
      await deleteDoc(
        doc(db, "restaurants", restaurantId, "invoices", invoice.id)
      );
      // Best-effort — a failed Storage delete orphans the file but never
      // blocks removing the record; not worth retry/reconciliation logic
      // for a low-frequency admin action.
      deleteInvoiceFile(invoice.storageUrl).catch(() => {});
      onChanged();
    } catch {
      setError("Couldn't delete invoice. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }
  if (invoices === null) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
    );
  }
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No invoices uploaded yet.
      </p>
    );
  }

  return (
    <div className="rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="mb-4 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Recent invoices
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-2 pr-4">Supplier</th>
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className="border-b border-black/[.04] dark:border-white/[.08]"
              >
                <td className="py-2 pr-4 text-black dark:text-zinc-50">
                  {invoice.supplier}
                </td>
                <td className="py-2 pr-4">
                  {invoice.invoiceDate
                    ? invoice.invoiceDate.toDate().toLocaleDateString()
                    : "—"}
                </td>
                <td className="py-2 pr-4">{invoice.lineItems.length}</td>
                <td className="py-2 pr-4">
                  {invoice.total != null ? `$${invoice.total.toFixed(2)}` : "—"}
                </td>
                <td className="py-2 pr-4 capitalize">{invoice.status}</td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleView(invoice)}
                      className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(invoice)}
                      disabled={busyId === invoice.id}
                      className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] disabled:opacity-50 dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
