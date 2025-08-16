import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";

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
  date: string; // YYYY-MM-DD
  time: string; // e.g., 09:30
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Safer geocoder: sequential, timeout, and tolerant of non-JSON/failed responses.
const geocodeAddress = async (
  address: string,
  signal?: AbortSignal
): Promise<[number, number] | null> => {
  if (!address) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}`;

  // Add a local timeout so a slow request doesn't hang the UI
  const controller = new AbortController();
  const combinedSignal = signal ?? controller.signal;
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // Use fetch and tolerate failures gracefully
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal: combinedSignal,
  }).catch(() => null);

  clearTimeout(timeoutId);

  if (!res || !("ok" in res) || !res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return [lat, lon];
};

const SetMapView = ({ center, zoom }: { center: LatLngExpression; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

type RouteStop = {
  coord: [number, number];
  label: string;
};

const Appointments = () => {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, "id" | "user_id">>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [routeStart, setRouteStart] = useState<string>(() => localStorage.getItem("route-start") || "");
  const [routeEnd, setRouteEnd] = useState<string>(() => localStorage.getItem("route-end") || "");

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: true })
        .order("time", { ascending: true });
      if (error) throw error;
      return data as Appointment[];
    },
  });

  const addClient = useMutation({
    mutationFn: async (payload: Omit<Client, "id" | "created_at">) => {
      const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
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
      showSuccess("Appointment added!");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Appointment> }) => {
      const { id, updates } = params;
      const { error } = await supabase.from("appointments").update(updates).eq("id", id);
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

  const today = toLocalYMD(new Date());
  const todaysAppointments = useMemo(
    () => appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddClient = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newClient.name) return;
    addClient.mutate({
      user_id: session?.user.id || "",
      name: newClient.name,
      phone: newClient.phone,
      email: newClient.email,
      address: newClient.address,
      notes: newClient.notes,
    });
    setAddingClient(false);
    setNewClient({ name: "", phone: "", email: "", address: "", notes: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time || !form.clientId) return;

    if (editingId) {
      updateAppointment.mutate({
        id: editingId,
        updates: {
          date: form.date,
          time: form.time,
          client_id: form.clientId,
          location: form.location,
          notes: form.notes,
        },
      });
      setEditingId(null);
    } else {
      addAppointment.mutate({
        user_id: session?.user.id || "",
        date: form.date,
        time: form.time,
        client_id: form.clientId,
        location: form.location,
        notes: form.notes,
      });
    }
    setForm(initialForm);
  };

  const handleEditAppointment = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    setForm({
      date: appt.date,
      time: appt.time,
      clientId: appt.client_id,
      location: appt.location,
      notes: appt.notes,
    });
    setEditingId(id);
    setAddingClient(false);
  };

  const handleDeleteAppointment = (id: string) => {
    deleteAppointment.mutate(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
  };

  const getClientById = (id: string): Client | undefined => {
    return clients.find((c) => c.id === id);
  };

  const planRoute = async () => {
    setLoadingRoute(true);
    setRouteStops([]);

    const planned: RouteStop[] = [];
    let failed = 0;

    const addresses: { label: string; address: string }[] = [];

    if (routeStart.trim()) {
      addresses.push({ label: "Start", address: routeStart.trim() });
    }

    for (const appt of todaysAppointments) {
      const client = getClientById(appt.client_id);
      const addr = appt.location || client?.address || "";
      if (addr.trim()) {
        addresses.push({ label: client?.name || "Stop", address: addr.trim() });
      }
    }

    if (routeEnd.trim()) {
      addresses.push({ label: "End", address: routeEnd.trim() });
    }

    // Sequential geocode with a small delay to avoid rate-limits
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      const coord = await geocodeAddress(a.address).catch(() => null);
      if (coord) {
        planned.push({ coord, label: a.label });
      } else {
        failed += 1;
      }
      if (i < addresses.length - 1) {
        await sleep(800); // gentle delay between calls
      }
    }

    setRouteStops(planned);
    setLoadingRoute(false);

    if (planned.length === 0) {
      showError("Could not map any locations. Please verify addresses.");
      return;
    }
    if (failed > 0) {
      showError(`${failed} location${failed > 1 ? "s" : ""} couldn't be geocoded and were skipped.`);
    }
  };

  const totalMiles = useMemo<string>(() => {
    if (routeStops.length < 2) return "0.00";
    let miles = 0;
    for (let i = 1; i < routeStops.length; i++) {
      const [lat1, lon1] = routeStops[i - 1].coord;
      const [lat2, lon2] = routeStops[i].coord;
      const R = 3958.8;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      miles += R * c;
    }
    return miles.toFixed(2);
  }, [routeStops]);

  const hasAnyStop = !!routeStart.trim() || !!routeEnd.trim() || todaysAppointments.length > 0;
  const routeCoords = routeStops.map((s) => s.coord) as LatLngExpression[];

  // Workaround for react-leaflet typing mismatch in some setups.
  const MapAny = MapContainer as any;

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId !== null ? "Edit Appointment" : "Schedule Appointment"}</CardTitle>
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
            <div>
              <label className="block text-sm font-medium mb-1">Client</label>
              <div className="flex gap-2">
                <select
                  name="clientId"
                  value={form.clientId}
                  onChange={handleChange}
                  required
                  className="w-full border rounded p-2"
                >
                  <option value="">Select client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.address ? `(${c.address})` : ""}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAddingClient((v) => !v)}
                >
                  {addingClient ? "Cancel" : "Add"}
                </Button>
              </div>
              {addingClient && (
                <div className="mt-2 space-y-2 bg-gray-50 p-2 rounded">
                  <Input
                    name="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    required
                    placeholder="Full Name"
                  />
                  <Input
                    name="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    placeholder="Phone"
                  />
                  <Input
                    name="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="Email"
                  />
                  <Input
                    name="address"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    placeholder="Address"
                  />
                  <textarea
                    name="notes"
                    value={newClient.notes}
                    onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                    placeholder="Notes"
                    className="w-full border rounded p-2"
                    rows={2}
                  />
                  <Button type="button" className="w-full" onClick={() => handleAddClient()}>
                    Save Client
                  </Button>
                </div>
              )}
            </div>
            <Input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Override Address (optional)"
            />
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Notes"
              className="w-full border rounded p-2"
              rows={2}
            />
            <div className="flex gap-2">
              <Button type="submit" className="w-full">
                {editingId !== null ? "Update" : "Add Appointment"}
              </Button>
              {editingId !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Today's Route</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              placeholder="Start location (optional)"
              value={routeStart}
              onChange={(e) => {
                setRouteStart(e.target.value);
                localStorage.setItem("route-start", e.target.value);
              }}
            />
            <Input
              placeholder="End location (optional)"
              value={routeEnd}
              onChange={(e) => {
                setRouteEnd(e.target.value);
                localStorage.setItem("route-end", e.target.value);
              }}
            />
          </div>
          <Button
            onClick={planRoute}
            disabled={loadingRoute || !hasAnyStop}
            className="w-full md:w-auto"
          >
            {loadingRoute ? "Planning..." : "Show Route on Map"}
          </Button>
          {routeStops.length > 0 && typeof routeCoords[0] !== "undefined" && (
            <div className="mt-2">
              <div className="mb-2 font-medium">Total Route Miles: {totalMiles}</div>
              <MapAny
                center={routeCoords[0] as LatLngExpression}
                zoom={12}
                style={{ height: "300px", width: "100%" }}
              >
                <SetMapView center={routeCoords[0] as LatLngExpression} zoom={12} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={routeCoords} pathOptions={{ color: "blue" }} />
                {routeStops.map((stop, idx) => (
                  <Marker key={idx} position={stop.coord as LatLngExpression}>
                    <Popup>{stop.label}</Popup>
                  </Marker>
                ))}
              </MapAny>
            </div>
          )}
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
              {appointments.map((appt) => {
                const client = getClientById(appt.client_id);
                return (
                  <li
                    key={appt.id}
                    className="border-b pb-2 flex flex-col md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="font-semibold">
                        {appt.date} {appt.time} - {client?.name || "Unknown"}
                      </div>
                      {appt.location && (
                        <div className="text-sm text-gray-600">Location: {appt.location}</div>
                      )}
                      {client?.address && !appt.location && (
                        <div className="text-sm text-gray-600">Address: {client.address}</div>
                      )}
                      {appt.notes && <div className="text-xs text-gray-500">Notes: {appt.notes}</div>}
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      <Button size="sm" variant="outline" onClick={() => handleEditAppointment(appt.id)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteAppointment(appt.id)}>
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
    </div>
  );
};

export default Appointments;