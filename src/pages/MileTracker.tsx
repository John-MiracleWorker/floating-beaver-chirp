import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";
import { Trash2, Camera, FileUp } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
  const [receiptDate, setReceiptDate] = useState<string>("");
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
    mutationFn: async ({ file, date }: { file: File; date: string }) => {
      const userId = session?.user.id;
      if (!userId) throw new Error("You must be signed in to upload receipts.");
      const year = date ? new Date(date).getFullYear() : null;
      const folder = year === 2025 ? "2025/" : "";
      const path = `${userId}/${folder}${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file);
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      const { error: recordError } = await supabase
        .from("receipts")
        .insert({ user_id: userId, file_name: file.name, file_url: data.publicUrl });
      if (recordError) throw recordError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      showSuccess("Receipt uploaded!");
      setReceiptFile(null);
      setReceiptDate("");
    },
    onError: (err: any) => showError(err.message || "Receipt upload failed"),
  });

  const deleteReceipt = useMutation({
    mutationFn: async (receipt: Receipt) => {
      const path = receipt.file_url.split('/receipts/')[1];
      if (!path) throw new Error("Could not determine file path from URL.");
      const { error: storageError } = await supabase.storage.from("receipts").remove([path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("receipts").delete().eq("id", receipt.id);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      showSuccess("Receipt deleted!");
    },
    onError: (err: any) => showError(err.message || "Failed to delete receipt"),
  });

  const deleteSelectedReceipts = useMutation({
    mutationFn: async () => {
      const receiptsToDelete = receipts.filter(r => selectedReceipts.includes(r.id));
      if (receiptsToDelete.length === 0) return;
      const paths = receiptsToDelete.map(r => r.file_url.split('/receipts/')[1]).filter(Boolean) as string[];
      const ids = receiptsToDelete.map(r => r.id);
      const { error: storageError } = await supabase.storage.from("receipts").remove(paths);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("receipts").delete().in("id", ids);
      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setSelectedReceipts([]);
      showSuccess("Selected receipts deleted!");
    },
    onError: (err: any) => showError(err.message || "Failed to delete receipts"),
  });

  const handleDownloadSelected = async () => {
    const receiptsToDownload = receipts.filter(r => selectedReceipts.includes(r.id));
    if (receiptsToDownload.length === 0) return;
    const loadingToast = showLoading("Preparing your download...");
    try {
      const zip = new JSZip();
      const filePromises = receiptsToDownload.map(async (receipt) => {
        const response = await fetch(receipt.file_url);
        if (!response.ok) { console.error(`Failed to fetch ${receipt.file_name}`); return; }
        const blob = await response.blob();
        zip.file(receipt.file_name, blob);
      });
      await Promise.all(filePromises);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'receipts.zip');
      dismissToast(loadingToast);
      showSuccess("Download started!");
      setSelectedReceipts([]);
    } catch (err: any) {
      dismissToast(loadingToast);
      showError(err.message || "Failed to create zip file.");
    }
  };

  const handleSelectReceipt = (id: string) => {
    setSelectedReceipts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedReceipts(receipts.map(r => r.id));
    } else {
      setSelectedReceipts([]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.distance) return;
    const userId = session?.user.id;
    if (!userId) { showError("You should be signed in to add entries."); return; }
    addEntry.mutate({ user_id: userId, date: form.date, distance: form.distance, purpose: form.purpose, notes: form.notes });
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => setReceiptFile(e.target.files?.[0] ?? null);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-lg font-semibold">Total Miles: {totalMiles}</div>
      <Card>
        <CardHeader><CardTitle>Log Miles</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input type="date" name="date" value={form.date} onChange={handleChange} required />
            <Input type="number" name="distance" value={form.distance} onChange={handleChange} required min="0" step="0.1" placeholder="Distance (miles)" />
            <Input type="text" name="purpose" value={form.purpose} onChange={handleChange} placeholder="Purpose" />
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Notes" className="w-full border rounded p-2" rows={2} />
            <Button type="submit" className="w-full">Add Entry</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Mileage Log</CardTitle></CardHeader>
        <CardContent>
          {loadingEntries ? <div>Loading...</div> : entries.length === 0 ? <div>No entries yet.</div> : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="border-b pb-2">
                  <div className="font-semibold">{entry.date} - {entry.distance} mi</div>
                  {entry.purpose && <div className="text-sm text-gray-600">Purpose: {entry.purpose}</div>}
                  {entry.notes && <div className="text-xs text-gray-500">Notes: {entry.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Receipts</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-3 border p-4 rounded-lg">
            <h3 className="text-md font-semibold text-center">Add New Receipt</h3>
            <Input type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleFileChange} className="hidden" />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                <FileUp className="mr-2 h-4 w-4" /> Upload File
              </Button>
              <Button variant="outline" onClick={() => cameraInputRef.current?.click()} className="w-full">
                <Camera className="mr-2 h-4 w-4" /> Take Photo
              </Button>
            </div>

            {receiptFile && <p className="text-sm text-gray-500 text-center">Selected: {receiptFile.name}</p>}

            <Button onClick={() => { if (receiptFile && receiptDate) { uploadReceipt.mutate({ file: receiptFile, date: receiptDate }); } else { showError("Please select a receipt file and date."); } }} disabled={!receiptFile || !receiptDate || uploadReceipt.isPending} className="w-full">
              {uploadReceipt.isPending ? "Uploading..." : "Upload Receipt"}
            </Button>
          </div>
          {loadingReceipts ? <div>Loading receipts...</div> : receipts.length === 0 ? <div>No receipts uploaded.</div> : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button onClick={handleDownloadSelected} disabled={selectedReceipts.length === 0 || deleteSelectedReceipts.isPending}>Download Selected</Button>
                <Button variant="destructive" onClick={() => deleteSelectedReceipts.mutate()} disabled={selectedReceipts.length === 0 || deleteSelectedReceipts.isPending}>Delete Selected</Button>
              </div>
              <div className="flex items-center space-x-2 py-2 border-b">
                <Checkbox id="select-all" onCheckedChange={handleSelectAll} checked={receipts.length > 0 && selectedReceipts.length === receipts.length} />
                <label htmlFor="select-all" className="text-sm font-medium">Select All</label>
              </div>
              <ul className="space-y-2">
                {receipts.map((r) => (
                  <li key={r.id} className="flex items-center justify-between p-1 hover:bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <Checkbox id={r.id} checked={selectedReceipts.includes(r.id)} onCheckedChange={() => handleSelectReceipt(r.id)} />
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">{r.file_name}</a>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteReceipt.mutate(r)} disabled={deleteReceipt.isPending}><Trash2 className="h-4 w-4 text-gray-500" /></Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}