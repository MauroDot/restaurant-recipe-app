"use client";

import { useState } from "react";
import type { InvoiceParseResult } from "@/lib/invoiceSchema";
import type { InvoiceLineItem } from "@/lib/types";

type EditableLineItem = {
  itemName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  lineCost: string;
  notes: string;
};

export type ConfirmedInvoiceEdits = {
  supplier: string;
  invoiceDate: Date;
  total: number;
  lineItems: InvoiceLineItem[];
};

function toEditable(items: InvoiceParseResult["lineItems"]): EditableLineItem[] {
  return items.map((li) => ({
    itemName: li.itemName,
    quantity: String(li.quantity),
    unit: li.unit,
    unitPrice: String(li.unitPrice),
    lineCost: String(li.lineCost),
    notes: li.notes ?? "",
  }));
}

const blankRow: EditableLineItem = {
  itemName: "",
  quantity: "",
  unit: "",
  unitPrice: "",
  lineCost: "",
  notes: "",
};

export default function InvoiceReview({
  parsed,
  onConfirm,
  onReject,
}: {
  parsed: InvoiceParseResult;
  onConfirm: (edited: ConfirmedInvoiceEdits) => void;
  onReject: () => void;
}) {
  const [supplier, setSupplier] = useState(parsed.supplier ?? "");
  const [invoiceDate, setInvoiceDate] = useState(parsed.invoiceDate ?? "");
  const [total, setTotal] = useState(
    parsed.total !== null ? String(parsed.total) : ""
  );
  const [lineItems, setLineItems] = useState<EditableLineItem[]>(
    toEditable(parsed.lineItems)
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateItem(index: number, patch: Partial<EditableLineItem>) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function deleteItem(index: number) {
    setLineItems((items) => items.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  }

  function addRow() {
    setLineItems((items) => [...items, { ...blankRow }]);
    setEditingIndex(lineItems.length);
  }

  const isValidItem = (item: EditableLineItem) =>
    item.itemName.trim() !== "" &&
    item.unit.trim() !== "" &&
    Number(item.quantity) > 0 &&
    !Number.isNaN(Number(item.unitPrice)) &&
    !Number.isNaN(Number(item.lineCost));

  const canConfirm =
    supplier.trim() !== "" &&
    invoiceDate.trim() !== "" &&
    total.trim() !== "" &&
    !Number.isNaN(Number(total)) &&
    lineItems.length > 0 &&
    lineItems.every(isValidItem);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      supplier: supplier.trim(),
      invoiceDate: new Date(invoiceDate),
      total: Number(total),
      lineItems: lineItems.map((item) => ({
        itemName: item.itemName.trim(),
        quantity: Number(item.quantity),
        unit: item.unit.trim(),
        unitPrice: Number(item.unitPrice),
        lineCost: Number(item.lineCost),
        ...(item.notes.trim() ? { notes: item.notes.trim() } : {}),
      })),
    });
  }

  return (
    <div className="flex flex-col gap-6 rounded border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Review parsed invoice
      </h3>

      {parsed.parsedErrors.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <p className="mb-1 font-medium">Review these before saving:</p>
          <ul className="list-disc pl-4">
            {parsed.parsedErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Supplier
          </label>
          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            placeholder="Required"
            className="w-48 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Invoice date
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Total ($)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            placeholder="Required"
            className="w-28 rounded border border-black/[.08] bg-transparent px-3 py-2 text-black dark:border-white/[.145] dark:text-zinc-50"
          />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Line items
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[.08] text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                <th className="py-2 pr-4">Item</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2 pr-4">$/Unit</th>
                <th className="py-2 pr-4">Line cost</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, index) => {
                const isEditing = editingIndex === index;
                return (
                  <tr
                    key={index}
                    className="border-b border-black/[.04] dark:border-white/[.08]"
                  >
                    {isEditing ? (
                      <>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) =>
                              updateItem(index, { itemName: e.target.value })
                            }
                            className="w-32 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, { quantity: e.target.value })
                            }
                            className="w-20 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, { unit: e.target.value })
                            }
                            className="w-16 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, { unitPrice: e.target.value })
                            }
                            className="w-20 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.lineCost}
                            onChange={(e) =>
                              updateItem(index, { lineCost: e.target.value })
                            }
                            className="w-20 rounded border border-black/[.08] bg-transparent px-2 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-4 text-black dark:text-zinc-50">
                          {item.itemName || "—"}
                        </td>
                        <td className="py-2 pr-4">{item.quantity}</td>
                        <td className="py-2 pr-4">{item.unit}</td>
                        <td className="py-2 pr-4">
                          ${Number(item.unitPrice || 0).toFixed(2)}
                        </td>
                        <td className="py-2 pr-4">
                          ${Number(item.lineCost || 0).toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="py-2 pr-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingIndex(isEditing ? null : index)
                          }
                          className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                        >
                          {isEditing ? "Done" : "Edit"}
                        </button>
                        <button
                          onClick={() => deleteItem(index)}
                          className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          onClick={addRow}
          className="mt-3 rounded-full border border-black/[.08] px-4 py-1.5 text-xs font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          + Add row
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="h-11 rounded-full bg-foreground px-6 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Confirm & Save
        </button>
        <button
          onClick={onReject}
          className="h-11 rounded-full border border-black/[.08] px-6 text-sm font-medium hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
        >
          Reject & Upload New
        </button>
      </div>
    </div>
  );
}
