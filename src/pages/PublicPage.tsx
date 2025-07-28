import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, User } from "lucide-react";
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

interface Profile {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

interface Page {
  id: string;
  title: string;
  description?: string;
  background_type: string;
  background_value: string;
  theme_color: string;
  user_id: string;
}

const PublicPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (slug) {
      loadPublicPage();
    }
  }, [slug]);

  const trackPageView = async (pageId: string) => {
    try {
      await supabase
        .from('analytics')
        .insert({
          event_type: 'view',
          page_id: pageId,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent
        });
    } catch (error) {
      console.error('Error tracking page view:', error);
    }
  };

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

      // Track page view
      trackPageView(pageData.id);

      // Load user profile information
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, bio, avatar_url')
        .eq('user_id', pageData.user_id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

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
          event_type: 'click',
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
      className="min-h-screen relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Background Overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
      
      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md mx-auto">
          {/* Profile Header */}
          <div className="text-center mb-8 animate-fade-in">
            {/* Avatar */}
            <div className="mb-6 flex justify-center">
              <Avatar className="h-24 w-24 ring-4 ring-white/20 shadow-2xl">
                <AvatarImage 
                  src={profile?.avatar_url} 
                  alt={profile?.display_name || page.title}
                  className="object-cover"
                />
                <AvatarFallback className="bg-white/10 text-white text-2xl font-bold backdrop-blur">
                  {profile?.display_name ? 
                    profile.display_name.charAt(0).toUpperCase() : 
                    page.title.charAt(0).toUpperCase()
                  }
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name and Bio */}
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                {profile?.display_name || page.title}
              </h1>
              {(profile?.bio || page.description) && (
                <p className="text-base text-white/90 drop-shadow max-w-sm mx-auto leading-relaxed">
                  {profile?.bio || page.description}
                </p>
              )}
            </div>
          </div>

          {/* Links Container */}
          <div className="space-y-4">
            {links.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20 shadow-xl animate-fade-in">
                <CardContent className="p-8 text-center">
                  <User className="h-12 w-12 text-white/60 mx-auto mb-4" />
                  <p className="text-white/80 text-lg">Em breve, novos links!</p>
                  <p className="text-white/60 text-sm mt-2">Esta página está sendo preparada.</p>
                </CardContent>
              </Card>
            ) : (
              links.map((link, index) => (
                <Card 
                  key={link.id}
                  className="group bg-white/15 hover:bg-white/25 backdrop-blur-md border-white/30 
                           shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer 
                           hover:scale-[1.02] hover:border-white/50 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => handleLinkClick(link)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center space-x-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center 
                                    group-hover:bg-white/30 transition-colors duration-300">
                        {link.icon ? (
                          <span className="text-2xl">{link.icon}</span>
                        ) : (
                          <ExternalLink className="h-6 w-6 text-white/80" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white group-hover:text-white/95 
                                     transition-colors duration-300 truncate mb-1">
                          {link.title}
                        </h3>
                        <p className="text-white/70 text-sm truncate">
                          {link.url.replace(/^https?:\/\//, '').replace(/^www\./, '')}
                        </p>
                      </div>

                      {/* Arrow Icon */}
                      <div className="flex-shrink-0">
                        <ExternalLink className="h-5 w-5 text-white/60 group-hover:text-white/90 
                                               group-hover:translate-x-1 transition-all duration-300" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="text-center mt-12 animate-fade-in" style={{ animationDelay: '600ms' }}>
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md 
                          rounded-full px-4 py-2 border border-white/20">
              <button 
                onClick={() => window.location.href = '/'}
                className="text-white/70 text-sm font-medium hover:text-white/90 transition-colors cursor-pointer"
              >
                Criado com RocketLink
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPage;