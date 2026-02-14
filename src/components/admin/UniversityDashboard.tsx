import { useState } from "react";
import { useUniversityModules, useUniversityLessons } from "@/hooks/useUniversity";
import { useToast } from "@/hooks/use-toast";
import type { UniversityModule, UniversityLesson, UniversityStatus, UniversityLevel } from "@/types/university";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GraduationCap, Plus, Pencil, Trash2, ChevronRight, ArrowLeft,
  BookOpen, Clock, Star, Eye, Archive, FileText, GripVertical,
} from "lucide-react";

const STATUS_LABELS: Record<UniversityStatus, string> = {
  draft: "Rascunho",
  published: "Publicado",
  archived: "Arquivado",
};

const STATUS_COLORS: Record<UniversityStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-success/10 text-success",
  archived: "bg-warning/10 text-warning",
};

const LEVEL_LABELS: Record<UniversityLevel, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export function UniversityDashboard() {
  const { modules, loading: modulesLoading, saveModule, deleteModule } = useUniversityModules(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Partial<UniversityModule>>({});
  const [lessonDialog, setLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Partial<UniversityLesson>>({});
  const { toast } = useToast();

  const selectedModule = modules.find(m => m.id === selectedModuleId);
  const { lessons, loading: lessonsLoading, saveLesson, deleteLesson } = useUniversityLessons(selectedModuleId || undefined, true);

  const handleSaveModule = async () => {
    try {
      await saveModule(editingModule);
      setModuleDialog(false);
      setEditingModule({});
      toast({ title: "Módulo salvo com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  const handleSaveLesson = async () => {
    try {
      await saveLesson({ ...editingLesson, module_id: selectedModuleId! });
      setLessonDialog(false);
      setEditingLesson({});
      toast({ title: "Aula salva com sucesso!" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    }
  };

  // Module list view
  if (!selectedModuleId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Universidade
            </h2>
            <p className="text-sm text-muted-foreground">Gerencie módulos e aulas educacionais</p>
          </div>
          <Button onClick={() => { setEditingModule({}); setModuleDialog(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Módulo
          </Button>
        </div>

        {modulesLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : modules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Nenhum módulo criado</h3>
              <p className="text-muted-foreground mb-4">Comece criando o primeiro módulo da Universidade.</p>
              <Button onClick={() => { setEditingModule({}); setModuleDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Criar Módulo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {modules.map((mod, idx) => (
              <Card key={mod.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedModuleId(mod.id)}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex items-center text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="text-xs ml-1 font-mono w-6">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{mod.title}</h3>
                      <Badge className={STATUS_COLORS[mod.status]}>{STATUS_LABELS[mod.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{mod.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setEditingModule(mod); setModuleDialog(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={async (e) => {
                      e.stopPropagation();
                      if (confirm("Excluir este módulo e todas as aulas?")) {
                        await deleteModule(mod.id);
                        toast({ title: "Módulo excluído" });
                      }
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Module Dialog */}
        <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingModule.id ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editingModule.title || ""} onChange={e => setEditingModule(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Precificação Básica" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={editingModule.description || ""} onChange={e => setEditingModule(p => ({ ...p, description: e.target.value }))} placeholder="Breve descrição do módulo" rows={3} />
              </div>
              <div>
                <Label>Imagem de Capa (URL)</Label>
                <Input value={editingModule.cover_image_url || ""} onChange={e => setEditingModule(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Posição</Label>
                  <Input type="number" value={editingModule.order_position ?? 0} onChange={e => setEditingModule(p => ({ ...p, order_position: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editingModule.status || "draft"} onValueChange={v => setEditingModule(p => ({ ...p, status: v as UniversityStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModuleDialog(false)}>Cancelar</Button>
              <Button onClick={handleSaveModule} disabled={!editingModule.title}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Lesson list view for selected module
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedModuleId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{selectedModule?.title}</h2>
            <p className="text-sm text-muted-foreground">{selectedModule?.description}</p>
          </div>
        </div>
        <Button onClick={() => { setEditingLesson({}); setLessonDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Aula
        </Button>
      </div>

      {lessonsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : lessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma aula neste módulo</h3>
            <Button onClick={() => { setEditingLesson({}); setLessonDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Criar Aula
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {lessons.map((lesson, idx) => (
            <Card key={lesson.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex items-center text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                  <span className="text-xs ml-1 font-mono w-6">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold">{lesson.title}</h3>
                    <Badge className={STATUS_COLORS[lesson.status]}>{STATUS_LABELS[lesson.status]}</Badge>
                    <Badge variant="outline">{LEVEL_LABELS[lesson.level]}</Badge>
                    {lesson.is_featured && <Badge className="bg-amber-500/10 text-amber-600"><Star className="h-3 w-3 mr-1" /> Destaque</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{lesson.short_description}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{lesson.reading_time} min</span>
                    <span className="font-mono">/{lesson.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => { setEditingLesson(lesson); setLessonDialog(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={async () => {
                    if (confirm("Excluir esta aula?")) {
                      await deleteLesson(lesson.id);
                      toast({ title: "Aula excluída" });
                    }
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lesson Dialog */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingLesson.id ? "Editar Aula" : "Nova Aula"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editingLesson.title || ""} onChange={e => setEditingLesson(p => ({ ...p, title: e.target.value }))} placeholder="Título da aula" />
              </div>
              <div>
                <Label>Descrição Curta</Label>
                <Input value={editingLesson.short_description || ""} onChange={e => setEditingLesson(p => ({ ...p, short_description: e.target.value }))} placeholder="Resumo breve" />
              </div>
              <div>
                <Label>Conteúdo (HTML)</Label>
                <Textarea
                  value={editingLesson.content || ""}
                  onChange={e => setEditingLesson(p => ({ ...p, content: e.target.value }))}
                  placeholder="<h2>Título</h2><p>Conteúdo da aula...</p>"
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nível</Label>
                  <Select value={editingLesson.level || "iniciante"} onValueChange={v => setEditingLesson(p => ({ ...p, level: v as UniversityLevel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tempo de Leitura (min)</Label>
                  <Input type="number" value={editingLesson.reading_time ?? 5} onChange={e => setEditingLesson(p => ({ ...p, reading_time: parseInt(e.target.value) || 5 }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Posição</Label>
                  <Input type="number" value={editingLesson.order_position ?? 0} onChange={e => setEditingLesson(p => ({ ...p, order_position: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editingLesson.status || "draft"} onValueChange={v => setEditingLesson(p => ({ ...p, status: v as UniversityStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                      <SelectItem value="archived">Arquivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Imagem de Capa (URL)</Label>
                <Input value={editingLesson.cover_image_url || ""} onChange={e => setEditingLesson(p => ({ ...p, cover_image_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editingLesson.is_featured || false} onCheckedChange={v => setEditingLesson(p => ({ ...p, is_featured: v }))} />
                <Label>Marcar como Destaque</Label>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveLesson} disabled={!editingLesson.title}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
