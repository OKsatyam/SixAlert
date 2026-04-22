"use client";
// Admin page — auth+role guarded, tabs: Users | Offers | Logs
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatDiscount } from "@/lib/utils";
import type { User, Offer, Brand, Sport, DataSourceLog } from "@/types";
import { ShieldCheck, Users, Tag, ScrollText, Trash2, Edit2, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "users" | "offers" | "logs";
type LogFilter = { layer: string; status: string };

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch<User[]>("/admin/users", {}, token);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const changeRole = async (id: string, role: "admin" | "user") => {
    try {
      await apiFetch(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }, token);
      setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role } : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    try {
      await apiFetch(`/admin/users/${id}`, { method: "DELETE" }, token);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-wider">
            <th className="pb-3 pr-4 font-medium">Name</th>
            <th className="pb-3 pr-4 font-medium">Email</th>
            <th className="pb-3 pr-4 font-medium">Role</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-zinc-800/30 transition-colors">
              <td className="py-3 pr-4 font-medium text-zinc-100">{u.name}</td>
              <td className="py-3 pr-4 text-zinc-400">{u.email}</td>
              <td className="py-3 pr-4">
                <Badge variant={u.role === "admin" ? "admin" : "completed"}>
                  {u.role.toUpperCase()}
                </Badge>
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => changeRole(u._id, u.role === "admin" ? "user" : "admin")}
                    className="text-xs h-7"
                  >
                    Make {u.role === "admin" ? "User" : "Admin"}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => deleteUser(u._id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && <EmptyState message="No users found" />}
    </div>
  );
}

