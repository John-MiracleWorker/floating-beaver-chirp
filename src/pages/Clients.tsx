import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const initialForm: Omit<Client, "id"> = {
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

const Clients = () => {
  const [form, setForm] = useState(initialForm);
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem("clients");
    return saved ? JSON.parse(saved) : [];
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    if (editingId) {
      const updated = clients.map((c) =>
        c.id === editingId ? { ...c, ...form } : c
      );
      setClients(updated);
      localStorage.setItem("clients", JSON.stringify(updated));
      setEditingId(null);
      showSuccess("Client updated!");
    } else {
      const newClient = { ...form, id: Date.now().toString() };
      const updated = [newClient, ...clients];
      setClients(updated);
      localStorage.setItem("clients", JSON.stringify(updated));
      showSuccess("Client added!");
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
    const updated = clients.filter((c) => c.id !== id);
    setClients(updated);
    localStorage.setItem("clients", JSON.stringify(updated));
    showSuccess("Client deleted!");
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
          {clients.length === 0 ? (
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