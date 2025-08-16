import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type Appointment = {
  date: string;
  time: string;
  clientId: string;
  location: string;
  notes: string;
};

const initialForm: Appointment = {
  date: "",
  time: "",
  clientId: "",
  location: "",
  notes: "",
};

const getClients = (): Client[] => {
  const saved = localStorage.getItem("clients");
  return saved ? JSON.parse(saved) : [];
};

const getClientById = (id: string): Client | undefined => {
  return getClients().find((c) => c.id === id);
};

const getAppointments = (): Appointment[] => {
  const saved = localStorage.getItem("appointments");
  return saved ? JSON.parse(saved) : [];
};

const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  // Use Nominatim OpenStreetMap API for geocoding
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data && data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
};

// Helper to set map view without using the `center` prop (kept for dynamic updates)
const SetMapView = ({ center, zoom }: { center: LatLngExpression; zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
};

// Get local YYYY-MM-DD (avoid UTC offset issues)
const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const Appointments = () => {
  const [form, setForm] = useState<Appointment>(initialForm);
  const [appointments, setAppointments] = useState<Appointment[]>(getAppointments());
  const [clients, setClients] = useState<Client[]>(getClients());
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, "id">>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Filter appointments for today (LOCAL date)
  const today = toLocalYMD(new Date());
  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  // Handle appointment form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Add new client from appointment form (supports onSubmit or onClick)
  const handleAddClient = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newClient.name) return;
    const client = { ...newClient, id: Date.now().toString() };
    const updated = [client, ...clients];
    setClients(updated);
    localStorage.setItem("clients", JSON.stringify(updated));
    setAddingClient(false);
    setNewClient({ name: "", phone: "", email: "", address: "", notes: "" });
    showSuccess("Client added!");
    setForm((f) => ({ ...f, clientId: client.id }));
  };

  // Handle appointment submission (create or update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time || !form.clientId) return;

    if (editingIndex !== null) {
      const updated = appointments.map((a, idx) => (idx === editingIndex ? form : a));
      setAppointments(updated);
      localStorage.setItem("appointments", JSON.stringify(updated));
      setEditingIndex(null);
      setForm(initialForm);
      showSuccess("Appointment updated!");
    } else {
      const updated = [form, ...appointments];
      setAppointments(updated);
      localStorage.setItem("appointments", JSON.stringify(updated));
      setForm(initialForm);
      showSuccess("Appointment added!");
    }
  };

  const handleEditAppointment = (index: number) => {
    const appt = appointments[index];
    setForm(appt);
    setEditingIndex(index);
    setAddingClient(false);
  };

  const handleDeleteAppointment = (index: number) => {
    const updated = appointments.filter((_, i) => i !== index);
    setAppointments(updated);
    localStorage.setItem("appointments", JSON.stringify(updated));
    showSuccess("Appointment deleted!");
    if (editingIndex === index) {
      setEditingIndex(null);
      setForm(initialForm);
    }
  };

  // Route planning: geocode addresses and set route
  const planRoute = async () => {
    setLoadingRoute(true);
    const coords: [number, number][] = [];
    for (const appt of todaysAppointments) {
      const client = getClientById(appt.clientId);
      const address = appt.location || client?.address || "";
      if (address) {
        const geo = await geocodeAddress(address);
        if (geo) coords.push(geo);
      }
    }
    setRouteCoords(coords);
    setLoadingRoute(false);
  };

  // Calculate total miles (straight-line for demo)
  const totalMiles = useMemo(() => {
    if (routeCoords.length < 2) return 0 as unknown as string;
    let miles = 0;
    for (let i = 1; i < routeCoords.length; i++) {
      const [lat1, lon1] = routeCoords[i - 1];
      const [lat2, lon2] = routeCoords[i];
      // Haversine formula
      const R = 3958.8; // miles
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
  }, [routeCoords]);

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingIndex !== null ? "Edit Appointment" : "Schedule Appointment"}</CardTitle>
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
                {editingIndex !== null ? "Update" : "Add Appointment"}
              </Button>
              {editingIndex !== null && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setEditingIndex(null);
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
        <CardContent>
          <Button onClick={planRoute} disabled={loadingRoute || todaysAppointments.length === 0}>
            {loadingRoute ? "Planning..." : "Show Route on Map"}
          </Button>
          {routeCoords.length > 0 && typeof routeCoords[0] !== "undefined" && (
            <div className="mt-4">
              <div className="mb-2 font-medium">Total Route Miles: {totalMiles}</div>
              <MapContainer
                center={routeCoords[0] as LatLngExpression}
                zoom={12}
                style={{ height: "300px", width: "100%" }}
              >
                <SetMapView center={routeCoords[0] as LatLngExpression} zoom={12} />
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Polyline positions={routeCoords as LatLngExpression[]} pathOptions={{ color: "blue" }} />
                {routeCoords.map((pos, idx) => (
                  <Marker key={idx} position={pos as LatLngExpression}>
                    <Popup>
                      {getClientById(todaysAppointments[idx]?.clientId)?.name || "Stop"}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
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
              {appointments.map((appt, idx) => {
                const client = getClientById(appt.clientId);
                return (
                  <li
                    key={idx}
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
                      <Button size="sm" variant="outline" onClick={() => handleEditAppointment(idx)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteAppointment(idx)}>
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