// ─── Offer Form ───────────────────────────────────────────────────────────────
interface OfferFormData {
  title: string;
  brandId: string;
  sportId: string;
  triggerEvent: string;
  discountType: string;
  discountValue: string;
  durationSeconds: string;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

const BLANK_FORM: OfferFormData = {
  title: "", brandId: "", sportId: "", triggerEvent: "SIX",
  discountType: "percentage", discountValue: "", durationSeconds: "120",
  validFrom: "", validTo: "", isActive: true,
};

function OfferFormModal({
  brands,
  sports,
  initial,
  onSave,
  onClose,
  token,
  editId,
}: {
  brands: Brand[];
  sports: Sport[];
  initial: OfferFormData;
  onSave: (offer: Offer) => void;
  onClose: () => void;
  token: string;
  editId?: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key: keyof OfferFormData, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        brandId: form.brandId,
        sportId: form.sportId,
        triggerEvent: form.triggerEvent,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        durationSeconds: Number(form.durationSeconds),
        validFrom: form.validFrom,
        validTo: form.validTo,
        isActive: form.isActive,
      };
      const saved = editId
        ? await apiFetch<Offer>(`/offers/${editId}`, { method: "PUT", body: JSON.stringify(payload) }, token)
        : await apiFetch<Offer>("/offers", { method: "POST", body: JSON.stringify(payload) }, token);
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <h3 className="font-semibold text-zinc-100">{editId ? "Edit Offer" : "Create Offer"}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Title">
            <Input placeholder="e.g. 30% off on all orders" value={form.title}
              onChange={(e) => set("title", e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand">
              <StyledSelect value={form.brandId} onChange={(v) => set("brandId", v)} required>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </StyledSelect>
            </Field>
            <Field label="Sport">
              <StyledSelect value={form.sportId} onChange={(v) => set("sportId", v)} required>
                <option value="">Select sport</option>
                {sports.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </StyledSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Trigger Event">
              <StyledSelect value={form.triggerEvent} onChange={(v) => set("triggerEvent", v)}>
                <option value="SIX">SIX</option>
                <option value="WICKET">WICKET</option>
                <option value="FOUR">FOUR</option>
              </StyledSelect>
            </Field>
            <Field label="Discount Type">
              <StyledSelect value={form.discountType} onChange={(v) => set("discountType", v)}>
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
                <option value="free_delivery">Free Delivery</option>
                <option value="bogo">BOGO</option>
              </StyledSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount Value">
              <Input type="number" placeholder="30" value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)} required min={0} />
            </Field>
            <Field label="Duration (seconds)">
              <Input type="number" placeholder="120" value={form.durationSeconds}
                onChange={(e) => set("durationSeconds", e.target.value)} required min={10} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valid From">
              <Input type="datetime-local" value={form.validFrom}
                onChange={(e) => set("validFrom", e.target.value)} required />
            </Field>
            <Field label="Valid To">
              <Input type="datetime-local" value={form.validTo}
                onChange={(e) => set("validTo", e.target.value)} required />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="isActive" checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="w-4 h-4 accent-orange-500 rounded"
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          {error && <ErrorBox msg={error} />}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : editId ? "Save Changes" : "Create Offer"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Offers Tab ───────────────────────────────────────────────────────────────
function OffersTab({ token }: { token: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);

  const load = async () => {
    try {
      const [o, b, s] = await Promise.all([
        apiFetch<Offer[]>("/offers", {}, token),
        apiFetch<Brand[]>("/brands", {}, token),
        apiFetch<Sport[]>("/sports", {}, token),
      ]);
      setOffers(o);
      setBrands(b);
      setSports(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteOffer = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    try {
      await apiFetch(`/offers/${id}`, { method: "DELETE" }, token);
      setOffers((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSave = (saved: Offer) => {
    setOffers((prev) => {
      const idx = prev.findIndex((o) => o._id === saved._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditOffer(null);
  };

  const toForm = (o: Offer): OfferFormData => ({
    title: o.title,
    brandId: typeof o.brand === "object" ? o.brand._id : o.brand,
    sportId: typeof o.sport === "object" ? o.sport._id : o.sport,
    triggerEvent: o.triggerEvent,
    discountType: o.discountType,
    discountValue: String(o.discountValue),
    durationSeconds: String(o.durationSeconds),
    validFrom: o.validFrom ? o.validFrom.slice(0, 16) : "",
    validTo: o.validTo ? o.validTo.slice(0, 16) : "",
    isActive: o.isActive,
  });

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-zinc-400">{offers.length} offer{offers.length !== 1 ? "s" : ""}</p>
        <Button size="sm" onClick={() => { setEditOffer(null); setShowForm(true); }}>
          <Plus size={14} /> New Offer
        </Button>
      </div>
      <div className="space-y-3">
        {offers.map((offer) => (
          <div key={offer._id} className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <p className="text-sm font-semibold text-zinc-100 truncate">{offer.title}</p>
                <Badge variant={offer.isActive ? "default" : "completed"}>
                  {offer.isActive ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500">
                {typeof offer.brand === "object" ? offer.brand.name : "—"} ·{" "}
                {formatDiscount(offer.discountType, offer.discountValue)} ·{" "}
                {offer.durationSeconds}s
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="icon" variant="ghost" className="h-8 w-8"
                onClick={() => { setEditOffer(offer); setShowForm(true); }}>
                <Edit2 size={13} />
              </Button>
              <Button size="icon" variant="ghost"
                className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                onClick={() => deleteOffer(offer._id)}>
                <Trash2 size={13} />
              </Button>
            </div>
          </div>
        ))}
        {offers.length === 0 && <EmptyState message="No offers yet. Create one." />}
      </div>

      {showForm && (
        <OfferFormModal
          brands={brands}
          sports={sports}
          initial={editOffer ? toForm(editOffer) : BLANK_FORM}
          editId={editOffer?._id}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditOffer(null); }}
          token={token}
        />
      )}
    </>
  );
}

// ─── Logs Tab ─────────────────────────────────────────────────────────────────
function LogsTab({ token }: { token: string }) {
  const [logs, setLogs] = useState<DataSourceLog[]>([]);
  const [filter, setFilter] = useState<LogFilter>({ layer: "", status: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.layer) params.set("layer", filter.layer);
      if (filter.status) params.set("status", filter.status);
      const data = await apiFetch<DataSourceLog[]>(
        `/admin/logs?${params.toString()}`,
        {},
        token
      );
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <StyledSelect value={filter.layer} onChange={(v) => setFilter((f) => ({ ...f, layer: v }))} className="w-36">
          <option value="">All layers</option>
          <option value="1">Layer 1</option>
          <option value="2">Layer 2</option>
          <option value="3">Layer 3</option>
        </StyledSelect>
        <StyledSelect value={filter.status} onChange={(v) => setFilter((f) => ({ ...f, status: v }))} className="w-36">
          <option value="">All status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </StyledSelect>
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox msg={error} />}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500 uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">Layer</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Message</th>
                <th className="pb-3 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex w-7 h-7 rounded-md bg-zinc-800 items-center justify-center text-xs font-bold text-zinc-300">
                      L{log.layer}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <Badge variant={log.status === "success" ? "success" : "error"}>
                      {log.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-2.5 pr-4 text-zinc-400 max-w-xs truncate">{log.message}</td>
                  <td className="py-2.5 text-zinc-500 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && <EmptyState message="No logs match this filter" />}
        </div>
      )}
    </>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">{msg}</div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-zinc-500 text-sm">{message}</div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StyledSelect({
  value,
  onChange,
  required,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 pr-8 py-2 text-sm text-zinc-100 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "users", label: "Users", icon: <Users size={15} /> },
  { key: "offers", label: "Offers", icon: <Tag size={15} /> },
  { key: "logs", label: "Logs", icon: <ScrollText size={15} /> },
];

export default function AdminPage() {
  const router = useRouter();
  const { token, isAdmin, isLoading } = useAuth();
  const [tab, setTab] = useState<Tab>("users");

  useEffect(() => {
    if (!isLoading && (!token || !isAdmin)) {
      router.replace("/");
    }
  }, [isLoading, token, isAdmin, router]);

  if (isLoading || !token || !isAdmin) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 rounded-full border-2 border-zinc-700 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="text-orange-500" size={22} />
        <h1 className="font-display text-3xl tracking-wide">ADMIN PANEL</h1>
      </div>

      {/* tab bar */}
      <div className="flex gap-1 mb-6 border-b border-zinc-800">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* tab content */}
      <div className="min-h-[400px]">
        {tab === "users" && <UsersTab token={token} />}
        {tab === "offers" && <OffersTab token={token} />}
        {tab === "logs" && <LogsTab token={token} />}
      </div>
    </div>
  );
}
