import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'pt' | 'es' | 'fr' | 'it';

export const translations = {
  en: {
    // Navigation & Common
    home: 'Home',
    pricing: 'Pricing',
    profile: 'Profile',
    analytics: 'Analytics',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    copy: 'Copy',
    
    // Hero Section
    heroTitle: 'One Link, All Your Content',
    heroSubtitle: 'Create your personalized bio page and share all your important links in one place. Perfect for social media, business, and personal use.',
    getStarted: 'Get Started',
    viewDemo: 'View Demo',
    
    // Features
    featuresTitle: 'Why Choose RocketLink?',
    easySetup: 'Easy Setup',
    easySetupDesc: 'Create your bio page in minutes with our intuitive interface',
    customizable: 'Fully Customizable',
    customizableDesc: 'Personalize your page with custom colors, fonts, and layout',
    realTimeAnalytics: 'Real-time Analytics',
    realTimeAnalyticsDesc: 'Track clicks and engagement to optimize your content',
    
    // Pricing
    pricingTitle: 'Choose Your Plan',
    freePlan: 'Free',
    freePlanDesc: 'Perfect for getting started',
    proPlan: 'Pro',
    proPlanDesc: 'For professionals and creators',
    month: 'month',
    unlimitedLinks: 'Unlimited links',
    customization: 'Full customization',
    analyticsDashboard: 'Analytics dashboard',
    prioritySupport: 'Priority support',
    customDomain: 'Custom domain',
    
    // Dashboard
    yourLinks: 'Your Links',
    addLink: 'Add Link',
    pageCustomization: 'Page Customization',
    viewPublicPage: 'View Public Page',
    editPage: 'Edit Page',
    copyBioLink: 'Copy Link for Bio',
    linkCopied: 'Link copied to clipboard!',
    
    // Auth
    welcomeBack: 'Welcome back',
    createAccount: 'Create your account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot your password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',
    
    // Forms
    linkTitle: 'Link Title',
    linkUrl: 'Link URL',
    pageName: 'Page Name',
    pageDescription: 'Page Description',
    profileImage: 'Profile Image',
    backgroundColor: 'Background Color',
    textColor: 'Text Color',
    
    // Messages
    linkAdded: 'Link added successfully!',
    linkUpdated: 'Link updated successfully!',
    linkDeleted: 'Link deleted successfully!',
    pageUpdated: 'Page updated successfully!',
    errorOccurred: 'An error occurred. Please try again.',
    
    // 404 Page
    pageNotFound: 'Page not found',
    returnHome: 'Return to Home',
    
    // Trial Banner
    freeTrialEnding: 'Your free trial is ending soon!',
    upgradeNow: 'Upgrade Now',
  },
  pt: {
    // Navigation & Common
    home: 'Início',
    pricing: 'Preços',
    profile: 'Perfil',
    analytics: 'Analytics',
    login: 'Entrar',
    signup: 'Cadastrar',
    logout: 'Sair',
    save: 'Salvar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Excluir',
    copy: 'Copiar',
    
    // Hero Section
    heroTitle: 'Um Link, Todo Seu Conteúdo',
    heroSubtitle: 'Crie sua página bio personalizada e compartilhe todos os seus links importantes em um só lugar. Perfeito para redes sociais, negócios e uso pessoal.',
    getStarted: 'Começar',
    viewDemo: 'Ver Demo',
    
    // Features
    featuresTitle: 'Por que Escolher RocketLink?',
    easySetup: 'Configuração Fácil',
    easySetupDesc: 'Crie sua página bio em minutos com nossa interface intuitiva',
    customizable: 'Totalmente Personalizável',
    customizableDesc: 'Personalize sua página com cores, fontes e layout customizados',
    realTimeAnalytics: 'Analytics em Tempo Real',
    realTimeAnalyticsDesc: 'Acompanhe cliques e engajamento para otimizar seu conteúdo',
    
    // Pricing
    pricingTitle: 'Escolha Seu Plano',
    freePlan: 'Gratuito',
    freePlanDesc: 'Perfeito para começar',
    proPlan: 'Pro',
    proPlanDesc: 'Para profissionais e criadores',
    month: 'mês',
    unlimitedLinks: 'Links ilimitados',
    customization: 'Personalização completa',
    analyticsDashboard: 'Painel de analytics',
    prioritySupport: 'Suporte prioritário',
    customDomain: 'Domínio personalizado',
    
    // Dashboard
    yourLinks: 'Seus Links',
    addLink: 'Adicionar Link',
    pageCustomization: 'Personalização da Página',
    viewPublicPage: 'Ver Página Pública',
    editPage: 'Editar Página',
    copyBioLink: 'Copiar Link para Bio',
    linkCopied: 'Link copiado para área de transferência!',
    
    // Auth
    welcomeBack: 'Bem-vindo de volta',
    createAccount: 'Crie sua conta',
    email: 'Email',
    password: 'Senha',
    confirmPassword: 'Confirmar Senha',
    forgotPassword: 'Esqueceu sua senha?',
    dontHaveAccount: 'Não tem uma conta?',
    alreadyHaveAccount: 'Já tem uma conta?',
    
    // Forms
    linkTitle: 'Título do Link',
    linkUrl: 'URL do Link',
    pageName: 'Nome da Página',
    pageDescription: 'Descrição da Página',
    profileImage: 'Imagem de Perfil',
    backgroundColor: 'Cor de Fundo',
    textColor: 'Cor do Texto',
    
    // Messages
    linkAdded: 'Link adicionado com sucesso!',
    linkUpdated: 'Link atualizado com sucesso!',
    linkDeleted: 'Link excluído com sucesso!',
    pageUpdated: 'Página atualizada com sucesso!',
    errorOccurred: 'Ocorreu um erro. Tente novamente.',
    
    // 404 Page
    pageNotFound: 'Página não encontrada',
    returnHome: 'Voltar ao Início',
    
    // Trial Banner
    freeTrialEnding: 'Seu teste gratuito está acabando!',
    upgradeNow: 'Fazer Upgrade',
  },
  es: {
    // Navigation & Common
    home: 'Inicio',
    pricing: 'Precios',
    profile: 'Perfil',
    analytics: 'Analíticas',
    login: 'Iniciar Sesión',
    signup: 'Registrarse',
    logout: 'Cerrar Sesión',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Eliminar',
    copy: 'Copiar',
    
    // Hero Section
    heroTitle: 'Un Enlace, Todo Tu Contenido',
    heroSubtitle: 'Crea tu página bio personalizada y comparte todos tus enlaces importantes en un solo lugar. Perfecto para redes sociales, negocios y uso personal.',
    getStarted: 'Comenzar',
    viewDemo: 'Ver Demo',
    
    // Features
    featuresTitle: '¿Por qué Elegir RocketLink?',
    easySetup: 'Configuración Fácil',
    easySetupDesc: 'Crea tu página bio en minutos con nuestra interfaz intuitiva',
    customizable: 'Totalmente Personalizable',
    customizableDesc: 'Personaliza tu página con colores, fuentes y diseño personalizados',
    realTimeAnalytics: 'Analíticas en Tiempo Real',
    realTimeAnalyticsDesc: 'Rastrea clics y participación para optimizar tu contenido',
    
    // Pricing
    pricingTitle: 'Elige Tu Plan',
    freePlan: 'Gratis',
    freePlanDesc: 'Perfecto para empezar',
    proPlan: 'Pro',
    proPlanDesc: 'Para profesionales y creadores',
    month: 'mes',
    unlimitedLinks: 'Enlaces ilimitados',
    customization: 'Personalización completa',
    analyticsDashboard: 'Panel de analíticas',
    prioritySupport: 'Soporte prioritario',
    customDomain: 'Dominio personalizado',
    
    // Dashboard
    yourLinks: 'Tus Enlaces',
    addLink: 'Agregar Enlace',
    pageCustomization: 'Personalización de Página',
    viewPublicPage: 'Ver Página Pública',
    editPage: 'Editar Página',
    copyBioLink: 'Copiar Enlace para Bio',
    linkCopied: '¡Enlace copiado al portapapeles!',
    
    // Auth
    welcomeBack: 'Bienvenido de vuelta',
    createAccount: 'Crea tu cuenta',
    email: 'Email',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    forgotPassword: '¿Olvidaste tu contraseña?',
    dontHaveAccount: '¿No tienes una cuenta?',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    
    // Forms
    linkTitle: 'Título del Enlace',
    linkUrl: 'URL del Enlace',
    pageName: 'Nombre de la Página',
    pageDescription: 'Descripción de la Página',
    profileImage: 'Imagen de Perfil',
    backgroundColor: 'Color de Fondo',
    textColor: 'Color del Texto',
    
    // Messages
    linkAdded: '¡Enlace agregado exitosamente!',
    linkUpdated: '¡Enlace actualizado exitosamente!',
    linkDeleted: '¡Enlace eliminado exitosamente!',
    pageUpdated: '¡Página actualizada exitosamente!',
    errorOccurred: 'Ocurrió un error. Por favor intenta de nuevo.',
    
    // 404 Page
    pageNotFound: 'Página no encontrada',
    returnHome: 'Volver al Inicio',
    
    // Trial Banner
    freeTrialEnding: '¡Tu prueba gratuita está terminando pronto!',
    upgradeNow: 'Actualizar Ahora',
  },
  fr: {
    // Navigation & Common
    home: 'Accueil',
    pricing: 'Tarifs',
    profile: 'Profil',
    analytics: 'Analytiques',
    login: 'Connexion',
    signup: "S'inscrire",
    logout: 'Déconnexion',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    edit: 'Modifier',
    delete: 'Supprimer',
    copy: 'Copier',
    
    // Hero Section
    heroTitle: 'Un Lien, Tout Votre Contenu',
    heroSubtitle: 'Créez votre page bio personnalisée et partagez tous vos liens importants en un seul endroit. Parfait pour les réseaux sociaux, les affaires et l\'usage personnel.',
    getStarted: 'Commencer',
    viewDemo: 'Voir la Démo',
    
    // Features
    featuresTitle: 'Pourquoi Choisir RocketLink?',
    easySetup: 'Configuration Facile',
    easySetupDesc: 'Créez votre page bio en minutes avec notre interface intuitive',
    customizable: 'Entièrement Personnalisable',
    customizableDesc: 'Personnalisez votre page avec des couleurs, polices et mise en page personnalisées',
    realTimeAnalytics: 'Analytiques en Temps Réel',
    realTimeAnalyticsDesc: 'Suivez les clics et l\'engagement pour optimiser votre contenu',
    
    // Pricing
    pricingTitle: 'Choisissez Votre Plan',
    freePlan: 'Gratuit',
    freePlanDesc: 'Parfait pour commencer',
    proPlan: 'Pro',
    proPlanDesc: 'Pour les professionnels et créateurs',
    month: 'mois',
    unlimitedLinks: 'Liens illimités',
    customization: 'Personnalisation complète',
    analyticsDashboard: 'Tableau de bord analytique',
    prioritySupport: 'Support prioritaire',
    customDomain: 'Domaine personnalisé',
    
    // Dashboard
    yourLinks: 'Vos Liens',
    addLink: 'Ajouter un Lien',
    pageCustomization: 'Personnalisation de Page',
    viewPublicPage: 'Voir la Page Publique',
    editPage: 'Modifier la Page',
    copyBioLink: 'Copier le Lien pour Bio',
    linkCopied: 'Lien copié dans le presse-papiers!',
    
    // Auth
    welcomeBack: 'Bon retour',
    createAccount: 'Créez votre compte',
    email: 'Email',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le Mot de passe',
    forgotPassword: 'Mot de passe oublié?',
    dontHaveAccount: 'Vous n\'avez pas de compte?',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    
    // Forms
    linkTitle: 'Titre du Lien',
    linkUrl: 'URL du Lien',
    pageName: 'Nom de la Page',
    pageDescription: 'Description de la Page',
    profileImage: 'Image de Profil',
    backgroundColor: 'Couleur de Fond',
    textColor: 'Couleur du Texte',
    
    // Messages
    linkAdded: 'Lien ajouté avec succès!',
    linkUpdated: 'Lien mis à jour avec succès!',
    linkDeleted: 'Lien supprimé avec succès!',
    pageUpdated: 'Page mise à jour avec succès!',
    errorOccurred: 'Une erreur s\'est produite. Veuillez réessayer.',
    
    // 404 Page
    pageNotFound: 'Page non trouvée',
    returnHome: 'Retour à l\'Accueil',
    
    // Trial Banner
    freeTrialEnding: 'Votre essai gratuit se termine bientôt!',
    upgradeNow: 'Mettre à Niveau',
  },
  it: {
    // Navigation & Common
    home: 'Home',
    pricing: 'Prezzi',
    profile: 'Profilo',
    analytics: 'Analytics',
    login: 'Accedi',
    signup: 'Registrati',
    logout: 'Esci',
    save: 'Salva',
    cancel: 'Annulla',
    edit: 'Modifica',
    delete: 'Elimina',
    copy: 'Copia',
    
    // Hero Section
    heroTitle: 'Un Link, Tutto il Tuo Contenuto',
    heroSubtitle: 'Crea la tua pagina bio personalizzata e condividi tutti i tuoi link importanti in un unico posto. Perfetto per social media, business e uso personale.',
    getStarted: 'Inizia',
    viewDemo: 'Vedi Demo',
    
    // Features
    featuresTitle: 'Perché Scegliere RocketLink?',
    easySetup: 'Configurazione Facile',
    easySetupDesc: 'Crea la tua pagina bio in minuti con la nostra interfaccia intuitiva',
    customizable: 'Completamente Personalizzabile',
    customizableDesc: 'Personalizza la tua pagina con colori, font e layout personalizzati',
    realTimeAnalytics: 'Analytics in Tempo Reale',
    realTimeAnalyticsDesc: 'Traccia click e coinvolgimento per ottimizzare il tuo contenuto',
    
    // Pricing
    pricingTitle: 'Scegli il Tuo Piano',
    freePlan: 'Gratuito',
    freePlanDesc: 'Perfetto per iniziare',
    proPlan: 'Pro',
    proPlanDesc: 'Per professionisti e creatori',
    month: 'mese',
    unlimitedLinks: 'Link illimitati',
    customization: 'Personalizzazione completa',
    analyticsDashboard: 'Dashboard analytics',
    prioritySupport: 'Supporto prioritario',
    customDomain: 'Dominio personalizzato',
    
    // Dashboard
    yourLinks: 'I Tuoi Link',
    addLink: 'Aggiungi Link',
    pageCustomization: 'Personalizzazione Pagina',
    viewPublicPage: 'Vedi Pagina Pubblica',
    editPage: 'Modifica Pagina',
    copyBioLink: 'Copia Link per Bio',
    linkCopied: 'Link copiato negli appunti!',
    
    // Auth
    welcomeBack: 'Bentornato',
    createAccount: 'Crea il tuo account',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Conferma Password',
    forgotPassword: 'Hai dimenticato la password?',
    dontHaveAccount: 'Non hai un account?',
    alreadyHaveAccount: 'Hai già un account?',
    
    // Forms
    linkTitle: 'Titolo del Link',
    linkUrl: 'URL del Link',
    pageName: 'Nome della Pagina',
    pageDescription: 'Descrizione della Pagina',
    profileImage: 'Immagine Profilo',
    backgroundColor: 'Colore di Sfondo',
    textColor: 'Colore del Testo',
    
    // Messages
    linkAdded: 'Link aggiunto con successo!',
    linkUpdated: 'Link aggiornato con successo!',
    linkDeleted: 'Link eliminato con successo!',
    pageUpdated: 'Pagina aggiornata con successo!',
    errorOccurred: 'Si è verificato un errore. Riprova.',
    
    // 404 Page
    pageNotFound: 'Pagina non trovata',
    returnHome: 'Torna alla Home',
    
    // Trial Banner
    freeTrialEnding: 'La tua prova gratuita sta per scadere!',
    upgradeNow: 'Aggiorna Ora',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};