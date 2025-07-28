import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, X, Loader2, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  onImageRemoved: () => void;
  label?: string;
  placeholder?: string;
}

export const ImageUpload = ({ 
  currentImageUrl, 
  onImageUploaded, 
  onImageRemoved,
  label = "Foto de perfil",
  placeholder = "Clique para adicionar uma foto"
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Function to resize image
  const resizeImage = useCallback((file: File, maxWidth: number = 400, maxHeight: number = 400, quality: number = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        // Set canvas size and draw image
        canvas.width = width;
        canvas.height = height;
        
        // Improve image quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione apenas arquivos de imagem.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (9MB max)
    if (file.size > 9 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 9MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);

      // Resize image
      const resizedBlob = await resizeImage(file);
      
      if (!resizedBlob) {
        throw new Error('Falha ao processar a imagem');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Create file name
      const fileExt = 'jpg';
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Falha ao obter URL da imagem');
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (profileError) {
        throw profileError;
      }

      onImageUploaded(urlData.publicUrl);
      
      toast({
        title: "Sucesso!",
        description: "Foto carregada e otimizada com sucesso.",
      });

    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao carregar a imagem. Tente novamente.",
        variant: "destructive"
      });
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [resizeImage, onImageUploaded, currentImageUrl, toast]);

  const handleRemoveImage = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update profile to remove avatar
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreviewUrl(null);
      onImageRemoved();

      toast({
        title: "Imagem removida",
        description: "A foto foi removida com sucesso.",
      });
    } catch (error: any) {
      console.error('Error removing image:', error);
      toast({
        title: "Erro",
        description: "Falha ao remover a imagem.",
        variant: "destructive"
      });
    }
  }, [onImageRemoved, toast]);

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">{label}</Label>
      
      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <Avatar className="h-20 w-20 ring-2 ring-border">
          <AvatarImage 
            src={previewUrl || undefined} 
            className="object-cover"
          />
          <AvatarFallback className="bg-muted">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Carregar foto
                </>
              )}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                disabled={isUploading}
                className="flex items-center gap-2 text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4" />
                Remover
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Recomendado: imagem quadrada, máximo 9MB. A imagem será redimensionada automaticamente.
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;