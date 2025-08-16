import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";
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

const initialForm: Omit<Client, "id" | "user_id"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const Clients = () => {
  const { session } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
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

  const addClient = useMutation({
    mutationFn: async (payload: Omit<Client, "id" | "created_at">) => {
      const { data, error } = await supabase.from("clients").insert(payload).select("*").single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Client added!");
    },
  });

  const updateClient = useMutation({
    mutationFn: async (params: { id: string; updates: Partial<Client> }) => {
      const { id, updates } = params;
      const { error } = await supabase.from("clients").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Client updated!");
    },
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      showSuccess("Client deleted!");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    if (editingId) {
      updateClient.mutate({ id: editingId, updates: { ...form } });
      setEditingId(null);
    } else {
      addClient.mutate({
        user_id: session?.user.id || "",
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes,
      });
    }
    setForm(initialForm);
  };

  const handleEdit = (id: string) => {
    const client = clients.find((c) => c.id === id);
    if (client) {
      setForm({
        name: client.name,
        phone: client.phone,
        email: client.email,
        address: client.address,
        notes: client.notes,
      });
      setEditingId(id);
    }
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(initialForm);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{editingId ? "Edit Client" : "Add Client"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Full Name"
            />
            <Input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone"
              type="tel"
            />
            <Input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              type="email"
            />
            <Input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address"
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
                {editingId ? "Update" : "Add"}
              </Button>
              {editingId && (
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
      <Card>
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-gray-500">Loading...</div>
          ) : clients.length === 0 ? (
            <div className="text-gray-500">No clients yet.</div>
          ) : (
            <ul className="space-y-2">
              {clients.map((client) => (
                <li key={client.id} className="border-b pb-2 flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{client.name}</div>
                    {client.phone && <div className="text-sm text-gray-600">Phone: {client.phone}</div>}
                    {client.email && <div className="text-sm text-gray-600">Email: {client.email}</div>}
                    {client.address && <div className="text-sm text-gray-600">Address: {client.address}</div>}
                    {client.notes && <div className="text-xs text-gray-500">Notes: {client.notes}</div>}
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(client.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(client.id)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Clients;