"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Inbox, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { CopyButton } from "@/components/shared/copy-button";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RefreshButton } from "@/components/shared/refresh-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiPatch, friendlyApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { usePolling } from "@/lib/hooks/use-polling";
import { useSettings } from "@/lib/hooks/use-settings";
import type { SupportMessageView } from "@/lib/types";

type Filter = "open" | "resolved" | "all";

export function AdminMessagesClient({ initialMessages }: { initialMessages: SupportMessageView[] }) {
  const [messages, setMessages] = useState(initialMessages);
  const [filter, setFilter] = useState<Filter>("open");
  const [updating, setUpdating] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const { settings } = useSettings();
  const { refresh, refreshing } = usePolling<{ messages: SupportMessageView[] }>(
    "/api/admin/support/messages",
    {
      enabled: true,
      intervalMs: Math.max(settings.pollIntervalSeconds * 2000, 20000),
      onData: (data) => {
        setMessages(data.messages);
        setPollError(null);
      },
      onError: setPollError,
    },
  );

  const filtered = useMemo(
    () => messages.filter((message) => filter === "all" || message.status === filter),
    [messages, filter],
  );

  async function setStatus(message: SupportMessageView, status: SupportMessageView["status"]) {
    setUpdating(message.id);
    try {
      const result = await apiPatch<{ status: string; message: string }>(
        `/api/admin/support/messages/${message.id}`,
        { status },
      );
      setMessages((current) =>
        current.map((item) => (item.id === message.id ? { ...item, status } : item)),
      );
      toast.success(result.message);
    } catch (error) {
      toast.error(friendlyApiError(error, "Status pesan gagal diperbarui."));
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Administrator"
        title="Pesan Masuk"
        description="Pesan dari formulir kontak publik. Balas melalui email pengguna, lalu tandai pesan sebagai selesai."
        actions={<RefreshButton onClick={() => void refresh()} loading={refreshing} />}
      />

      {pollError && <Alert variant="warning"><AlertDescription>{pollError} Data terakhir tetap ditampilkan.</AlertDescription></Alert>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
          <TabsList>
            <TabsTrigger value="open">Belum selesai</TabsTrigger>
            <TabsTrigger value="resolved">Selesai</TabsTrigger>
            <TabsTrigger value="all">Semua</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">{messages.filter((item) => item.status === "open").length} pesan menunggu peninjauan</p>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={Inbox} title="Tidak ada pesan" description="Belum ada pesan kontak pada filter ini." />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((message) => (
            <Card key={message.id} className="p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold">{message.subject}</h3>
                    <Badge variant={message.status === "open" ? "amber" : "green"}>
                      {message.status === "open" ? "Belum selesai" : "Selesai"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {message.name} · {formatDateTime(message.createdAt)} WIB
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <CopyButton value={message.email} label="Salin email" iconOnly size="icon" variant="ghost" />
                  <Button asChild variant="outline" size="sm">
                    <a href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}>
                      <Mail className="h-4 w-4" /> Balas
                    </a>
                  </Button>
                </div>
              </div>
              <p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm leading-6 text-muted-foreground">
                {message.message}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-auto truncate font-mono text-xs text-muted-foreground">{message.email}</span>
                <Button
                  size="sm"
                  variant={message.status === "open" ? "default" : "outline"}
                  onClick={() => void setStatus(message, message.status === "open" ? "resolved" : "open")}
                  disabled={updating === message.id}
                >
                  {message.status === "open" ? <CheckCircle2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                  {updating === message.id ? "Memproses..." : message.status === "open" ? "Tandai selesai" : "Buka kembali"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
