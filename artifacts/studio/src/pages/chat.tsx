import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { MessageSquare, Plus, Search, Brain, Send, ChevronLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const MOCK_CONVERSATIONS = [
  { id: "1", title: "Proje Kurulumu", model: "claude-3-opus", updatedAt: "10 dk once" },
  { id: "2", title: "Veritabani Sema Tasarimi", model: "gpt-4-turbo", updatedAt: "1 saat once" },
  { id: "3", title: "API Entegrasyonu", model: "qwen2.5-coder", updatedAt: "3 saat once" },
];

const MOCK_MESSAGES = [
  { id: "m1", role: "user", content: "Yapay zeka calisma alani icin bir veritabani semasi tasarlamamda yardimci olabilir misin?" },
  { id: "m2", role: "assistant", content: "Tabii ki! Temel varliklardan baslayalim: Kullanici, Proje, Ajan, Calistirma, Konusma ve Dosya. Bu varliklar arasindaki iliskileri tanımlaralim.", thinking: "Kullanici bir veritabani semasi istiyor. Temel varliklar: User, Workspace, Agent, Run, Conversation, File. Iliski: User has many Projects, Projects have many Runs, Runs have many Files." },
  { id: "m3", role: "user", content: "Calistirmalar ve dosyalar arasindaki iliskiyi aciklar misin?" },
  { id: "m4", role: "assistant", content: "Her Calistirma (Run), bir veya daha fazla ajan tarafindan olusturulan Dosyalara sahip olabilir. Bu one-to-many bir iliski: bir run_id, birden fazla proje dosyasini referans eder." },
];

export default function Chat() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeId = params.id;

  const handleSend = () => {
    if (!input.trim()) return;
    setInput("");
  };

  const activeConv = MOCK_CONVERSATIONS.find((c) => c.id === activeId) ?? MOCK_CONVERSATIONS[0];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Conversation Sidebar — hidden on mobile unless toggled */}
      <div
        className={`
          flex flex-col border-r border-border bg-card shrink-0
          ${sidebarOpen ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl" : "hidden"}
          md:relative md:flex md:w-64 md:static md:shadow-none md:z-auto
        `}
      >
        {/* Mobile close */}
        <div className="md:hidden flex items-center justify-between p-3 border-b border-border">
          <span className="font-medium text-sm">Sohbetler</span>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded hover:bg-accent">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <Button
            className="w-full justify-start gap-2 h-9 text-sm"
            variant="default"
            onClick={() => { setSidebarOpen(false); setLocation("/chat"); }}
            data-testid="button-new-chat"
          >
            <Plus className="w-4 h-4" />
            Yeni Sohbet
          </Button>
        </div>

        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 h-8 text-xs bg-background/50" placeholder="Ara..." />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-0.5">
            {MOCK_CONVERSATIONS.map((conv) => {
              const active = conv.id === activeId;
              return (
                <button
                  key={conv.id}
                  className={`w-full text-left p-2.5 rounded-lg transition-colors flex flex-col gap-0.5 ${
                    active ? "bg-indigo-600/20 text-indigo-300" : "hover:bg-accent/50"
                  }`}
                  onClick={() => { setSidebarOpen(false); setLocation(`/chat/${conv.id}`); }}
                  data-testid={`button-conv-${conv.id}`}
                >
                  <div className={`font-medium text-sm truncate ${active ? "text-indigo-200" : "text-foreground"}`}>
                    {conv.title}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate max-w-[100px]">{conv.model}</span>
                    <span className="shrink-0">{conv.updatedAt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="h-12 sm:h-14 border-b border-border flex items-center px-3 sm:px-4 shrink-0 bg-card/50 gap-2">
          <button
            className="md:hidden p-1.5 rounded-md hover:bg-accent text-muted-foreground"
            onClick={() => setSidebarOpen(true)}
            data-testid="button-open-sidebar"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-medium text-sm truncate">{activeConv?.title ?? "Sohbet"}</h2>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{activeConv?.model}</p>
          </div>
          <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-3 sm:p-6 max-w-3xl mx-auto flex flex-col gap-4 sm:gap-6 pb-4">
            {MOCK_MESSAGES.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  {msg.role === "user" ? "Sen" : "Asistan"}
                </div>
                {msg.thinking && (
                  <div className="max-w-[90%] sm:max-w-[80%] rounded-lg bg-muted/20 border border-border p-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5 font-medium text-xs mb-2">
                      <Brain className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-400">Dusunce sureci</span>
                    </div>
                    <div className="font-mono text-xs leading-relaxed">{msg.thinking}</div>
                  </div>
                )}
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-xl p-3 sm:p-4 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-card border border-border"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input — add bottom padding for mobile bottom nav */}
        <div className="p-3 sm:p-4 border-t border-border bg-background pb-safe">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2">
              <Input
                className="flex-1 bg-card border-border min-h-[44px] text-sm pr-12"
                placeholder="Asistana mesaj gonder..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                data-testid="input-message"
              />
              <Button
                size="icon"
                className="absolute right-1 bottom-1 w-9 h-9 rounded-lg shrink-0"
                onClick={handleSend}
                disabled={!input.trim()}
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="text-center mt-2 text-[11px] text-muted-foreground">
              Yapay zeka hata yapabilir. Onemli bilgileri dogrulayin.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
