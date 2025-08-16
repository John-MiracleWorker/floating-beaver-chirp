import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";

type Appointment = {
  date: string;
  time: string;
  client: string;
  location: string;
  notes: string;
};

const initialForm: Appointment = {
  date: "",
  time: "",
  client: "",
  location: "",
  notes: "",
};

const Appointments = () => {
  const [form, setForm] = useState<Appointment>(initialForm);
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem("appointments");
    return saved ? JSON.parse(saved) : [];
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time || !form.client) return;
    const updated = [form, ...appointments];
    setAppointments(updated);
    localStorage.setItem("appointments", JSON.stringify(updated));
    setForm(initialForm);
    showSuccess("Appointment added!");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Schedule Appointment</CardTitle>
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
              type="time"
              name="time"
              value={form.time}
              onChange={handleChange}
              required
              placeholder="Time"
            />
            <Input
              type="text"
              name="client"
              value={form.client}
              onChange={handleChange}
              required
              placeholder="Client Name"
            />
            <Input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Location"
            />
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Notes"
              className="w-full border rounded p-2"
              rows={2}
            />
            <Button type="submit" className="w-full">Add Appointment</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-gray-500">No appointments yet.</div>
          ) : (
            <ul className="space-y-2">
              {appointments.map((appt, idx) => (
                <li key={idx} className="border-b pb-2">
                  <div className="font-semibold">{appt.date} {appt.time} - {appt.client}</div>
                  {appt.location && <div className="text-sm text-gray-600">Location: {appt.location}</div>}
                  {appt.notes && <div className="text-xs text-gray-500">Notes: {appt.notes}</div>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;