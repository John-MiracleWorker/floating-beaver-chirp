import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";

type MileEntry = {
  id: string;
  user_id: string;
  date: string;
  distance: string;
  purpose: string;
  notes: string;
  created_at?: string;
};

type Receipt = {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

const initialForm = { date: "", distance: "", purpose: "", notes: "" };

export default function MileTracker() {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const { data: entries = [], isLoading: loadingEntries } = useQuery<MileEntry[]>({
    queryKey: ["mile_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mile_entries")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: receipts = [], isLoading: loadingReceipts } = useQuery<Receipt[]>({
    queryKey: ["receipts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalMiles = entries.reduce((sum, e) => sum + parseFloat(e.distance || "0"), 0).toFixed(1);

  const addEntry = useMutation({
    mutationFn: async (payload: Omit<MileEntry, "id" | "created_at">) => {
      const { error } = await supabase.from("mile_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mile_entries"] });
      showSuccess("Mile entry added!");
      setForm(initialForm);
    },
    onError: (error: any) => {
      showError(error.message || "Failed to add entry");
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async (file: File) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not signed in");
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const res = await fetch(
        `https://${"llcheplsmuqjzdvjksot"}.supabase.co/functions/v1/uploadReceipt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, fileName: file.name, fileData: base64 }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json.fileUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      showSuccess("Receipt uploaded!");
      setReceiptFile(null);
    },
    onError: (err: any) => {
      showError(err.message || "Receipt upload failed");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.distance) return;
    const userId = session?.user.id;
    if (!userId) {
      showError("You must be signed in to add entries.");
      return;
    }
    addEntry.mutate({
      user_id: userId,
      date: form.date,
      distance: form.distance,
      purpose: form.purpose,
      notes: form.notes,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptFile(e.target.files?.[0] ?? null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-lg font-semibold">Total Miles: {totalMiles}</div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log Miles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="date" name="date" value={form.date} onChange={handleChange} required />
            <Input
              type="number"
              name="distance"
              value={form.distance}
              onChange={handleChange}
              required
              min="0"
              step="0.1"
              placeholder="Distance (miles)"
            />
            <Input
              type="text"
              name="purpose"
              value={form.purpose}
              onChange={handleChange}
              placeholder="Purpose"
            />
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Notes"
              className="w-full border rounded p-2"
              rows={2}
            />
            <Button type="submit" className="w-full">
              Add Entry
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mileage Log</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEntries ? (
            <div className="text-gray-500">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-gray-500">No entries yet.</div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="border-b pb-2">
                  <div className="font-semibold">
                    {entry.date} - {entry.distance} mi
                  </div>
                  {entry.purpose && (
                    <div className="text-sm text-gray-600">Purpose: {entry.purpose}</div>
                  )}
                  {entry.notes && (
                    <div className="text-xs text-gray-500">Notes: {entry.notes}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input type="file" onChange={handleFileChange} />
          <Button
            onClick={() => receiptFile && uploadReceipt.mutate(receiptFile)}
            disabled={!receiptFile}
          >
            {uploadReceipt.status === "pending" ? "Uploading..." : "Upload Receipt"}
          </Button>
          {loadingReceipts ? (
            <div className="text-gray-500">Loading receipts...</div>
          ) : receipts.length === 0 ? (
            <div className="text-gray-500">No receipts uploaded.</div>
          ) : (
            <ul className="space-y-2">
              {receipts.map((r) => (
                <li key={r.id}>
                  <a
                    href={r.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {r.file_name}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}