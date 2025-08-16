import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";

type MileEntry = {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  distance: string; // stored as numeric in DB, but input is string
  purpose: string;
  notes: string;
  created_at?: string;
};

const initialForm = {
  date: "",
  distance: "",
  purpose: "",
  notes: "",
};

const MileTracker = () => {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["mile_entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mile_entries")
        .select("*")
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MileEntry[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (payload: Omit<MileEntry, "id" | "created_at">) => {
      const { error } = await supabase.from("mile_entries").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mile_entries"] });
      showSuccess("Mile entry added!");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.distance) return;
    addEntry.mutate({
      user_id: session?.user.id || "",
      date: form.date,
      distance: form.distance,
      purpose: form.purpose,
      notes: form.notes,
    });
    setForm(initialForm);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Log Miles</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              placeholder="Date"
            />
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
            <Button type="submit" className="w-full" disabled={addEntry.isPending}>
              {addEntry.isPending ? "Saving..." : "Add Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mileage Log</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                  {entry.notes && <div className="text-xs text-gray-500">Notes: {entry.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MileTracker;