import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User, Session } from "@supabase/supabase-js";
import { Link2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Bem-vindo ao seu painel</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Aqui será onde poderá gerir a sua página de links.
          </p>
          <div className="bg-card rounded-lg border p-6 max-w-md mx-auto">
            <p className="text-muted-foreground">
              MVP em desenvolvimento... 🚀
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
