import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
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

const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const Appointments = () => {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // appointment form state
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  // client inline creation
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState<Omit<Client, "id" | "user_id">>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
  });

  // route planning state
  const [routeStart, setRouteStart] = useState(() => localStorage.getItem("route-start") || "");
  const [routeEnd, setRouteEnd] = useState(() => localStorage.getItem("route-end") || "");
  const [routeUrl, setRouteUrl] = useState<string | null>(null);

  // fetch clients and appointments
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

  // mutations
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

  // form handlers
  const handleChange = (e: React.ChangeEvent<any>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddClient = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newClient.name) return;
    addClient.mutate({ user_id: session?.user.id || "", ...newClient });
    setAddingClient(false);
    setNewClient({ name: "", phone: "", email: "", address: "", notes: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
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

  // route planning
  const today = toLocalYMD(new Date());
  const todaysAppointments = useMemo(
    () => appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, today]
  );

  const planRoute = () => {
    const addresses: string[] = [];
    if (routeStart.trim()) addresses.push(routeStart.trim());
    todaysAppointments.forEach((appt) => {
      const client = clients.find((c) => c.id === appt.client_id);
      const addr = appt.location || client?.address || "";
      if (addr.trim()) addresses.push(addr.trim());
    });
    if (routeEnd.trim()) addresses.push(routeEnd.trim());

    if (addresses.length < 2) {
      showError("Need at least two locations to plan a route.");
      return;
    }

    const origin = encodeURIComponent(addresses[0]);
    const destination = encodeURIComponent(addresses[addresses.length - 1]);
    const waypoints = addresses.slice(1, -1).map(encodeURIComponent).join("|");
    const waypointParam = waypoints ? `&waypoints=${waypoints}` : "";
    const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointParam}&travelmode=driving`;

    setRouteUrl(url);
    showSuccess("Route link generated!");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* ... Add/Edit Appointment and Upcoming list unchanged ... */}

      {/* Today's Route */}
      <Card>
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
          <Button onClick={planRoute} className="w-full md:w-auto">
            Generate Google Maps Link
          </Button>
          {routeUrl && (
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-2 text-blue-600 hover:underline"
            >
              Open Route in Google Maps
            </a>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Appointments;