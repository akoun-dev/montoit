import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Copy, Trash2, Eye } from "lucide-react";
import { DataTable } from "./DataTable";

interface LeaseTemplate {
  id: string;
  name: string;
  description: string | null;
  template_type: string;
  content: {
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
  variables: string[];
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  template_type: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

const STANDARD_VARIABLES = [
  "landlord_name", "landlord_address", "landlord_phone",
  "tenant_name", "tenant_address", "tenant_phone",
  "property_address", "property_type", "bedrooms", "bathrooms", "surface_area",
  "monthly_rent", "deposit_amount", "charges_amount",
  "start_date", "end_date", "lease_duration"
];

export function LeaseTemplateManager() {
  const [templates, setTemplates] = useState<LeaseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<LeaseTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<LeaseTemplate | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: "",
    description: "",
    template_type: "residential",
    sections: [{ title: "", content: "" }]
  });
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("lease_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as any as LeaseTemplate[]);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les modèles",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      template_type: "residential",
      sections: [{ title: "Nouvelle section", content: "" }]
    });
    setActiveSectionIndex(0);
    setShowDialog(true);
  };

  const handleEdit = (template: LeaseTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      template_type: template.template_type,
      sections: template.content.sections
    });
    setActiveSectionIndex(0);
    setShowDialog(true);
  };

  const handleDuplicate = async (template: LeaseTemplate) => {
    try {
      const { error } = await supabase
        .from("lease_templates")
        .insert({
          name: `${template.name} (copie)`,
          description: template.description,
          template_type: template.template_type,
          content: template.content,
          variables: template.variables,
          is_active: false,
          is_default: false
        });

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Modèle dupliqué avec succès"
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce modèle ?")) return;

    try {
      const { error } = await supabase
        .from("lease_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Modèle supprimé avec succès"
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        template_type: formData.template_type,
        content: { sections: formData.sections },
        variables: STANDARD_VARIABLES
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("lease_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Modèle mis à jour avec succès"
        });
      } else {
        const { error } = await supabase
          .from("lease_templates")
          .insert(templateData);

        if (error) throw error;

        toast({
          title: "Succès",
          description: "Modèle créé avec succès"
        });
      }

      setShowDialog(false);
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const insertVariable = (variable: string) => {
    const section = formData.sections[activeSectionIndex];
    const newContent = section.content + `{{${variable}}}`;
    
    const newSections = [...formData.sections];
    newSections[activeSectionIndex] = { ...section, content: newContent };
    
    setFormData({ ...formData, sections: newSections });
  };

  const updateSection = (index: number, field: "title" | "content", value: string) => {
    const newSections = [...formData.sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setFormData({ ...formData, sections: newSections });
  };

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { title: "Nouvelle section", content: "" }]
    });
    setActiveSectionIndex(formData.sections.length);
  };

  const removeSection = (index: number) => {
    if (formData.sections.length === 1) {
      toast({
        title: "Erreur",
        description: "Un modèle doit avoir au moins une section",
        variant: "destructive"
      });
      return;
    }
    
    const newSections = formData.sections.filter((_, i) => i !== index);
    setFormData({ ...formData, sections: newSections });
    setActiveSectionIndex(Math.max(0, activeSectionIndex - 1));
  };

  const renderPreview = (template: LeaseTemplate) => {
    const sampleData: Record<string, string> = {
      landlord_name: "Jean DUPONT",
      landlord_address: "123 Avenue de la République, Abidjan",
      landlord_phone: "+225 07 12 34 56 78",
      tenant_name: "Marie KOUASSI",
      tenant_address: "456 Boulevard Latrille, Abidjan",
      tenant_phone: "+225 05 98 76 54 32",
      property_address: "Cocody Riviera Golf, Villa 789",
      property_type: "Villa",
      bedrooms: "3",
      bathrooms: "2",
      surface_area: "150",
      monthly_rent: "500 000",
      deposit_amount: "1 000 000",
      charges_amount: "50 000",
      start_date: "01/01/2025",
      end_date: "31/12/2025",
      lease_duration: "12 mois"
    };

    return template.content.sections.map((section, idx) => {
      let content = section.content;
      Object.entries(sampleData).forEach(([key, value]) => {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      return (
        <div key={idx} className="mb-6">
          <h3 className="text-lg font-bold mb-2">{section.title}</h3>
          <p className="whitespace-pre-wrap text-sm">{content}</p>
        </div>
      );
    });
  };

  const columns: any = [
    {
      accessorKey: "name",
      header: "Nom du modèle",
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          {row.original.is_default && (
            <Badge variant="secondary" className="mt-1">Par défaut</Badge>
          )}
        </div>
      )
    },
    {
      accessorKey: "template_type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.original.template_type === "residential" ? "Résidentiel" : row.original.template_type}
        </Badge>
      )
    },
    {
      accessorKey: "is_active",
      header: "Statut",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Actif" : "Inactif"}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPreviewTemplate(row.original);
              setShowPreview(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDuplicate(row.original)}>
            <Copy className="h-4 w-4" />
          </Button>
          {!row.original.is_default && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Modèles de Baux</h2>
          <p className="text-muted-foreground">Gérez les modèles de contrats de location</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau modèle
        </Button>
      </div>

      <DataTable columns={columns} data={templates} loading={loading} />

      {/* Editor Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Modifier le modèle" : "Nouveau modèle"}
            </DialogTitle>
            <DialogDescription>
              Personnalisez votre modèle de bail en utilisant les variables disponibles
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-6">
            {/* Column 1: Basic Info & Sections List */}
            <div className="space-y-4">
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Bail résidentiel standard"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du modèle"
                  rows={3}
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select value={formData.template_type} onValueChange={(value) => setFormData({ ...formData, template_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Résidentiel</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Sections</Label>
                  <Button size="sm" variant="outline" onClick={addSection}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded border cursor-pointer flex justify-between items-center ${
                        idx === activeSectionIndex ? "bg-accent" : ""
                      }`}
                      onClick={() => setActiveSectionIndex(idx)}
                    >
                      <span className="text-sm truncate">{section.title || "Sans titre"}</span>
                      {formData.sections.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSection(idx);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2">Variables disponibles</Label>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_VARIABLES.map((variable) => (
                    <Badge
                      key={variable}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => insertVariable(variable)}
                    >
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Column 2: Section Editor */}
            <div className="space-y-4">
              <div>
                <Label>Titre de la section</Label>
                <Input
                  value={formData.sections[activeSectionIndex]?.title || ""}
                  onChange={(e) => updateSection(activeSectionIndex, "title", e.target.value)}
                  placeholder="Ex: Parties au contrat"
                />
              </div>

              <div>
                <Label>Contenu de la section</Label>
                <Textarea
                  value={formData.sections[activeSectionIndex]?.content || ""}
                  onChange={(e) => updateSection(activeSectionIndex, "content", e.target.value)}
                  placeholder="Saisissez le contenu. Cliquez sur une variable pour l'insérer."
                  rows={20}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* Column 3: Live Preview */}
            <div className="border rounded-lg p-4 overflow-y-auto max-h-[600px]">
              <h4 className="font-bold mb-4">Aperçu en temps réel</h4>
              {renderPreview({
                ...editingTemplate!,
                content: { sections: formData.sections }
              } as LeaseTemplate)}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
            <DialogDescription>{previewTemplate?.description}</DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg p-6 space-y-4">
            {previewTemplate && renderPreview(previewTemplate)}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
