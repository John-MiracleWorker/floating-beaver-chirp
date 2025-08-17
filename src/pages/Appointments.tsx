import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import MapLibreMap, { MapMarker } from "@/components/MapLibreMap";
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const geocodeAddress = async (
  address: string,
  signal?: AbortSignal
): Promise<[number, number] | null> => {
  if (!address) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}`;
  const controller = new AbortController();
  const combinedSignal = signal ?? controller.signal;
  const timeout = setTimeout(() => controller.abort(), 8000);
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: combinedSignal }).catch(
    () => null
  );
  clearTimeout(timeout);
  if (!res || !res.ok) return null;
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  const data = await res.json().catch(() => null);
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (!isFinite(lat) || !isFinite(lon)) return null;
  return [lat, lon];
};

const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

  const [routeStops, setRouteStops] = useState<MapMarker[]>([]);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [routeStart, setRouteStart] = useState<string>(
    () => localStorage.getItem("route-start") || ""
  );
  const [routeEnd, setRouteEnd] = useState<string>(
    () => localStorage.getItem("route-end") || ""
  );

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
      showSuccess("Appointment added!");
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<Appointment>;
    }) => {
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
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      showSuccess("Appointment deleted!");
    },
  });

  const today = toLocalYMD(new Date());
  const todaysAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.date === today)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddClient = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newClient.name) return;
    addClient.mutate({
      user_id: session?.user.id || "",
      ...newClient,
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

  const getClientById = (id: string) => clients.find((c) => c.id === id);

  const planRoute = async () => {
    setLoadingRoute(true);
    setRouteStops([]);
    const planned: MapMarker[] = [];
    let failed = 0;

    const addresses: { label: string; address: string }[] = [];
    if (routeStart.trim()) addresses.push({ label: "Start", address: routeStart.trim() });
    for (const appt of todaysAppointments) {
      const client = getClientById(appt.client_id);
      const addr = appt.location || client?.address || "";
      if (addr.trim()) addresses.push({ label: client?.name || "Stop", address: addr.trim() });
    }
    if (routeEnd.trim()) addresses.push({ label: "End", address: routeEnd.trim() });

    for (let i = 0; i < addresses.length; i++) {
      const coord = await geocodeAddress(addresses[i].address).catch(() => null);
      if (coord) {
        planned.push({ coord, popupText: addresses[i].label });
      } else {
        failed++;
      }
      if (i < addresses.length - 1) await sleep(800);
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

  const totalMiles = useMemo(() => {
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
  const routeCoords = routeStops.map((s) => s.coord);

  return (
    <div className="max-w-2xl mx-auto">
      {/* form and list sections unchanged */}
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
          <Button onClick={planRoute} disabled={loadingRoute || !hasAnyStop} className="w-full md:w-auto">
            {loadingRoute ? "Planning..." : "Show Route on Map"}
          </Button>
          {routeStops.length > 0 && (
            <div className="mt-2">
              <div className="mb-2 font-medium">Total Route Miles: {totalMiles}</div>
              <MapLibreMap
                center={routeStops[0].coord}
                zoom={12}
                markers={routeStops}
                line={routeCoords}
                height="300px"
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* upcoming appointments list */}
    </div>
  );
};

export default Appointments;