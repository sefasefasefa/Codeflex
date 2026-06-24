import { useState } from "react";
import { useListAgents, getListAgentsQueryKey, useCreateAgent, useUpdateAgent, useDeleteAgent } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Cpu, Plus, Trash2, Edit2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/utils";

export default function Agents() {
  const { data: agents } = useListAgents();

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agent Registry</h1>
          <p className="text-muted-foreground font-mono mt-1">Define and configure specialized models</p>
        </div>
        <AgentDialog />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents?.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const deleteAgent = useDeleteAgent();
  const queryClient = useQueryClient();

  const handleDelete = () => {
    if (confirm("Delete this agent?")) {
      deleteAgent.mutate({ agentId: agent.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        }
      });
    }
  };

  return (
    <Card className="bg-card flex flex-col">
      <CardHeader className="pb-3 border-b border-border/50">
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center gap-2 font-mono text-primary">
            <Cpu className="w-5 h-5" />
            {agent.key}
          </div>
          <div className="flex items-center gap-1">
            <AgentDialog agent={agent} trigger={<Button variant="ghost" size="icon" className="h-8 w-8"><Edit2 className="w-4 h-4" /></Button>} />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 flex-1 flex flex-col gap-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-secondary/30 p-2 rounded">
          <div><span className="text-muted-foreground">MODEL:</span> <br/>{agent.modelName}</div>
          <div><span className="text-muted-foreground">TEMP:</span> <br/>{agent.temperature}</div>
          <div className="col-span-2"><span className="text-muted-foreground">ROLE:</span> <br/><span className="truncate block">{agent.role}</span></div>
        </div>
        <div className="mt-auto pt-2 text-xs text-muted-foreground font-mono text-right">
          CREATED: {formatDate(agent.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}

function AgentDialog({ agent, trigger }: { agent?: any, trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isEdit = !!agent;
  
  const [key, setKey] = useState(agent?.key || "");
  const [role, setRole] = useState(agent?.role || "");
  const [modelName, setModelName] = useState(agent?.modelName || "gpt-4o");
  const [temperature, setTemperature] = useState(agent?.temperature?.toString() || "0.2");
  const [description, setDescription] = useState(agent?.description || "");

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      key,
      role,
      modelName,
      temperature: parseFloat(temperature),
      description
    };

    if (isEdit) {
      updateAgent.mutate({ agentId: agent.id, data }, {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        }
      });
    } else {
      createAgent.mutate({ data }, {
        onSuccess: () => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="font-mono gap-2"><Plus className="w-4 h-4" /> REGISTER AGENT</Button>}
      </DialogTrigger>
      <DialogContent className="bg-card border-border sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" /> {isEdit ? "UPDATE_AGENT" : "REGISTER_AGENT"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Agent Key</Label>
            <Input required disabled={isEdit} value={key} onChange={e => setKey(e.target.value)} className="font-mono bg-background" placeholder="e.g. senior-frontend" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Input required value={modelName} onChange={e => setModelName(e.target.value)} className="font-mono bg-background" />
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input required type="number" step="0.1" min="0" max="2" value={temperature} onChange={e => setTemperature(e.target.value)} className="font-mono bg-background" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>System Role</Label>
            <Textarea required value={role} onChange={e => setRole(e.target.value)} className="font-mono bg-background min-h-[100px]" placeholder="You are an expert engineer..." />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input required value={description} onChange={e => setDescription(e.target.value)} className="font-mono bg-background" />
          </div>
          <Button type="submit" className="w-full font-mono" disabled={createAgent.isPending || updateAgent.isPending}>
            {isEdit ? "SAVE_CHANGES" : "REGISTER"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
