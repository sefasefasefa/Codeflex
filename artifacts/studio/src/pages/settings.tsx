import { Settings2, Database, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">Ayarlar</h1>
        <p className="text-muted-foreground text-sm mt-1">AI Studio tercihlerinizi yapılandırın.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-accent/50 text-foreground font-medium rounded-md text-sm">
            <Settings2 className="w-4 h-4" />
            Genel
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/30 hover:text-foreground font-medium rounded-md text-sm transition-colors">
            <Database className="w-4 h-4" />
            Veri & API
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/30 hover:text-foreground font-medium rounded-md text-sm transition-colors">
            <Shield className="w-4 h-4" />
            Güvenlik
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 text-muted-foreground hover:bg-accent/30 hover:text-foreground font-medium rounded-md text-sm transition-colors">
            <Palette className="w-4 h-4" />
            Görünüm
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="border border-border bg-card rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">Uygulama Teması</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Karanlık Mod</div>
                  <div className="text-sm text-muted-foreground">Arayüz her zaman karanlık tonda kalır.</div>
                </div>
                <div className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                  Aktif
                </div>
              </div>
            </div>
          </div>

          <div className="border border-border bg-card rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">API Konfigürasyonu</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ollama URL</label>
                <input 
                  type="text" 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="http://localhost:11434"
                />
                <p className="text-xs text-muted-foreground">Yerel modeller için Ollama sunucu adresi.</p>
              </div>
              <Button>Kaydet</Button>
            </div>
          </div>

          <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-6">
            <h3 className="font-semibold text-lg text-destructive mb-2">Tehlikeli Bölge</h3>
            <p className="text-sm text-muted-foreground mb-4">Sistem verilerini silme işlemleri geri alınamaz.</p>
            <Button variant="destructive">Tüm Verileri Temizle</Button>
          </div>
        </div>
      </div>
    </div>
  );
}