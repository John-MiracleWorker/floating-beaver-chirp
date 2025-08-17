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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthProvider";
import MapLibreMap, { MapMarker } from "@/components/MapLibreMap";

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

  const [routeStart, setRouteStart] = useState(() => localStorage.getItem("route-start") || "");
  const [routeEnd, setRouteEnd] = useState(() => localStorage.getItem("route-end") || "");
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
    const addresses: string[] = [];
    if (routeStart.trim()) addresses.push(routeStart.trim());
    todaysAppointments.forEach((a) => {
      const client = clients.find((c) => c.id === a.client_id);
      const addr = a.location || client?.address || "";
      if (addr.trim()) addresses.push(addr.trim());
    });
    if (routeEnd.trim()) addresses.push(routeEnd.trim());
    if (addresses.length < 2) {
      showError("Need at least two locations.");
      return;
    }

    const loadingToast = showLoading("Calculating route...");
    try {
      const coords = await Promise.all(
        addresses.map((addr) => geocode(addr))
      );
      setRouteCoords(coords);
      const origin = encodeURIComponent(addresses[0]);
      const dest = encodeURIComponent(addresses[addresses.length - 1]);
      const wps = addresses
        .slice(1, -1)
        .map(encodeURIComponent)
        .join("|");
      setRouteUrl(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${
          wps ? `&waypoints=${wps}` : ""
        }&travelmode=driving`
      );
      localStorage.setItem("route-start", routeStart);
      localStorage.setItem("route-end", routeEnd);
      dismissToast(loadingToast);
      showSuccess("Route planned!");
    } catch (err: any) {
      dismissToast(loadingToast);
      showError(err.message || "Route planning failed");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      {/* form & today's list unchanged, omitted for brevity; see above */}
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