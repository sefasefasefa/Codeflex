import { useState } from "react";
import { useLocation } from "wouter";
import { MessageSquare, Plus, Search, Terminal, Brain, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// Placeholder data since we don't have the chat API generated
const MOCK_CONVERSATIONS = [
  { id: "1", title: "Project Setup Agent", model: "claude-3-opus", updatedAt: "10 dk önce" },
  { id: "2", title: "Database Schema Design", model: "gpt-4-turbo", updatedAt: "1 saat önce" },
];

const MOCK_MESSAGES = [
  { id: "m1", role: "user", content: "Can you help me design a database schema for an AI workspace?" },
  { id: "m2", role: "assistant", content: "I'd be happy to help. Let's break this down into the core entities.", thinking: "User wants a DB schema for an AI workspace. Key entities: User, Workspace, Agent, Run, Conversation, File. I should propose a relational structure with these." },
];

export default function Chat() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  
  const handleSend = () => {
    if (!input.trim()) return;
    setInput("");
    // TODO: implement send
  };

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-border">
          <Button className="w-full justify-start gap-2" variant="default" onClick={() => setLocation("/chat")}>
            <Plus className="w-4 h-4" />
            Yeni Sohbet
          </Button>
        </div>
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9 bg-background/50 border-border" placeholder="Sohbetlerde ara..." />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 flex flex-col gap-1">
            {MOCK_CONVERSATIONS.map((conv) => (
              <button 
                key={conv.id}
                className="w-full text-left p-3 rounded-md hover:bg-accent/50 transition-colors flex flex-col gap-1"
                onClick={() => setLocation(`/chat/${conv.id}`)}
              >
                <div className="font-medium text-sm truncate text-foreground">{conv.title}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    {conv.model}
                  </div>
                  <span>{conv.updatedAt}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="h-14 border-b border-border flex items-center px-6 shrink-0 bg-card/50">
          <h2 className="font-medium">Database Schema Design</h2>
        </div>
        
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {MOCK_MESSAGES.map((msg) => (
              <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                  {msg.role === "user" ? "Sen" : "Asistan"}
                </div>
                {msg.thinking && (
                  <div className="max-w-[80%] rounded-lg bg-muted/30 border border-border p-3 text-sm text-muted-foreground flex flex-col gap-2">
                    <div className="flex items-center gap-2 font-medium text-xs">
                      <Brain className="w-3 h-3" />
                      Düşünme Süreci...
                    </div>
                    <div className="font-mono text-xs">{msg.thinking}</div>
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-4 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 bg-background">
          <div className="max-w-3xl mx-auto relative flex items-center">
            <Input 
              className="pr-12 bg-card border-border h-12" 
              placeholder="Asistana mesaj gönder..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button 
              size="icon" 
              className="absolute right-1 w-10 h-10 rounded-md" 
              onClick={handleSend}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="text-center mt-2 text-xs text-muted-foreground">
            Yapay zeka hata yapabilir. Lütfen önemli bilgileri kontrol edin.
          </div>
        </div>
      </div>
    </div>
  );
}