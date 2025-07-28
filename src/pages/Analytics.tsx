import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Globe, 
  MousePointer, 
  Calendar,
  Link2,
  UserIcon,
  LogOut,
  ArrowLeft,
  Eye,
  MapPin
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsData {
  totalClicks: number;
  totalViews: number;
  clicksByDate: Array<{ date: string; clicks: number; views: number }>;
  topLinks: Array<{ title: string; clicks: number; url: string }>;
  topCountries: Array<{ country: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
}

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("7"); // days
  const { user, isPremium, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!subscriptionLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isPremium) {
        navigate("/pricing");
        toast({
          title: "Acesso Restrito",
          description: "Analytics é um recurso premium. Faça upgrade para ter acesso.",
          variant: "destructive",
        });
        return;
      }
      fetchAnalytics();
    }
  }, [user, isPremium, subscriptionLoading, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Get user's pages
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('id, title')
        .eq('user_id', user?.id);

      if (pagesError) throw pagesError;
      if (!pages || pages.length === 0) {
        setAnalyticsData({
          totalClicks: 0,
          totalViews: 0,
          clicksByDate: [],
          topLinks: [],
          topCountries: [],
          topReferrers: []
        });
        return;
      }

      const pageIds = pages.map(p => p.id);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(period));

      // Get analytics data
      const { data: analytics, error: analyticsError } = await supabase
        .from('analytics')
        .select(`
          event_type,
          created_at,
          country,
          referrer,
          link_id,
          links!inner(title, url)
        `)
        .in('page_id', pageIds)
        .gte('created_at', daysAgo.toISOString());

      if (analyticsError) throw analyticsError;

      // Process data
      const clicks = analytics?.filter(a => a.event_type === 'click') || [];
      const views = analytics?.filter(a => a.event_type === 'view') || [];

      // Group by date
      const clicksByDate: { [key: string]: { clicks: number; views: number } } = {};
      
      for (let i = parseInt(period) - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        clicksByDate[dateStr] = { clicks: 0, views: 0 };
      }

      clicks.forEach(click => {
        const date = new Date(click.created_at).toISOString().split('T')[0];
        if (clicksByDate[date]) {
          clicksByDate[date].clicks++;
        }
      });

      views.forEach(view => {
        const date = new Date(view.created_at).toISOString().split('T')[0];
        if (clicksByDate[date]) {
          clicksByDate[date].views++;
        }
      });

      // Top links
      const linkClicks: { [key: string]: { title: string; clicks: number; url: string } } = {};
      clicks.forEach(click => {
        if (click.links && click.links.title) {
          const key = click.link_id || 'unknown';
          if (!linkClicks[key]) {
            linkClicks[key] = { 
              title: click.links.title, 
              clicks: 0, 
              url: click.links.url || '' 
            };
          }
          linkClicks[key].clicks++;
        }
      });

      // Top countries
      const countryClicks: { [key: string]: number } = {};
      clicks.forEach(click => {
        const country = click.country || 'Desconhecido';
        countryClicks[country] = (countryClicks[country] || 0) + 1;
      });

      // Top referrers
      const referrerClicks: { [key: string]: number } = {};
      clicks.forEach(click => {
        const referrer = click.referrer || 'Direto';
        referrerClicks[referrer] = (referrerClicks[referrer] || 0) + 1;
      });

      setAnalyticsData({
        totalClicks: clicks.length,
        totalViews: views.length,
        clicksByDate: Object.entries(clicksByDate).map(([date, data]) => ({
          date: new Date(date).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }),
          clicks: data.clicks,
          views: data.views
        })),
        topLinks: Object.values(linkClicks)
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5),
        topCountries: Object.entries(countryClicks)
          .map(([country, clicks]) => ({ country, clicks }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5),
        topReferrers: Object.entries(referrerClicks)
          .map(([referrer, clicks]) => ({ referrer, clicks }))
          .sort((a, b) => b.clicks - a.clicks)
          .slice(0, 5)
      });

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de analytics.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      navigate("/auth");
    }
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <Link2 className="h-4 w-4" />
              <span className="font-bold">RocketLink</span>
            </Button>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
              >
                <UserIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/profile")}
                className="text-sm text-muted-foreground hidden sm:block p-1 h-auto hover:text-foreground transition-colors"
              >
                Olá, {user.user_metadata?.display_name || user.email}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Analytics</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho dos seus links
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Última 24h</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Cliques</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalClicks || 0}</div>
              <p className="text-xs text-muted-foreground">
                nos últimos {period} dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.totalViews || 0}</div>
              <p className="text-xs text-muted-foreground">
                da sua página
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Clique</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analyticsData?.totalViews ? 
                  Math.round((analyticsData.totalClicks / analyticsData.totalViews) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                clicks por visualização
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Países</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData?.topCountries.length || 0}</div>
              <p className="text-xs text-muted-foreground">
                países diferentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="links">Top Links</TabsTrigger>
            <TabsTrigger value="geography">Geografia</TabsTrigger>
            <TabsTrigger value="sources">Origens</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cliques e Visualizações ao Longo do Tempo</CardTitle>
                <CardDescription>
                  Evolução diária dos seus links
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.clicksByDate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#8884d8" name="Visualizações" />
                    <Line type="monotone" dataKey="clicks" stroke="#82ca9d" name="Cliques" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Links Mais Clicados</CardTitle>
                <CardDescription>
                  Seus links com melhor performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.topLinks}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes dos Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.topLinks.map((link, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{link.title}</h4>
                        <p className="text-sm text-muted-foreground">{link.url}</p>
                      </div>
                      <Badge variant="secondary">
                        {link.clicks} cliques
                      </Badge>
                    </div>
                  ))}
                  {(!analyticsData?.topLinks || analyticsData.topLinks.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum clique registrado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="geography" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cliques por País</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData?.topCountries}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ country, percent }) => `${country} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="clicks"
                      >
                        {analyticsData?.topCountries.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Países</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData?.topCountries.map((country, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{country.country}</span>
                        </div>
                        <Badge variant="outline">
                          {country.clicks} cliques
                        </Badge>
                      </div>
                    ))}
                    {(!analyticsData?.topCountries || analyticsData.topCountries.length === 0) && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum dado de localização disponível
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Origens do Tráfego</CardTitle>
                <CardDescription>
                  De onde vem seus visitantes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.topReferrers.map((referrer, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">
                          {referrer.referrer === 'Direto' ? 'Acesso Direto' : referrer.referrer}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {referrer.referrer === 'Direto' ? 
                            'Visitantes que acessaram diretamente' : 
                            'Site de origem'
                          }
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {referrer.clicks} cliques
                      </Badge>
                    </div>
                  ))}
                  {(!analyticsData?.topReferrers || analyticsData.topReferrers.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma origem de tráfego registrada
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;