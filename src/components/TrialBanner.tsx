import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Crown } from "lucide-react";

export default function TrialBanner() {
  const { subscription, isInTrial, isFree, isCancelled } = useSubscription();
  const navigate = useNavigate();

  const getTrialDaysRemaining = () => {
    if (!subscription?.trial_end) return 0;
    const trialEnd = new Date(subscription.trial_end);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const trialDaysRemaining = getTrialDaysRemaining();

  // Only show banner if user is in trial and has 5 or fewer days remaining, if user is free plan, or if subscription is cancelled
  if ((!isInTrial || trialDaysRemaining > 5) && !isFree && !isCancelled) {
    return null;
  }

  // Show cancellation notice if subscription is cancelled
  if (isCancelled && subscription?.subscription_end) {
    const endDate = new Date(subscription.subscription_end);
    const now = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return (
      <Alert className="mb-4 border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 flex items-center justify-between">
          <span>
            <strong>Assinatura cancelada.</strong> Você ainda tem acesso premium por {daysRemaining} dias até {endDate.toLocaleDateString('pt-BR')}.
          </span>
          <Button 
            size="sm" 
            onClick={() => navigate("/pricing")}
            className="ml-4"
          >
            Renovar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isFree) {
    return (
      <Alert className="mb-4 border-blue-200 bg-blue-50">
        <Crown className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 flex items-center justify-between">
          <span>
            <strong>Experimente o Premium!</strong> Links ilimitados, analytics avançados e muito mais.
          </span>
          <Button 
            size="sm" 
            onClick={() => navigate("/pricing")}
            className="ml-4"
          >
            Ver Planos
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isInTrial) {
    const isUrgent = trialDaysRemaining <= 2;
    return (
      <Alert className={`mb-4 ${isUrgent ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
        <AlertTriangle className={`h-4 w-4 ${isUrgent ? 'text-red-600' : 'text-orange-600'}`} />
        <AlertDescription className={`${isUrgent ? 'text-red-800' : 'text-orange-800'} flex items-center justify-between flex-wrap gap-2`}>
          <span>
            <strong>Período de teste expira em {trialDaysRemaining} dia{trialDaysRemaining !== 1 ? 's' : ''}!</strong>
            {isUrgent && " Sua cobrança será processada em breve."}
          </span>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate("/profile")}
            >
              Gerenciar
            </Button>
            <Button 
              size="sm" 
              onClick={() => navigate("/pricing")}
            >
              Ver Planos
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}