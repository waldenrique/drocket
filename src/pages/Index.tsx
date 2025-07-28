import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Session } from "@supabase/supabase-js";
import { Link2, LogOut, Plus, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";

interface PageFormData {
  title: string;
  slug: string;
  description?: string;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<PageFormData>();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Load user's page after auth
        if (session?.user) {
          setTimeout(() => {
            loadUserPage(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Load user's page if user exists
      if (session?.user) {
        loadUserPage(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserPage = async (userId: string) => {
    setPageLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao carregar página:', error);
        return;
      }
      
      setPage(data);
      
      // Se existe página, preencher o formulário
      if (data) {
        setValue('title', data.title);
        setValue('slug', data.slug);
        setValue('description', data.description || '');
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const onSubmit = async (data: PageFormData) => {
    if (!user) return;
    
    setPageLoading(true);
    try {
      // Verificar se o slug já existe (por outro usuário)
      const { data: existingPage } = await supabase
        .from('pages')
        .select('id, user_id')
        .eq('slug', data.slug)
        .maybeSingle();
      
      if (existingPage && existingPage.user_id !== user.id) {
        toast({
          title: "Erro",
          description: "Este slug já está em uso. Escolha outro.",
          variant: "destructive"
        });
        setPageLoading(false);
        return;
      }
      
      const pageData = {
        title: data.title,
        slug: data.slug,
        description: data.description,
        user_id: user.id
      };
      
      if (page) {
        // Atualizar página existente
        const { error } = await supabase
          .from('pages')
          .update(pageData)
          .eq('id', page.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Página atualizada com sucesso!",
        });
      } else {
        // Criar nova página
        const { data: newPage, error } = await supabase
          .from('pages')
          .insert(pageData)
          .select()
          .single();
        
        if (error) throw error;
        
        setPage(newPage);
        toast({
          title: "Sucesso",
          description: "Página criada com sucesso!",
        });
      }
      
      setShowForm(false);
      // Recarregar dados
      await loadUserPage(user.id);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar página.",
        variant: "destructive"
      });
    } finally {
      setPageLoading(false);
    }
  };

  const handleEditClick = () => {
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setShowForm(false);
    if (page) {
      // Resetar formulário com dados da página existente
      setValue('title', page.title);
      setValue('slug', page.slug);
      setValue('description', page.description || '');
    } else {
      reset();
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout.",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até à próxima!",
      });
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="flex items-center justify-center mb-6">
            <Link2 className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              LinkBio
            </h1>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Crie a sua página de links</h2>
          <p className="text-muted-foreground mb-8">
            Uma plataforma simples e poderosa para centralizar todos os seus links numa página personalizada.
          </p>
          <Button 
            onClick={() => navigate("/auth")} 
            size="lg"
            className="w-full"
          >
            Começar agora
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link2 className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-bold">LinkBio</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {user.user_metadata?.display_name || user.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">Bem-vindo ao seu painel</h2>
          <p className="text-xl text-muted-foreground">
            Gerir a sua página de links
          </p>
        </div>

        {pageLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Estado da página */}
            {!showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>A sua página LinkBio</span>
                    <div className="flex gap-2">
                      {page && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${page.slug}`, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver página
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditClick}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {page ? 'Editar' : 'Criar'}
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {page ? (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium">Título</Label>
                        <p className="text-lg">{page.title}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">URL</Label>
                        <p className="text-muted-foreground">linkbio.com/{page.slug}</p>
                      </div>
                      {page.description && (
                        <div>
                          <Label className="text-sm font-medium">Descrição</Label>
                          <p className="text-muted-foreground">{page.description}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={`inline-block w-2 h-2 rounded-full ${page.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {page.is_active ? 'Página ativa' : 'Página inativa'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Plus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">Ainda não tem uma página</h3>
                      <p className="text-muted-foreground mb-4">
                        Crie a sua primeira página LinkBio para começar a partilhar os seus links.
                      </p>
                      <Button onClick={handleEditClick}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar página
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Formulário de criação/edição */}
            {showForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{page ? 'Editar página' : 'Criar nova página'}</CardTitle>
                  <CardDescription>
                    {page ? 'Atualize os detalhes da sua página' : 'Configure a sua página LinkBio'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título da página *</Label>
                      <Input
                        id="title"
                        placeholder="Ex: João Silva - Links"
                        {...register('title', { 
                          required: 'Título é obrigatório',
                          minLength: { value: 2, message: 'Título deve ter pelo menos 2 caracteres' }
                        })}
                      />
                      {errors.title && (
                        <p className="text-sm text-red-500">{errors.title.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="slug">URL personalizada *</Label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                          linkbio.com/
                        </span>
                        <Input
                          id="slug"
                          placeholder="joao-silva"
                          className="rounded-l-none"
                          {...register('slug', { 
                            required: 'Slug é obrigatório',
                            pattern: {
                              value: /^[a-z0-9-]+$/,
                              message: 'Use apenas letras minúsculas, números e hífens'
                            },
                            minLength: { value: 3, message: 'Slug deve ter pelo menos 3 caracteres' }
                          })}
                        />
                      </div>
                      {errors.slug && (
                        <p className="text-sm text-red-500">{errors.slug.message}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Use apenas letras minúsculas, números e hífens. Ex: joao-silva
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva brevemente o que os visitantes encontrarão na sua página..."
                        rows={3}
                        {...register('description')}
                      />
                      <p className="text-sm text-muted-foreground">
                        Opcional: ajude os visitantes a entender do que se trata a sua página
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" disabled={pageLoading}>
                        {pageLoading ? 'A guardar...' : (page ? 'Atualizar' : 'Criar página')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={pageLoading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
