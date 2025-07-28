import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link2, LogOut, Plus, Edit, Eye, Trash2, GripVertical, ExternalLink, ToggleLeft, ToggleRight, User as UserIcon, BarChart3, MousePointer, TrendingUp, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Session } from "@supabase/supabase-js";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import PageCustomization from "@/components/PageCustomization";
import ImageUpload from "@/components/ImageUpload";
import TrialBanner from "@/components/TrialBanner";

// Import testimonial images
import { useSubscription } from "@/hooks/useSubscription";
import testimonialWoman2 from "@/assets/testimonial-woman-2.jpg";
import testimonialMan1 from "@/assets/testimonial-man-1.jpg";
import testimonialWoman1 from "@/assets/testimonial-woman-1.jpg";

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
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const { user, isPremium } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<PageFormData>();
  const { register: registerLink, handleSubmit: handleSubmitLink, formState: { errors: linkErrors }, setValue: setLinkValue, reset: resetLink } = useForm<LinkFormData>();

  useEffect(() => {
    if (user) {
      setLoading(false);
      loadUserPage(user.id);
    } else {
      setLoading(false);
    }
  }, [user]);

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
      // Verificar limite de links antes de criar (apenas para novos links)
      if (!editingLink) {
        const { data: canAdd, error: limitError } = await supabase.functions.invoke('check-subscription');
        
        if (limitError) {
          console.error('Erro ao verificar limite:', limitError);
          // Continuar mesmo com erro de verificação para não bloquear usuários premium
        } else if (canAdd && !canAdd.subscribed) {
          // Usuário free: verificar limite na base de dados
          const { data: linkCount } = await supabase
            .from('links')
            .select('id', { count: 'exact' })
            .eq('page_id', page.id);
          
          if (linkCount && linkCount.length >= 2) {
            toast({
              title: "Limite atingido",
              description: "Usuários gratuitos podem criar apenas 2 links. Faça upgrade para Premium!",
              variant: "destructive"
            });
            setLinksLoading(false);
            return;
          }
        }
      }
      
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
        
        if (error) {
          // Verificar se é erro de limite
          if (error.message && error.message.includes('Link limit exceeded')) {
            toast({
              title: "Limite atingido",
              description: "Limite de links atingido para seu plano. Faça upgrade para Premium!",
              variant: "destructive",
              action: (
                <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
                  Ver Planos
                </Button>
              )
            });
            setLinksLoading(false);
            return;
          }
          throw error;
        }
        
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
                    src={testimonialMan1} 
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-primary/[0.05]">
      <header className="border-b bg-background/90 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
              <Link2 className="h-6 w-6 text-primary" />
              <button 
                onClick={() => navigate("/")}
                className="text-lg sm:text-xl font-bold text-primary hover:opacity-80 transition-opacity cursor-pointer"
              >
                RocketLink
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/pricing")}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Planos
            </Button>
            {isPremium && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/analytics")}
                className="text-primary hover:text-primary/80 font-medium"
              >
                <BarChart3 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/profile")}
              className="text-primary hover:text-primary/80 font-medium"
            >
              <UserIcon className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Perfil</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="text-xs sm:text-sm text-muted-foreground hidden sm:block p-1 h-auto hover:text-foreground transition-colors"
            >
              Olá, {user.user_metadata?.display_name || user.email}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSignOut}
              className="shadow-sm"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <TrialBanner />
        
        {/* Hero Section - Premium Dashboard */}
        {isPremium && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Premium Ativo
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Seu Dashboard RocketLink
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Gerencie seus links, acompanhe o desempenho e construa sua presença digital profissional
              </p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Links Ativos</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {links.filter(l => l.is_active).length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-full">
                    <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Total de Cliques</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {links.reduce((sum, link) => sum + (link.click_count || 0), 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <MousePointer className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Status da Página</p>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {page?.is_active ? 'Ativa' : 'Inativa'}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <Eye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Plano Atual</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {isPremium ? 'Premium' : 'Gratuito'}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-500/20 rounded-full">
                    <UserIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        )}

        {/* Hero Section - Free Users */}
        {!isPremium && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Plano Gratuito
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
                Gerencie Seus Links
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Crie e compartilhe seus links importantes
              </p>
              
              {/* Upgrade Call-to-Action */}
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-6 border border-primary/20 max-w-2xl mx-auto">
                <div className="flex items-center justify-center mb-4">
                  <Crown className="h-8 w-8 text-primary mr-2" />
                  <h3 className="text-xl font-semibold text-primary">Desbloqueie o Dashboard Completo</h3>
                </div>
                <p className="text-muted-foreground mb-4">
                  Acesse estatísticas avançadas, links ilimitados e muito mais!
                </p>
                <Button 
                  onClick={() => navigate('/pricing')}
                  className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-6 py-3 rounded-xl font-semibold"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Fazer Upgrade
                </Button>
              </div>
            </div>
          </div>
        )}

        {pageLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando seu dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-8">
            {/* Seção da Página Principal */}
            {!showForm && (
              <div className="space-y-8">
                {/* Card da Página */}
                <Card className="border-0 shadow-xl bg-gradient-to-r from-background to-background/95 overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-8 translate-x-8"></div>
                  <CardHeader className="relative">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl lg:text-3xl font-bold">
                          {page ? 'Sua Página RocketLink' : 'Criar Sua Primeira Página'}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {page ? 
                            'Sua página está configurada e pronta para receber visitantes' : 
                            'Configure sua página personalizada para começar a compartilhar seus links'
                          }
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                        {page && (
                          <Button
                            variant="outline"
                            size="lg"
                            onClick={() => window.open(`/${page.slug}`, '_blank')}
                            className="shadow-md hover:shadow-lg transition-shadow"
                          >
                            <Eye className="h-5 w-5 mr-2" />
                            Ver Página de Divulgação
                          </Button>
                        )}
                        <Button
                          size="lg"
                          onClick={handleEditClick}
                          className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-primary to-primary/90"
                        >
                          <Edit className="h-5 w-5 mr-2" />
                          {page ? 'Editar Página' : 'Criar Página'}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    {page ? (
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Título</Label>
                            <p className="text-xl font-medium mt-1">{page.title}</p>
                          </div>
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">URL</Label>
                            <p className="text-lg text-primary mt-1 font-mono">rocketlink.com/{page.slug}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {page.description && (
                            <div className="p-4 bg-muted/30 rounded-lg">
                              <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descrição</Label>
                              <p className="text-muted-foreground mt-1">{page.description}</p>
                            </div>
                          )}
                          <div className="p-4 bg-muted/30 rounded-lg">
                            <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</Label>
                            <div className="flex items-center gap-3 mt-2">
                              <div className={`w-3 h-3 rounded-full ${page.is_active ? 'bg-green-500' : 'bg-red-500'} shadow-lg`}></div>
                              <span className="font-medium">
                                {page.is_active ? 'Página Ativa e Visível' : 'Página Inativa'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Plus className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">Pronto para começar?</h3>
                        <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
                          Crie sua primeira página RocketLink e comece a compartilhar seus links de forma profissional
                        </p>
                        <Button size="lg" onClick={handleEditClick} className="shadow-lg">
                          <Plus className="h-5 w-5 mr-2" />
                          Criar Minha Primeira Página
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Formulário de criação/edição com design moderno */}
            {showForm && (
              <Card className="border-0 shadow-2xl bg-gradient-to-br from-background to-background/80 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5"></div>
                <CardHeader className="relative bg-gradient-to-r from-primary/10 to-transparent">
                  <CardTitle className="text-3xl font-bold">
                    {page ? 'Personalizar Sua Página' : 'Criar Nova Página RocketLink'}
                  </CardTitle>
                  <CardDescription className="text-lg">
                    {page ? 'Atualize os detalhes e personalize sua página' : 'Configure sua presença digital profissional'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative p-8">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label htmlFor="title" className="text-base font-semibold">Título da página *</Label>
                          <Input
                            id="title"
                            placeholder="Ex: João Silva - Links"
                            className="h-12 text-lg border-2 focus:border-primary transition-colors"
                            {...register('title', { 
                              required: 'Título é obrigatório',
                              minLength: { value: 2, message: 'Título deve ter pelo menos 2 caracteres' }
                            })}
                          />
                          {errors.title && (
                            <p className="text-sm text-red-500 font-medium">{errors.title.message}</p>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="slug" className="text-base font-semibold">URL personalizada *</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-4 rounded-l-lg border-2 border-r-0 border-input bg-muted text-muted-foreground text-sm font-medium">
                              rocketlink.com/
                            </span>
                            <Input
                              id="slug"
                              placeholder="joao-silva"
                              className="rounded-l-none h-12 text-lg border-2 border-l-0 focus:border-primary transition-colors"
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
                            <p className="text-sm text-red-500 font-medium">{errors.slug.message}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Use apenas letras minúsculas, números e hífens. Ex: joao-silva
                          </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label htmlFor="description" className="text-base font-semibold">Descrição</Label>
                          <Textarea
                            id="description"
                            placeholder="Descreva brevemente o que os visitantes encontrarão na sua página..."
                            rows={5}
                            className="text-lg border-2 focus:border-primary transition-colors resize-none"
                            {...register('description')}
                          />
                          <p className="text-sm text-muted-foreground">
                            Opcional: ajude os visitantes a entender do que se trata a sua página
                          </p>
                        </div>

                        {/* Upload de foto de perfil */}
                        <div className="space-y-3">
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
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-8 border-t">
                      <Button 
                        type="submit" 
                        disabled={pageLoading}
                        size="lg"
                        className="px-8 bg-gradient-to-r from-primary to-primary/90 shadow-lg"
                      >
                        {pageLoading ? 'Salvando...' : (page ? 'Atualizar Página' : 'Criar Página')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={handleCancelEdit}
                        disabled={pageLoading}
                        className="px-8"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Seção de Links - Design Moderno */}
            {page && !showForm && (
              <Card className="border-0 shadow-xl bg-gradient-to-r from-background to-background/95 overflow-hidden">
                <div className="absolute top-0 left-0 w-40 h-40 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-12 -translate-x-12"></div>
                <CardHeader className="relative">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl lg:text-3xl font-bold">Gerenciar Links</CardTitle>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                          <span className="text-lg font-medium">
                            {links.length}/{isPremium ? '∞' : '2'} links utilizados
                          </span>
                        </div>
                        {!isPremium && (
                          <Badge variant="outline" className="text-sm">
                            Plano Gratuito
                          </Badge>
                        )}
                        {isPremium && (
                          <Badge className="text-sm bg-gradient-to-r from-primary to-primary/80">
                            Premium - Links Ilimitados
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setShowLinkForm(true)}
                      disabled={!isPremium && links.length >= 2}
                      className="shadow-lg bg-gradient-to-r from-primary to-primary/90"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Adicionar Link
                    </Button>
                  </div>
                  {!isPremium && links.length >= 2 && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <TrendingUp className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-orange-800 dark:text-orange-200">
                            Limite de links atingido!
                          </p>
                          <p className="text-sm text-orange-700 dark:text-orange-300">
                            Faça upgrade para Premium e tenha links ilimitados, analytics avançados e muito mais.
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate('/pricing')}
                          className="ml-auto bg-gradient-to-r from-orange-500 to-yellow-500 text-white border-0 hover:from-orange-600 hover:to-yellow-600"
                        >
                          Ver Planos Premium
                        </Button>
                      </div>
                    </div>
                  )}
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
