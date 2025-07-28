import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, BarChart3, Users, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await checkSubscription();
      }
    } catch (error) {
      console.error("Auth check error:", error);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session) return;

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      
      setSubscription(data);
    } catch (error) {
      console.error("Subscription check error:", error);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para assinar um plano.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan }
      });
      
      if (error) throw error;
      
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      
      window.open(data.url, '_blank');
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao abrir portal de gerenciamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const features = {
    free: [
      "Até 2 links",
      "Página personalizada",
      "Domínio próprio", 
      "Suporte básico"
    ],
    premium: [
      "Links ilimitados",
      "Analytics avançado",
      "Dados de cliques",
      "Relatórios detalhados",
      "Customização avançada",
      "Suporte prioritário",
      "Exportação de dados"
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4">
            <Zap className="w-4 h-4 mr-2" />
            15 dias grátis
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Escolha o plano ideal para
            <span className="block text-primary">seus links</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Comece gratuitamente e evolua conforme sua necessidade. 
            Todos os planos premium incluem 15 dias de teste gratuito.
          </p>
        </div>

        {/* Current Plan Status */}
        {user && subscription && (
          <div className="max-w-md mx-auto mb-12">
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Seu Plano Atual</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-center">
                <div className="text-2xl font-bold text-primary mb-2">
                  {subscription.plan_name === 'premium' ? 'Premium' : 'Gratuito'}
                </div>
                {subscription.in_trial && (
                  <Badge variant="secondary" className="mb-2">
                    Em período de teste
                  </Badge>
                )}
                {subscription.subscribed && (
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    disabled={loading}
                    className="w-full"
                  >
                    Gerenciar Assinatura
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle className="text-2xl">Gratuito</CardTitle>
              <CardDescription>
                Perfeito para começar
              </CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold">€0</div>
                <div className="text-sm text-muted-foreground">para sempre</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {features.free.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={subscription?.plan_name === 'free'}
              >
                {subscription?.plan_name === 'free' ? 'Plano Atual' : 'Começar Grátis'}
              </Button>
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                Mais Popular
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Premium Mensal</CardTitle>
              <CardDescription>
                Ideal para profissionais
              </CardDescription>
              <div className="mt-4">
                <div className="text-3xl font-bold">€9,90</div>
                <div className="text-sm text-muted-foreground">por mês</div>
                <div className="text-xs text-primary">15 dias grátis</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {features.premium.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => handleUpgrade('monthly')}
                disabled={loading || subscription?.subscribed}
                className="w-full"
              >
                {subscription?.subscribed ? 'Já Assinante' : 'Começar Teste Grátis'}
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                2 meses grátis
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-2xl">Premium Anual</CardTitle>
              <CardDescription>
                Máximo valor
              </CardDescription>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">€49,90</div>
                  <div className="text-lg line-through text-muted-foreground">€118,80</div>
                </div>
                <div className="text-sm text-muted-foreground">por ano</div>
                <div className="text-xs text-primary">15 dias grátis</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {features.premium.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
              <Button 
                onClick={() => handleUpgrade('yearly')}
                disabled={loading || subscription?.subscribed}
                variant="outline"
                className="w-full"
              >
                {subscription?.subscribed ? 'Já Assinante' : 'Começar Teste Grátis'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-4">Por que escolher o Premium?</h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Analytics Avançado</h3>
              <p className="text-muted-foreground">
                Acompanhe cliques, origem do tráfego e performance dos seus links
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Links Ilimitados</h3>
              <p className="text-muted-foreground">
                Adicione quantos links quiser à sua página sem limitações
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Suporte Premium</h3>
              <p className="text-muted-foreground">
                Atendimento prioritário e suporte técnico especializado
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-4">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground mb-6">
              Teste gratuitamente por 15 dias. Cancele a qualquer momento.
            </p>
            {!user && (
              <Button size="lg" onClick={() => window.location.href = '/auth'}>
                Criar Conta Grátis
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;