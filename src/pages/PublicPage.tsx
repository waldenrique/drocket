import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Link {
  id: string;
  title: string;
  url: string;
  icon?: string;
  position: number;
  is_active: boolean;
  click_count: number;
}

interface Page {
  id: string;
  title: string;
  description?: string;
  background_type: string;
  background_value: string;
  theme_color: string;
}

const PublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      loadPublicPage();
    }
  }, [slug]);

  const loadPublicPage = async () => {
    try {
      setLoading(true);
      
      // Load page by slug
      const { data: pageData, error: pageError } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (pageError || !pageData) {
        setNotFound(true);
        return;
      }

      setPage(pageData);

      // Load active links for this page
      const { data: linksData, error: linksError } = await supabase
        .from('links')
        .select('*')
        .eq('page_id', pageData.id)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (linksError) {
        console.error('Error loading links:', linksError);
        return;
      }

      setLinks(linksData || []);
    } catch (error) {
      console.error('Error loading public page:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkClick = async (link: Link) => {
    try {
      // Track link click
      await supabase
        .from('analytics')
        .insert({
          event_type: 'link_click',
          page_id: page?.id,
          link_id: link.id,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent
        });

      // Open link in new tab
      window.open(link.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error tracking link click:', error);
      // Still open the link even if tracking fails
      window.open(link.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando página...</p>
        </div>
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Página não encontrada</h1>
          <p className="text-muted-foreground mb-8">A página que você está procurando não existe ou foi removida.</p>
          <Button onClick={() => window.location.href = '/'}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const backgroundStyle = page.background_type === 'color' 
    ? { backgroundColor: page.background_value }
    : page.background_type === 'gradient'
    ? { background: page.background_value }
    : { backgroundImage: `url(${page.background_value})`, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <div 
      className="min-h-screen py-8 px-4"
      style={backgroundStyle}
    >
      <div className="max-w-md mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2 text-white drop-shadow-lg">
            {page.title}
          </h1>
          {page.description && (
            <p className="text-white/90 drop-shadow">
              {page.description}
            </p>
          )}
        </div>

        {/* Links */}
        <div className="space-y-4">
          {links.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="p-6 text-center">
                <p className="text-white/80">Nenhum link disponível no momento.</p>
              </CardContent>
            </Card>
          ) : (
            links.map((link) => (
              <Card 
                key={link.id}
                className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all cursor-pointer group"
                onClick={() => handleLinkClick(link)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {link.icon && (
                        <span className="text-2xl">{link.icon}</span>
                      )}
                      <div>
                        <h3 className="font-medium text-white group-hover:text-white/90">
                          {link.title}
                        </h3>
                        <p className="text-sm text-white/60 truncate">
                          {link.url.replace(/^https?:\/\//, '')}
                        </p>
                      </div>
                    </div>
                    <ExternalLink className="h-5 w-5 text-white/60 group-hover:text-white/80" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/60 text-sm">
            Criado com LinkBio
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicPage;