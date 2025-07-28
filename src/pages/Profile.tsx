import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Calendar, CreditCard, Settings, User, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Profile() {
  const { subscription, loading, user, isPremium, isFree, isInTrial, isCancelled, refreshSubscription } = useSubscription();
  const [profile, setProfile] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, navigate]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      console.log("Calling customer-portal function...");
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      console.log("Customer portal response:", { data, error });
      
      if (error) {
        console.error("Customer portal error:", error);
        throw error;
      }
      
      if (data?.url) {
        console.log("Opening customer portal URL:", data.url);
        window.open(data.url, "_blank");
      } else {
        throw new Error("Nenhuma URL retornada do portal");
      }
    } catch (error) {
      console.error("Error in handleManageSubscription:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao abrir portal de gerenciamento",
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Ela será cancelada no final do período atual.')) {
      return;
    }

    try {
      console.log("Calling cancel-subscription function...");
      const { data, error } = await supabase.functions.invoke("cancel-subscription");
      
      console.log("Cancel subscription response:", { data, error });
      
      if (error) {
        console.error("Cancel subscription error:", error);
        throw error;
      }
      
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura será cancelada no final do período atual",
      });
      
      await refreshSubscription();
    } catch (error) {
      console.error("Error in handleCancelSubscription:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar assinatura",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return 0;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="animate-pulse text-lg">Carregando...</div>
      </div>
    );
  }

  const trialDaysRemaining = getTrialDaysRemaining();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => navigate("/")}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg"></div>
            <span className="text-xl font-bold">RocketLink</span>
          </div>
          
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Trial Warning */}
        {isInTrial && trialDaysRemaining <= 3 && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Período de teste expira em {trialDaysRemaining} dias!</strong>
              {trialDaysRemaining <= 1 && " Sua cobrança será processada em breve."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Perfil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome de exibição</label>
                <p className="font-medium">{profile?.display_name || "Não definido"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nome de usuário</label>
                <p className="font-medium">{profile?.username || "Não definido"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={isPremium ? "default" : "secondary"}>
                  {subscription?.plan_name || "Free"}
                </Badge>
                {isInTrial && (
                  <Badge variant="outline" className="text-orange-600 border-orange-200">
                    Período de Teste
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive">
                    Cancelada
                  </Badge>
                )}
              </div>

              {isInTrial && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Teste expira em</label>
                  <p className="font-medium text-orange-600">
                    {trialDaysRemaining} dias ({formatDate(subscription?.trial_end)})
                  </p>
                </div>
              )}

              {isPremium && subscription?.subscription_end && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {isCancelled ? "Expira em" : "Renova em"}
                  </label>
                  <p className="font-medium">{formatDate(subscription.subscription_end)}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {isFree && (
                  <Button onClick={() => navigate("/pricing")} className="flex-1">
                    Fazer Upgrade para Premium
                  </Button>
                )}
                
                {isPremium && (
                  <>
                    <Button variant="outline" onClick={handleManageSubscription} className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Gerenciar Assinatura
                    </Button>
                    {!isCancelled && (
                      <Button variant="destructive" onClick={handleCancelSubscription} className="flex-1">
                        Cancelar Assinatura
                      </Button>
                    )}
                    {isCancelled && (
                      <Button onClick={() => navigate("/pricing")} className="flex-1">
                        Renovar Assinatura
                      </Button>
                    )}
                  </>
                )}
                
                {isCancelled && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                    <strong>Assinatura cancelada.</strong> Você ainda tem acesso aos recursos premium até {formatDate(subscription.subscription_end)}.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features Comparison */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recursos do seu plano</CardTitle>
            <CardDescription>
              Veja o que está incluído no seu plano atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">Recursos incluídos:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    {isFree ? "Até 2 links" : "Links ilimitados"}
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    Página personalizada
                  </li>
                  {isPremium && (
                    <>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        Analytics avançados
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        Temas premium
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        Suporte prioritário
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {isFree && (
                <div className="space-y-2">
                  <h4 className="font-medium">Upgrade para Premium:</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                      Links ilimitados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                      Analytics detalhados
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                      Temas exclusivos
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}