import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";

type MileEntry = {
  date: string;
  distance: string;
  purpose: string;
  notes: string;
};

const initialForm: MileEntry = {
  date: "",
  distance: "",
  purpose: "",
  notes: "",
};

const MileTracker = () => {
  const [form, setForm] = useState<MileEntry>(initialForm);
  const [entries, setEntries] = useState<MileEntry[]>(() => {
    const saved = localStorage.getItem("mile-entries");
    return saved ? JSON.parse(saved) : [];
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.distance) return;
    const updated = [form, ...entries];
    setEntries(updated);
    localStorage.setItem("mile-entries", JSON.stringify(updated));
    setForm(initialForm);
    showSuccess("Mile entry added!");
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
            <Button type="submit" className="w-full">Add Entry</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Mileage Log</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-gray-500">No entries yet.</div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, idx) => (
                <li key={idx} className="border-b pb-2">
                  <div className="font-semibold">{entry.date} - {entry.distance} mi</div>
                  {entry.purpose && <div className="text-sm text-gray-600">Purpose: {entry.purpose}</div>}
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