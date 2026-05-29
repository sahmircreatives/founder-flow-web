import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const FREE_SCRIPT_LIMIT = 1;

// Reads the signed-in user's free-script usage for display purposes only.
// The real limit is enforced server-side in the script-write edge function.
export function useFreeScript(userId?: string) {
  const [used, setUsed] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUsed(0);
      setIsPaid(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('free_scripts_used, is_paid')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      setUsed(data.free_scripts_used ?? 0);
      setIsPaid(data.is_paid ?? false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remaining = isPaid ? Infinity : Math.max(0, FREE_SCRIPT_LIMIT - used);

  return {
    used,
    isPaid,
    loading,
    refresh,
    limit: FREE_SCRIPT_LIMIT,
    remaining,
    canGenerate: isPaid || remaining > 0,
  };
}
