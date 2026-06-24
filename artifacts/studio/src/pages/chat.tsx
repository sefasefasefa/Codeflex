import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  MessageSquare, Plus, Search, Brain, Send, ChevronLeft, MoreVertical,
  ListTodo, ChevronUp, ChevronDown, Trash2, Pencil, Check, X,
  PanelRightOpen, PanelRightClose, PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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

interface Task {
  id: string;
  content: string;
  createdAt: number;
}

function generateTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function TaskPanel({
  tasks,
  onSend,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddManual,
}: {
  tasks: Task[];
  onSend: (task: Task) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onAddManual: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditValue(task.content);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      onEdit(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card/60 shrink-0">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold">Görevler</span>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
              {tasks.length}
            </Badge>
          )}
        </div>
        <button
          onClick={onAddManual}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          title="Yeni görev ekle"
        >
          <PlusCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center">
            <ListTodo className="w-8 h-8 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Henüz görev yok</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Ajan mesajlarındaki <span className="font-mono">+</span> butonuyla ekleyin
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 flex flex-col gap-1.5">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className="group border border-border rounded-lg bg-card hover:border-indigo-500/40 transition-all"
              >
                {editingId === task.id ? (
                  /* Edit mode */
                  <div className="p-2 flex flex-col gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="text-xs resize-none min-h-[64px] bg-background border-indigo-500/50 focus-visible:ring-indigo-500/30"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
                      >
                        <X className="w-3 h-3" /> İptal
                      </button>
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Kaydet
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="p-2.5">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold text-indigo-400/80 bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                        #{index + 1}
                      </span>
                      <p className="text-xs text-foreground leading-relaxed flex-1 break-words">
                        {task.content}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-0.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                        title="Yukarı taşı"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onMoveDown(index)}
                        disabled={index === tasks.length - 1}
                        className="p-1 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground transition-colors"
                        title="Aşağı taşı"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-3.5 bg-border mx-0.5" />
                      <button
                        onClick={() => startEdit(task)}
                        className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                        title="Düzenle"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSend(task)}
                        className="p-1 rounded hover:bg-indigo-600/20 text-muted-foreground hover:text-indigo-400 transition-colors"
                        title="Sohbete gönder"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(task.id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default function Chat() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskPanelOpen, setTaskPanelOpen] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const activeId = params.id;

  const handleSend = (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim()) return;
    setInput("");
  };

  const addTask = (content: string, msgId?: string) => {
    setTasks((prev) => [...prev, { id: generateTaskId(), content, createdAt: Date.now() }]);
    if (msgId) setAddedIds((prev) => new Set(prev).add(msgId));
    setTaskPanelOpen(true);
  };

  const addManualTask = () => {
    addTask("Yeni görev — düzenlemek için tıklayın");
  };

  const editTask = (id: string, content: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    setTasks((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveDown = (index: number) => {
    setTasks((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  };

  const sendTaskToChat = (task: Task) => {
    handleSend(task.content);
  };

  const activeConv = MOCK_CONVERSATIONS.find((c) => c.id === activeId) ?? MOCK_CONVERSATIONS[0];

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Conversation Sidebar */}
      <div
        className={`
          flex flex-col border-r border-border bg-card shrink-0
          ${sidebarOpen ? "fixed inset-y-0 left-0 z-50 w-72 shadow-2xl" : "hidden"}
          md:relative md:flex md:w-64 md:static md:shadow-none md:z-auto
        `}
      >
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
      <div className="flex-1 flex flex-col bg-background overflow-hidden min-w-0">
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

          {/* Task panel toggle */}
          <button
            onClick={() => setTaskPanelOpen((v) => !v)}
            className={`relative p-1.5 rounded-md hover:bg-accent transition-colors ${
              taskPanelOpen ? "text-indigo-400" : "text-muted-foreground"
            }`}
            title={taskPanelOpen ? "Görevleri gizle" : "Görevleri göster"}
          >
            {taskPanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            {tasks.length > 0 && !taskPanelOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
                {tasks.length > 9 ? "9+" : tasks.length}
              </span>
            )}
          </button>

          <button className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-3 sm:p-6 max-w-3xl mx-auto flex flex-col gap-4 sm:gap-6 pb-4">
            {MOCK_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
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
                <div className="group flex flex-col gap-1.5 max-w-[90%] sm:max-w-[80%]">
                  <div
                    className={`rounded-xl p-3 sm:p-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-card border border-border"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    {msg.content}
                  </div>

                  {/* Add to tasks button — assistant only */}
                  {msg.role === "assistant" && (
                    <div className="flex justify-start px-1">
                      {addedIds.has(msg.id) ? (
                        <span className="flex items-center gap-1 text-[11px] text-indigo-400">
                          <Check className="w-3 h-3" />
                          Göreve eklendi
                        </span>
                      ) : (
                        <button
                          onClick={() => addTask(msg.content, msg.id)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <PlusCircle className="w-3 h-3" />
                          Göreve ekle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
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
                onClick={() => handleSend()}
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

      {/* Task Panel */}
      {taskPanelOpen && (
        <div className="hidden md:flex flex-col w-64 shrink-0 border-l border-border bg-card/30">
          <TaskPanel
            tasks={tasks}
            onSend={sendTaskToChat}
            onEdit={editTask}
            onDelete={deleteTask}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onAddManual={addManualTask}
          />
        </div>
      )}

      {/* Mobile Task Drawer */}
      {taskPanelOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setTaskPanelOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute top-14 right-0 bottom-16 w-72 bg-card border-l border-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskPanel
              tasks={tasks}
              onSend={sendTaskToChat}
              onEdit={editTask}
              onDelete={deleteTask}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onAddManual={addManualTask}
            />
          </div>
        </div>
      )}
    </div>
  );
}
