"use client";

import React, { useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import Papa from "papaparse";
import { useApp } from "@/shared/context/AppContext";

interface CSVImporterModalProps {
  orgId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
}

export const CSVImporterModal: React.FC<CSVImporterModalProps> = ({ orgId, isOpen, onClose, onSuccess }) => {
  const { addSystemLog } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedContacts, setParsedContacts] = useState<unknown[]>([]);

  const reset = () => {
    setFile(null);
    setError(null);
    setParsedContacts([]);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setParsedContacts([]);

    Papa.parse(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV. Please check the format.");
          return;
        }

        const validContacts = (results.data as Array<Record<string, string>>)
          .map((row) => ({
            name: row.Name || row.name || "Unknown",
            phone: row.Phone || row.phone || row.PhoneNumber || "",
            email: row.Email || row.email || "",
            source: "Imported CSV",
            tags: ["imported"],
            status: "Active",
          }))
          .filter((c) => c.phone);

        if (validContacts.length === 0) {
          setError("No valid contacts found. Ensure there is a 'Phone' or 'phone' column.");
          return;
        }

        setParsedContacts(validContacts);
      },
      error: (err) => setError(err instanceof Error ? err.message : String(err)),
    });
  };

  const handleUpload = async () => {
    if (parsedContacts.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/org/${orgId}/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: parsedContacts }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      addSystemLog("crm", `Imported ${parsedContacts.length} contacts from CSV.`);
      onSuccess(parsedContacts.length);
      reset();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-white border border-stone-200 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-base font-black text-stone-900">Import CSV Contacts</h3>
            <p className="text-xs text-stone-500 mt-0.5">Bulk-add contacts from a spreadsheet export</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-stone-500 leading-relaxed">
            Required column: <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-700">phone</span>
            {" "}· Optional:{" "}
            <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-700">name</span>
            {" "}
            <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded-md text-stone-700">email</span>
          </p>

          {/* Drop zone */}
          <label className="relative block border-2 border-dashed border-stone-200 hover:border-wa-green rounded-xl p-8 text-center transition-colors cursor-pointer group">
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-wa-green/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-wa-green" />
                </div>
                <p className="text-sm font-bold text-stone-800 truncate max-w-[200px]">{file.name}</p>
                <p className="text-[11px] text-stone-400">Click to choose a different file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-stone-100 group-hover:bg-wa-green/10 rounded-xl flex items-center justify-center transition-colors">
                  <Upload className="w-5 h-5 text-stone-400 group-hover:text-wa-green transition-colors" />
                </div>
                <p className="text-sm font-bold text-stone-700">Click or drag your CSV here</p>
                <p className="text-[11px] text-stone-400">Supports .csv files only</p>
              </div>
            )}
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Preview count */}
          {parsedContacts.length > 0 && !error && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                {parsedContacts.length} valid contacts ready to import
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={handleClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={parsedContacts.length === 0 || loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-wa-green hover:bg-wa-green-dark text-white rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            {loading ? "Importing…" : `Import ${parsedContacts.length > 0 ? parsedContacts.length + " " : ""}Contacts`}
          </button>
        </div>
      </div>
    </div>
  );
};
