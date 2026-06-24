import { useState } from "react";
import { useListSnapshots, getListSnapshotsQueryKey, useCreateSnapshot, useRollbackSnapshot, useDeleteSnapshot } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HardDrive, Plus, History, Trash2 } from "lucide-react";
import { formatDate, formatBytes } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Snapshots() {
  const { data: snapshots } = useListSnapshots();
  const deleteSnapshot = useDeleteSnapshot();
  const rollbackSnapshot = useRollbackSnapshot();
  const queryClient = useQueryClient();

  const handleRollback = (id: string) => {
    if (confirm("Rollback workspace to this snapshot? Unsaved changes will be lost.")) {
      rollbackSnapshot.mutate({ snapshotId: id }, {
        onSuccess: () => {
          toast.success("Rolled back successfully");
        }
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this snapshot?")) {
      deleteSnapshot.mutate({ snapshotId: id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSnapshotsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Snapshots</h1>
          <p className="text-muted-foreground font-mono mt-1">Point-in-time recovery for active projects</p>
        </div>
        <CreateSnapshotDialog />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-4">
          {snapshots?.map((snap) => (
            <Card key={snap.id} className="bg-card border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{snap.label}</div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground font-mono">
                      <span className="text-primary">{snap.projectName}</span>
                      <span>•</span>
                      <span>SIZE: {formatBytes(snap.sizeBytes)}</span>
                      <span>•</span>
                      <span>{formatDate(snap.createdAt)}</span>
                      {snap.agentKey && (
                        <>
                          <span>•</span>
                          <span>AGENT: {snap.agentKey}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="font-mono gap-2" onClick={() => handleRollback(snap.id)}>
                    <History className="w-4 h-4" /> ROLLBACK
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(snap.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!snapshots?.length && (
            <div className="text-center p-12 text-muted-foreground font-mono">No snapshots found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateSnapshotDialog() {
  const [open, setOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [label, setLabel] = useState("");
  
  const createSnapshot = useCreateSnapshot();
  const queryClient = useQueryClient();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSnapshot.mutate({
      data: { projectName, label }
    }, {
      onSuccess: () => {
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: getListSnapshotsQueryKey() });
        setLabel("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 font-mono"><Plus className="w-4 h-4" /> CREATE_SNAPSHOT</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-primary" /> CAPTURE_STATE
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input required value={projectName} onChange={e => setProjectName(e.target.value)} className="font-mono bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Snapshot Label</Label>
            <Input required value={label} onChange={e => setLabel(e.target.value)} className="font-mono bg-background" placeholder="e.g. pre-refactor" />
          </div>
          <Button type="submit" className="w-full font-mono gap-2" disabled={createSnapshot.isPending}>
            {createSnapshot.isPending ? "CAPTURING..." : "CAPTURE"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
