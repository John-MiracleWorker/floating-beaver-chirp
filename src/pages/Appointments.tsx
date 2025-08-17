import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  showSuccess,
  showError,
  showLoading,
  dismissToast,
} from "@/utils/toast";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";
import MapLibreMap from "@/components/MapLibreMap";

type Client = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  created_at?: string;
};

type Appointment = {
  id: string;
  user_id: string;
  date: string;
  time: string;
  client_id: string;
  location: string;
  notes: string;
  created_at?: string;
};

const initialForm = {
  date: "",
  time: "",
  clientId: "",
  location: "",
  notes: "",
};

const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

async function geocode(address: string): Promise<[number, number]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`
  );
  const results = await res.json();
  if (!results || results.length === 0) {
    throw new Error(`No location found for "${address}"`);
  }
  return [parseFloat(results[0].lat), parseFloat(results[0].lon)];
}

export default function Appointments() {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, "id" | "user_id">>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [routeStart, setRouteStart] = useState(
    () => localStorage.getItem("route-start") || ""
  );
  const [routeEnd, setRouteEnd] = useState(
    () => localStorage.getItem("route-end") || ""
  );
  const [routeUrl, setRouteUrl] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addClient = useMutation({
    mutationFn: async (payload: Omit<Client, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Client added!");
      setForm((f) => ({ ...f, clientId: created.id }));
    },
  });

  const addAppointment = useMutation({
    mutationFn: async (payload: Omit<Appointment, "id" | "created_at">) => {
      const { error } = await supabase.from("appointments").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showSuccess("Appointment saved!");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Appointment> }) => {
      const { error } = await supabase
        .from("appointments")
        .update(params.updates)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showSuccess("Appointment updated!");
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showSuccess("Appointment deleted!");
    },
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddClient = (e?: FormEvent) => {
    e?.preventDefault();
    if (!newClient.name) return;
    addClient.mutate({ user_id: session?.user.id || "", ...newClient });
    setAddingClient(false);
    setNewClient({ name: "", phone: "", email: "", address: "", notes: "" });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time || !form.clientId) return;
    const payload = {
      user_id: session?.user.id || "",
      date: form.date,
      time: form.time,
      client_id: form.clientId,
      location: form.location,
      notes: form.notes,
    };
    if (editingId) {
      updateAppointment.mutate({ id: editingId, updates: payload });
      setEditingId(null);
    } else {
      addAppointment.mutate(payload);
    }
    setForm(initialForm);
  };

  const handleEdit = (appt: Appointment) => {
    setForm({
      date: appt.date,
      time: appt.time,
      clientId: appt.client_id,
      location: appt.location,
      notes: appt.notes,
    });
    setEditingId(appt.id);
    setAddingClient(false);
  };

  const handleDelete = (id: string) => {
    deleteAppointment.mutate(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
  };

  const today = toLocalYMD(new Date());
  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const planRoute = async () => {
    const stops = todaysAppointments.map((a) => {
      const client = clients.find((c) => c.id === a.client_id);
      return (a.location || client?.address || "").trim();
    }).filter((s) => s);
    const addressesFull = [
      ...(routeStart.trim() ? [routeStart.trim()] : []),
      ...stops,
      ...(routeEnd.trim() ? [routeEnd.trim()] : []),
    ];
    if (addressesFull.length < 2) {
      showError("Need at least two locations.");
      return;
    }
    const loading = showLoading("Calculating route...");
    try {
      const coordsFull = await Promise.all(addressesFull.map(geocode));
      setRouteCoords(coordsFull);

      const origin = encodeURIComponent(addressesFull[0]);
      const dest = encodeURIComponent(addressesFull[addressesFull.length - 1]);
      const wps = addressesFull.slice(1, -1).map(encodeURIComponent).join("|");
      setRouteUrl(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${
          wps ? `&waypoints=${wps}` : ""
        }&travelmode=driving`
      );

      localStorage.setItem("route-start", routeStart);
      localStorage.setItem("route-end", routeEnd);
      dismissToast(loading);
      showSuccess("Route planned!");
    } catch (err: any) {
      dismissToast(loading);
      showError(err.message || "Route planning failed");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Appointment" : "New Appointment"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="date" type="date" value={form.date} onChange={handleChange} required />
            <Input name="time" type="time" value={form.time} onChange={handleChange} required />
            <div>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="link"
                size="sm"
                className="mt-1"
                onClick={() => setAddingClient((v) => !v)}
              >
                {addingClient ? "Cancel new client" : "Add new client"}
              </Button>
            </div>
            {addingClient && (
              <div className="space-y-2 border p-3 rounded">
                <Input
                  name="name"
                  placeholder="Name"
                  value={newClient.name}
                  onChange={(e) =>
                    setNewClient({ ...newClient, [e.target.name]: e.target.value })
                  }
                  required
                />
                <Input
                  name="phone"
                  placeholder="Phone"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, [e.target.name]: e.target.value })
                  }
                />
                <Input
                  name="email"
                  placeholder="Email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) =>
                    setNewClient({ ...newClient, [e.target.name]: e.target.value })
                  }
                />
                <Input
                  name="address"
                  placeholder="Address"
                  value={newClient.address}
                  onChange={(e) =>
                    setNewClient({ ...newClient, [e.target.name]: e.target.value })
                  }
                />
                <Textarea
                  name="notes"
                  placeholder="Notes"
                  value={newClient.notes}
                  onChange={(e) =>
                    setNewClient({ ...newClient, [e.target.name]: e.target.value })
                  }
                  rows={2}
                />
                <Button onClick={handleAddClient} className="w-full">
                  Save Client
                </Button>
              </div>
            )}
            <Input
              name="location"
              placeholder="Location override"
              value={form.location}
              onChange={handleChange}
            />
            <Textarea
              name="notes"
              placeholder="Notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysAppointments.length === 0 ? (
            <div className="text-gray-500">No appointments today.</div>
          ) : (
            <ul className="space-y-2">
              {todaysAppointments.map((a) => {
                const client = clients.find((c) => c.id === a.client_id);
                return (
                  <li key={a.id} className="border-b pb-2 flex justify-between items-start">
                    <div>
                      <div className="font-semibold">
                        {a.time} – {client?.name || "Unknown"}
                      </div>
                      {a.location && <div className="text-sm">{a.location}</div>}
                      {a.notes && <div className="text-xs text-gray-500">{a.notes}</div>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(a)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan Route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Start address"
            value={routeStart}
            onChange={(e) => setRouteStart(e.target.value)}
          />
          <Input
            placeholder="End address"
            value={routeEnd}
            onChange={(e) => setRouteEnd(e.target.value)}
          />
          <Button onClick={planRoute} className="w-full">
            Generate Route
          </Button>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-500 hover:underline"
            >
              Open in Google Maps
            </a>
          )}
          {routeCoords.length > 1 && (
            <div className="h-64">
              <MapLibreMap
                center={routeCoords[0]}
                zoom={12}
                markers={routeCoords.map((coord) => ({ coord }))}
                line={routeCoords}
                height="100%"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}