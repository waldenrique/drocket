import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Session } from "@supabase/supabase-js";
import { Link2, LogOut, Plus, Edit, Eye, Trash2, GripVertical, ExternalLink, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import PageCustomization from "@/components/PageCustomization";
import ImageUpload from "@/components/ImageUpload";

// Import testimonial images
import testimonialWoman1 from "@/assets/testimonial-woman-1.jpg";
import testimonialMan1 from "@/assets/testimonial-man-1.jpg";
import testimonialMan2 from "@/assets/testimonial-man-2.jpg";
import testimonialWoman2 from "@/assets/testimonial-woman-2.jpg";

interface PageFormData {
  title: string;
  slug: string;
  description?: string;
}

interface LinkFormData {
  title: string;
  url: string;
  icon?: string;
}

interface Link {
  id: string;
  title: string;
  url: string;
  icon?: string;
  position: number;
  is_active: boolean;
  click_count: number;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<PageFormData>();
  const { register: registerLink, handleSubmit: handleSubmitLink, formState: { errors: linkErrors }, setValue: setLinkValue, reset: resetLink } = useForm<LinkFormData>();

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
      // Load user page
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
      
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
      }
      
      // Se existe página, preencher o formulário e carregar links
      if (data) {
        setValue('title', data.title);
        setValue('slug', data.slug);
        setValue('description', data.description || '');
        
        // Carregar links da página
        loadPageLinks(data.id);
      }
    } catch (error) {
      console.error('Erro ao carregar página:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const loadPageLinks = async (pageId: string) => {
    setLinksLoading(true);
    try {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('page_id', pageId)
        .order('position');
      
      if (error) {
        console.error('Erro ao carregar links:', error);
        return;
      }
      
      setLinks(data || []);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
    } finally {
      setLinksLoading(false);
    }
  };

  const onSubmitLink = async (data: LinkFormData) => {
    if (!page) return;
    
    setLinksLoading(true);
    try {
      let url = data.url;
      
      // Add https:// if no protocol is provided
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      
      const linkData = {
        title: data.title,
        url: url,
        icon: data.icon || '',
        page_id: page.id,
        position: editingLink ? editingLink.position : links.length,
        is_active: true
      };
      
      if (editingLink) {
        // Atualizar link existente
        const { error } = await supabase
          .from('links')
          .update(linkData)
          .eq('id', editingLink.id);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Link atualizado com sucesso!",
        });
      } else {
        // Criar novo link
        const { error } = await supabase
          .from('links')
          .insert(linkData);
        
        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Link criado com sucesso!",
        });
      }
      
      setShowLinkForm(false);
      setEditingLink(null);
      resetLink();
      // Recarregar links
      await loadPageLinks(page.id);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar link.",
        variant: "destructive"
      });
    } finally {
      setLinksLoading(false);
    }
  };

  const handleEditLink = (link: Link) => {
    setEditingLink(link);
    setLinkValue('title', link.title);
    setLinkValue('url', link.url);
    setLinkValue('icon', link.icon || '');
    setShowLinkForm(true);
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Tem certeza que deseja excluir este link?')) return;
    
    setLinksLoading(true);
    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', linkId);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Link excluído com sucesso!",
      });
      
      // Recarregar links
      if (page) await loadPageLinks(page.id);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir link.",
        variant: "destructive"
      });
    } finally {
      setLinksLoading(false);
    }
  };

  const handleToggleLink = async (linkId: string, isActive: boolean) => {
    setLinksLoading(true);
    try {
      const { error } = await supabase
        .from('links')
        .update({ is_active: !isActive })
        .eq('id', linkId);
      
      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: `Link ${!isActive ? 'ativado' : 'desativado'} com sucesso!`,
      });
      
      // Recarregar links
      if (page) await loadPageLinks(page.id);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar estado do link.",
        variant: "destructive"
      });
    } finally {
      setLinksLoading(false);
    }
  };

  const handleCancelLinkEdit = () => {
    setShowLinkForm(false);
    setEditingLink(null);
    resetLink();
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Link2 className="h-6 w-6 text-primary mr-2" />
              <button 
                onClick={() => navigate("/")}
                className="text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                RocketLink
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/pricing")}
                className="text-primary hover:text-primary/80"
              >
                Preços
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/auth")}
              >
                Entrar
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
              >
                Começar
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto text-center max-w-4xl">
            <div className="animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Todos os seus links
                <br />
                <span className="text-foreground">numa só página</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Crie uma página profissional que centraliza todos os seus links importantes. 
                Simples, elegante e poderoso.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/auth")}
                  className="text-lg px-8 py-6 hover-scale"
                >
                  Começar Gratuitamente
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/pricing")}
                  className="text-lg px-8 py-6 hover-scale"
                >
                  Ver Planos Premium
                </Button>
              </div>
              <div className="text-sm text-muted-foreground">
                ✨ Sem cartão de crédito • 15 dias grátis no Premium
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-muted/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Porquê escolher o RocketLink?</h2>
              <p className="text-xl text-muted-foreground">
                A plataforma mais completa para gerir os seus links online
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6 rounded-2xl bg-background/50 backdrop-blur-sm hover-scale">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Link2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Setup em Minutos</h3>
                <p className="text-muted-foreground">
                  Configure a sua página em menos de 5 minutos. Interface intuitiva e fácil de usar.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-2xl bg-background/50 backdrop-blur-sm hover-scale">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Design Profissional</h3>
                <p className="text-muted-foreground">
                  Templates modernos e customizáveis que fazem a diferença na sua presença online.
                </p>
              </div>
              
              <div className="text-center p-6 rounded-2xl bg-background/50 backdrop-blur-sm hover-scale">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Analytics Avançado</h3>
                <p className="text-muted-foreground">
                  Acompanhe cliques, origem do tráfego e performance dos seus links em tempo real.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Como funciona?</h2>
              <p className="text-xl text-muted-foreground">
                Três passos simples para ter a sua página online
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Crie a sua conta</h3>
                <p className="text-muted-foreground">
                  Registe-se gratuitamente e comece imediatamente
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Adicione os seus links</h3>
                <p className="text-muted-foreground">
                  Personalize a sua página e adicione todos os links importantes
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Partilhe com o mundo</h3>
                <p className="text-muted-foreground">
                  Use o seu link personalizado em qualquer lugar
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
          <div className="container mx-auto text-center max-w-3xl">
            <h2 className="text-4xl font-bold mb-4">
              Pronto para criar a sua página de links?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a milhares de criadores, empresários e profissionais que já usam o RocketLink
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 hover-scale"
              >
                Começar Gratuitamente
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate("/pricing")}
                className="text-lg px-8 py-6 hover-scale"
              >
                Ver Todos os Planos
              </Button>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">O que dizem os nossos utilizadores</h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-background/50 p-6 rounded-2xl border hover-scale">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonialWoman1} 
                    alt="Sofia Costa" 
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div>
                    <div className="font-semibold">Sofia Costa</div>
                    <div className="text-sm text-muted-foreground">Influencer Digital</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "O RocketLink transformou a forma como partilho os meus links. Interface simples e resultado profissional!"
                </p>
              </div>
              
              <div className="bg-background/50 p-6 rounded-2xl border hover-scale">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonialMan1} 
                    alt="João Silva" 
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div>
                    <div className="font-semibold">João Silva</div>
                    <div className="text-sm text-muted-foreground">Empreendedor</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Os analytics do RocketLink ajudaram-me a entender melhor o meu público. Recomendo!"
                </p>
              </div>
              
              <div className="bg-background/50 p-6 rounded-2xl border hover-scale">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonialMan2} 
                    alt="Pedro Santos" 
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div>
                    <div className="font-semibold">Pedro Santos</div>
                    <div className="text-sm text-muted-foreground">Content Creator</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Finalmente uma solução completa para gerir todos os meus links. O suporte é excelente!"
                </p>
              </div>
              
              <div className="bg-background/50 p-6 rounded-2xl border hover-scale">
                <div className="flex items-center mb-4">
                  <img 
                    src={testimonialWoman2} 
                    alt="Ana Rodrigues" 
                    className="w-12 h-12 rounded-full object-cover mr-3"
                  />
                  <div>
                    <div className="font-semibold">Ana Rodrigues</div>
                    <div className="text-sm text-muted-foreground">Empresária</div>
                  </div>
                </div>
                <p className="text-muted-foreground">
                  "Desde que uso o RocketLink, as minhas conversões aumentaram 40%. Uma ferramenta indispensável!"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto text-center max-w-3xl">
            <h2 className="text-4xl font-bold mb-4">
              Não perca mais tempo
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Crie a sua página de links profissional hoje mesmo. É grátis para começar!
            </p>
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6 hover-scale"
            >
              Criar Conta Grátis
            </Button>
            <div className="mt-4 text-sm opacity-75">
              Sem compromisso • Cancele quando quiser
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-8 px-4">
          <div className="container mx-auto text-center">
            <div className="flex items-center justify-center mb-4">
              <Link2 className="h-6 w-6 text-primary mr-2" />
              <button 
                onClick={() => navigate("/")}
                className="font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                RocketLink
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 RocketLink. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <Link2 className="h-6 w-6 text-primary mr-2" />
              <button 
                onClick={() => navigate("/")}
                className="text-lg sm:text-xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
              >
                RocketLink
              </button>
            </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/pricing")}
              className="text-primary hover:text-primary/80"
            >
              Planos
            </Button>
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Olá, {user.user_metadata?.display_name || user.email}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Bem-vindo ao seu painel</h2>
          <p className="text-lg sm:text-xl text-muted-foreground">
            Gerir a sua página de links
          </p>
        </div>

        {pageLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {/* Estado da página */}
            {!showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-lg sm:text-xl">A sua página RocketLink</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {page && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${page.slug}`, '_blank')}
                          className="w-full sm:w-auto"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver página
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditClick}
                        className="w-full sm:w-auto"
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
                        <p className="text-muted-foreground">rocketlink.com/{page.slug}</p>
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
                        Crie a sua primeira página RocketLink para começar a partilhar os seus links.
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
                    {page ? 'Atualize os detalhes da sua página' : 'Configure a sua página RocketLink'}
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
                          rocketlink.com/
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

                     {/* Upload de foto de perfil */}
                     <ImageUpload
                       currentImageUrl={profile?.avatar_url}
                       onImageUploaded={(url) => {
                         setProfile(prev => ({ ...prev, avatar_url: url }));
                         toast({
                           title: "Sucesso!",
                           description: "Foto atualizada! Ela aparecerá na sua página pública.",
                         });
                       }}
                       onImageRemoved={() => {
                         setProfile(prev => ({ ...prev, avatar_url: null }));
                       }}
                       label="Foto de perfil / Logo"
                       placeholder="Adicione uma foto que representará você na página pública"
                     />

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

            {/* Seção de Links - só aparece se tem página e não está editando página */}
            {page && !showForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Links da página</span>
                    <Button
                      size="sm"
                      onClick={() => setShowLinkForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar link
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Gerencie os links que aparecerão na sua página
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {linksLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {links.length === 0 ? (
                        <div className="text-center py-8">
                          <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium mb-2">Nenhum link adicionado</h3>
                          <p className="text-muted-foreground mb-4">
                            Adicione o seu primeiro link para começar a construir a sua página.
                          </p>
                          <Button onClick={() => setShowLinkForm(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar primeiro link
                          </Button>
                        </div>
                      ) : (
                        links.map((link, index) => (
                          <div
                            key={link.id}
                            className={`flex items-center gap-4 p-4 rounded-lg border ${
                              link.is_active ? 'bg-background' : 'bg-muted/50'
                            }`}
                          >
                            <div className="flex items-center text-muted-foreground">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium truncate ${!link.is_active ? 'text-muted-foreground' : ''}`}>
                                  {link.title}
                                </h4>
                                {!link.is_active && (
                                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{link.url}</p>
                              <p className="text-xs text-muted-foreground">
                                {link.click_count} cliques
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(link.url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleLink(link.id, link.is_active)}
                                disabled={linksLoading}
                              >
                                {link.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditLink(link)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLink(link.id)}
                                disabled={linksLoading}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Formulário de criação/edição de link */}
            {showLinkForm && (
              <Card>
                <CardHeader>
                  <CardTitle>{editingLink ? 'Editar link' : 'Adicionar novo link'}</CardTitle>
                  <CardDescription>
                    {editingLink ? 'Atualize os detalhes do link' : 'Adicione um novo link à sua página'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitLink(onSubmitLink)} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="linkTitle">Título do link *</Label>
                      <Input
                        id="linkTitle"
                        placeholder="Ex: Meu Instagram, Meu Website, etc."
                        {...registerLink('title', { 
                          required: 'Título é obrigatório',
                          minLength: { value: 2, message: 'Título deve ter pelo menos 2 caracteres' }
                        })}
                      />
                      {linkErrors.title && (
                        <p className="text-sm text-red-500">{linkErrors.title.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkUrl">URL *</Label>
                      <Input
                        id="linkUrl"
                        placeholder="Ex: instagram.com/usuario, meusite.com, etc."
                        {...registerLink('url', { 
                          required: 'URL é obrigatória',
                          pattern: {
                            value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                            message: 'URL inválida'
                          }
                        })}
                      />
                      {linkErrors.url && (
                        <p className="text-sm text-red-500">{linkErrors.url.message}</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        Pode incluir ou omitir https:// - será adicionado automaticamente se necessário
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkIcon">Ícone (opcional)</Label>
                      <Input
                        id="linkIcon"
                        placeholder="Ex: 📱, 🌐, 💼, etc."
                        {...registerLink('icon')}
                      />
                      <p className="text-sm text-muted-foreground">
                        Adicione um emoji que represente o link (opcional)
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" disabled={linksLoading}>
                        {linksLoading ? 'A guardar...' : (editingLink ? 'Atualizar link' : 'Adicionar link')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelLinkEdit}
                        disabled={linksLoading}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Personalização da página */}
            {page && !showForm && (
              <PageCustomization 
                page={page} 
                onUpdate={() => loadUserPage(user?.id || '')}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
