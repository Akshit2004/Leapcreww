"use client";

import React, { useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { useApp } from "../context/AppContext";

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

  // Parse file when dropped/selected
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

        const validContacts = (results.data as Array<Record<string, string>>).map((row) => ({
          name: row.Name || row.name || "Unknown",
          phone: row.Phone || row.phone || row.PhoneNumber || "",
          email: row.Email || row.email || "",
          source: "Imported CSV",
          tags: ["imported"],
          status: "Active",
        })).filter(c => c.phone); // Require phone at least

        if (validContacts.length === 0) {
          setError("No valid contacts found. Please ensure there is a 'Phone' or 'phone' column.");
          return;
        }

        setParsedContacts(validContacts);
      },
      error: (err) => {
        setError((err instanceof Error ? err.message : String(err)));
      }
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
      onClose();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-orange-500" />
            Import CSV Contacts
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-stone-100 rounded-full transition-colors text-stone-500 hover:text-stone-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-stone-500">
            Upload a CSV file containing your contacts. Required column: <b>phone</b>. Optional columns: <b>name, email</b>.
          </p>

          <div className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center hover:bg-stone-50 hover:border-orange-200 transition-colors relative group">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFile} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 mx-auto text-stone-300 group-hover:text-orange-400 mb-2 transition-colors" />
            <p className="text-sm font-medium text-stone-700">Click or drag CSV here</p>
            {file && <p className="text-xs text-orange-600 mt-2 font-semibold truncate px-4">{file.name}</p>}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg flex items-start gap-2 text-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {parsedContacts.length > 0 && !error && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center justify-between text-sm animate-fade-in">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Found {parsedContacts.length} valid contacts
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleUpload} 
            disabled={parsedContacts.length === 0 || loading}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {loading ? "Importing..." : "Import Contacts"}
          </button>
        </div>
      </div>
    </div>
  );
};
