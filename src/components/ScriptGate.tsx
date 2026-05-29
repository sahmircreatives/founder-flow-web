import { useNavigate } from 'react-router-dom';
import { Sparkles, LogOut, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FREE_SCRIPT_LIMIT } from '@/hooks/useFreeScript';

// Full-screen gate shown when the user is not signed in.
export function SignInGate({
  onSignIn,
  loading,
}: {
  onSignIn: () => void;
  loading?: boolean;
}) {
  return (
    <div className="max-w-md mx-auto bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center mx-auto mb-5">
        <Sparkles className="w-6 h-6 text-white" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Sign in to generate your free script
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        Every account gets <span className="text-foreground font-medium">1 free script</span>. Sign
        in with Google to claim yours.
      </p>
      <Button
        onClick={onSignIn}
        disabled={loading}
        className="w-full gradient-bg text-white font-medium hover:opacity-90 glow-orange"
      >
        Continue with Google
      </Button>
    </div>
  );
}

// Banner with the 0/1 → 1/1 progress bar shown above the wizard once signed in.
export function FreeScriptStatus({
  email,
  used,
  isPaid,
  onSignOut,
}: {
  email?: string | null;
  used: number;
  isPaid: boolean;
  onSignOut: () => void;
}) {
  const navigate = useNavigate();
  const limitReached = !isPaid && used >= FREE_SCRIPT_LIMIT;
  const shown = Math.min(used, FREE_SCRIPT_LIMIT);
  const percent = isPaid ? 100 : (shown / FREE_SCRIPT_LIMIT) * 100;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isPaid ? 'Paid account — unlimited scripts' : 'Free script usage'}
          </p>
          {email && (
            <p className="text-xs text-muted-foreground truncate">Signed in as {email}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <LogOut className="w-3.5 h-3.5 mr-1" />
          Sign out
        </Button>
      </div>

      {!isPaid && (
        <>
          <Progress value={percent} className="h-2" />
          <div className="flex items-center gap-1.5 mt-2">
            {limitReached && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
            <p className="text-xs text-muted-foreground">
              {limitReached
                ? `${FREE_SCRIPT_LIMIT}/${FREE_SCRIPT_LIMIT} — free script used`
                : `${shown}/${FREE_SCRIPT_LIMIT} — free script available`}
            </p>
          </div>
        </>
      )}

      {limitReached && (
        <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5">
          <p className="text-sm text-foreground font-medium mb-1">
            You've used your free script 🎉
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Book a call to unlock unlimited scripts for your business.
          </p>
          <Button
            size="sm"
            onClick={() => navigate('/#book-call')}
            className="gradient-bg text-white font-medium hover:opacity-90"
          >
            <PhoneCall className="w-3.5 h-3.5 mr-1.5" />
            Book a call
          </Button>
        </div>
      )}
    </div>
  );
}
