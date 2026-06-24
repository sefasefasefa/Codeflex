import { useState } from "react";
import { Key, Plus, Trash2, Eye, EyeOff, Copy, Check, Settings2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser, useClerk } from "@clerk/react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string | null;
}

interface NewKey extends ApiKey {
  key: string;
}

function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const base = import.meta.env.BASE_URL?.replace(/\/+$/, "") || "";

  async function fetchKeys() {
    if (fetched) return;
    setLoading(true);
    try {
      const r = await fetch(`${base}/api/keys`, { credentials: "include" });
      if (r.ok) setKeys(await r.json());
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  async function createKey(name: string): Promise<NewKey | null> {
    const r = await fetch(`${base}/api/keys`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!r.ok) return null;
    const created: NewKey = await r.json();
    setKeys((prev) => [...prev, { id: created.id, name: created.name, prefix: created.prefix, createdAt: created.createdAt }]);
    return created;
  }

  async function deleteKey(id: string): Promise<boolean> {
    const r = await fetch(`${base}/api/keys/${id}`, { method: "DELETE", credentials: "include" });
    if (r.ok || r.status === 204) {
      setKeys((prev) => prev.filter((k) => k.id !== id));
      return true;
    }
    return false;
  }

  return { keys, loading, fetchKeys, createKey, deleteKey };
}

function ApiKeyCard({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${apiKey.name}" anahtarini silmek istediginizden emin misiniz?`)) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:bg-accent/20 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-md bg-indigo-600/20 flex items-center justify-center shrink-0">
          <Key className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{apiKey.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{apiKey.prefix}••••••••••••••••••••••••</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Olusturuldu: {new Date(apiKey.createdAt).toLocaleDateString("tr-TR")}
            {apiKey.lastUsedAt && ` · Son kullanim: ${new Date(apiKey.lastUsedAt).toLocaleDateString("tr-TR")}`}
          </div>
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="ml-3 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 shrink-0"
        data-testid={`button-delete-key-${apiKey.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function NewKeyReveal({ newKey, onDismiss }: { newKey: NewKey; onDismiss: () => void }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    toast({ title: "Kopyalandi", description: "API anahtari panoya kopyalandi." });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
        <Check className="w-4 h-4" />
        Anahtar olusturuldu — simdi kopyalayin, bir daha gosterilmeyecek!
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 font-mono text-xs bg-background border border-border rounded-md px-3 py-2 overflow-hidden">
          {shown ? newKey.key : `${newKey.prefix}${"•".repeat(40)}`}
        </div>
        <button
          onClick={() => setShown((v) => !v)}
          className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
          title={shown ? "Gizle" : "Goster"}
        >
          {shown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={copy}
          className="p-2 rounded-md border border-border hover:bg-accent transition-colors"
          title="Kopyala"
          data-testid="button-copy-key"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <Button variant="outline" size="sm" onClick={onDismiss} className="w-full">
        Anladim, kopyaladim
      </Button>
    </div>
  );
}

function ApiKeysSection() {
  const { keys, loading, fetchKeys, createKey, deleteKey } = useApiKeys();
  const [tab, setTab] = useState<"list" | "create">("list");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<NewKey | null>(null);
  const { toast } = useToast();

  useState(() => {
    fetchKeys();
  });

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    const created = await createKey(newName.trim());
    setCreating(false);
    if (created) {
      setNewName("");
      setTab("list");
      setNewKey(created);
    } else {
      toast({ title: "Hata", description: "Anahtar olusturulamadi.", variant: "destructive" });
    }
  }

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
        <div>
          <h3 className="font-semibold text-base">API Anahtarlari</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Kendi uygulamalarinizi entegre etmek icin anahtar olusturun.</p>
        </div>
        <Button size="sm" onClick={() => setTab("create")} className="gap-1.5" data-testid="button-create-key">
          <Plus className="w-3.5 h-3.5" />
          Yeni
        </Button>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {newKey && (
          <NewKeyReveal newKey={newKey} onDismiss={() => setNewKey(null)} />
        )}

        {tab === "create" && (
          <div className="rounded-lg border border-border bg-background p-4 space-y-3">
            <h4 className="text-sm font-medium">Yeni API Anahtari</h4>
            <div className="flex gap-2">
              <Input
                placeholder="Anahtar adi (ornegin: CLI, VSCode)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="flex-1"
                data-testid="input-key-name"
              />
              <Button onClick={handleCreate} disabled={creating || !newName.trim()} data-testid="button-confirm-create-key">
                {creating ? "Olusturuluyor..." : "Olustur"}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setTab("list")} className="text-muted-foreground">
              Iptal
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Yukleniyor...</div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center">
            <Key className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">Henuz API anahtariniz yok.</div>
            <div className="text-xs text-muted-foreground/60 mt-1">Yukaridaki "Yeni" dugmesiyle olusturun.</div>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <ApiKeyCard key={k.id} apiKey={k} onDelete={() => deleteKey(k.id)} />
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Kullanim ornegi</div>
          <div className="font-mono text-xs text-muted-foreground overflow-x-auto">
            {'curl -H "Authorization: Bearer sk-..." /api/chat'}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

  const profileImage = user?.imageUrl;
  const firstName = user?.firstName;
  const lastName = user?.lastName;
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <div className="border border-border bg-card rounded-lg p-4 sm:p-6">
      <h3 className="font-semibold text-base mb-4">Profil</h3>
      <div className="flex items-center gap-4">
        {profileImage ? (
          <img src={profileImage} alt="Profil" className="w-14 h-14 rounded-full border border-border" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-300">
            {firstName?.[0]?.toUpperCase() || "K"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {[firstName, lastName].filter(Boolean).join(" ") || "Kullanici"}
          </div>
          <div className="text-sm text-muted-foreground truncate">{email || ""}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Clerk ile giris yapildi</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="gap-2 text-muted-foreground hover:text-destructive"
        >
          Cikis Yap
        </Button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [section, setSection] = useState<"genel" | "api" | "guvenlik">("genel");

  const sections = [
    { id: "genel" as const, icon: Settings2, label: "Genel" },
    { id: "api" as const, icon: Key, label: "API Anahtarlari" },
    { id: "guvenlik" as const, icon: Shield, label: "Guvenlik" },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-6">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full">
        <div className="mb-6 pb-4 border-b border-border">
          <h1 className="text-xl sm:text-2xl font-bold">Ayarlar</h1>
          <p className="text-muted-foreground text-sm mt-1">Hesap ve uygulama tercihlerinizi yonetin.</p>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-muted/30 rounded-lg overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                section === s.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`button-settings-${s.id}`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {section === "genel" && (
            <>
              <ProfileSection />
              <div className="border border-border bg-card rounded-lg p-4 sm:p-6">
                <h3 className="font-semibold text-base mb-4">Gorunum</h3>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-sm">Karanlik Mod</div>
                    <div className="text-xs text-muted-foreground">Arayuz her zaman karanlik tonda gosterilir.</div>
                  </div>
                  <div className="px-2.5 py-1 bg-indigo-600/20 text-indigo-300 text-xs rounded-full font-medium border border-indigo-500/30">
                    Aktif
                  </div>
                </div>
              </div>
            </>
          )}

          {section === "api" && <ApiKeysSection />}

          {section === "guvenlik" && (
            <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-4 sm:p-6">
              <h3 className="font-semibold text-base text-destructive mb-2">Tehlikeli Bolge</h3>
              <p className="text-sm text-muted-foreground mb-4">Bu islemler geri alinamaz. Dikkatli olun.</p>
              <Button variant="destructive" size="sm" data-testid="button-clear-data">
                Tum Verileri Temizle
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
