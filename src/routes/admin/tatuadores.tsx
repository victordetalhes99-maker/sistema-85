import { useMemo, useState } from "react";
import { MoreHorizontal, Palette, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/layout/PageHeader";
import { EmptyState } from "@/components/admin/feedback/EmptyState";
import { useTatuadores } from "@/lib/admin-data/hooks";

export default function TatuadoresPage() {
  const { data, isEmpty } = useTatuadores();
  const [q, setQ] = useState("");

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((t) => t.nome.toLowerCase().includes(term));
  }, [data, q]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tatuadores"
        description="Equipe cadastrada no sistema. Volume de atendimento e última atividade serão preenchidos após a integração operacional."
        actions={
          <Button
            className="btn-gold"
            onClick={() => toast.info("Cadastro de tatuadores disponível após integração")}
          >
            Novo tatuador
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tatuador…"
            className="pl-9"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {filtrados.length} de {data.length} tatuadores
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Palette}
          title="Nenhum tatuador cadastrado"
          description="A equipe aparecerá aqui após o cadastro no sistema."
        />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum resultado"
          description="Ajuste a busca ou remova o filtro."
          compact
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead>Tatuador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Clientes de hoje</TableHead>
                <TableHead className="text-right">Atendimentos no mês</TableHead>
                <TableHead>Última atividade</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((t) => (
                <TableRow key={t.id} className="border-border/40">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--gold)]/30 bg-background/60 text-[11px] font-semibold text-[color:var(--gold)]">
                        {t.iniciais}
                      </span>
                      <span className="font-medium">{t.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    >
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {t.clientesHoje ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {t.atendimentosMes ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.ultimaAtividade ?? "—"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled>Ver perfil</DropdownMenuItem>
                        <DropdownMenuItem disabled>Editar</DropdownMenuItem>
                        <DropdownMenuItem disabled className="text-destructive">
                          Remover
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
