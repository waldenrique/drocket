import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palette, Upload, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CustomizationProps {
  page: any;
  onUpdate: () => void;
}

const predefinedColors = [
  { name: "Preto", value: "#000000" },
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#10b981" },
  { name: "Roxo", value: "#8b5cf6" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Laranja", value: "#f97316" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Cinza", value: "#6b7280" },
];

const predefinedGradients = [
  { name: "Oceano", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { name: "Verde", value: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { name: "Fogo", value: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
  { name: "Floresta", value: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
  { name: "Céu", value: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
];

const PageCustomization = ({ page, onUpdate }: CustomizationProps) => {
  const [uploading, setUploading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const updatePageStyle = async (updates: { background_type?: string; background_value?: string; theme_color?: string }) => {
    try {
      setUpdating(true);
      
      const { error } = await supabase
        .from('pages')
        .update(updates)
        .eq('id', page.id);

      if (error) throw error;

      toast({
        title: "Atualizado!",
        description: "Personalização salva com sucesso.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error updating page style:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar personalização.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleColorChange = (color: string) => {
    updatePageStyle({
      background_type: 'color',
      background_value: color,
      theme_color: color
    });
  };

  const handleGradientChange = (gradient: string) => {
    updatePageStyle({
      background_type: 'gradient',
      background_value: gradient
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      const file = event.target.files?.[0];
      if (!file) return;

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro", 
          description: "Apenas imagens são permitidas.",
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${page.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('backgrounds')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('backgrounds')
        .getPublicUrl(fileName);

      updatePageStyle({
        background_type: 'image',
        background_value: publicUrl
      });

    } catch (error) {
      console.error('Error uploading background:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalização
        </CardTitle>
        <CardDescription>
          Personalize o visual da sua página RocketLink
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="gradients" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gradients">Gradientes</TabsTrigger>
            <TabsTrigger value="image">Imagem</TabsTrigger>
            <TabsTrigger value="colors">Cores</TabsTrigger>
          </TabsList>
          
          <TabsContent value="colors" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Cores predefinidas</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => handleColorChange(color.value)}
                    disabled={updating}
                    className={`
                      aspect-square rounded-lg border-2 transition-all hover:scale-105
                      ${page.background_value === color.value ? 'border-white ring-2 ring-primary' : 'border-gray-300'}
                    `}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="custom-color" className="text-sm font-medium">Cor personalizada</Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <Input
                  id="custom-color"
                  type="color"
                  defaultValue={page.background_type === 'color' ? page.background_value : '#000000'}
                  onChange={(e) => handleColorChange(e.target.value)}
                  disabled={updating}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  placeholder="#000000"
                  defaultValue={page.background_type === 'color' ? page.background_value : ''}
                  onBlur={(e) => {
                    if (e.target.value.match(/^#[0-9A-F]{6}$/i)) {
                      handleColorChange(e.target.value);
                    }
                  }}
                  disabled={updating}
                  className="flex-1"
                />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="gradients" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Gradientes predefinidos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {predefinedGradients.map((gradient) => (
                  <button
                    key={gradient.name}
                    onClick={() => handleGradientChange(gradient.value)}
                    disabled={updating}
                    className={`
                      h-16 rounded-lg border-2 transition-all hover:scale-105 relative overflow-hidden
                      ${page.background_value === gradient.value ? 'border-white ring-2 ring-primary' : 'border-gray-300'}
                    `}
                    style={{ background: gradient.value }}
                    title={gradient.name}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm drop-shadow">
                      {gradient.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="image" className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Imagem de fundo</Label>
              
              {page.background_type === 'image' && page.background_value && (
                <div className="mb-4">
                  <div 
                    className="h-32 rounded-lg border border-gray-300 bg-cover bg-center"
                    style={{ backgroundImage: `url(${page.background_value})` }}
                  />
                  <p className="text-sm text-muted-foreground mt-2">Imagem atual</p>
                </div>
              )}
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading || updating}
                  className="hidden"
                  id="background-upload"
                />
                <label 
                  htmlFor="background-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Clique para fazer upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG até 5MB</p>
                      </div>
                    </>
                  )}
                </label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PageCustomization;