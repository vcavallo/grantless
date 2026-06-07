import { useMemo } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { parseOperatorPubkeys } from '@/lib/grantless';

/**
 * Whether the logged-in user is a configured operator. The operator pubkey(s)
 * come from `VITE_GRANTLESS_OPERATOR` (a comma-separated npub/hex list, no default
 * shipped). This is a client-side convenience gate for the read-only helper panel
 * — NOT access control and not a privilege: the panel only runs public reads
 * anyone could run. Unset env → no operator → the panel is hidden for everyone.
 */
export function useIsOperator(): boolean {
  const { user } = useCurrentUser();
  const operators = useMemo(
    () => parseOperatorPubkeys(import.meta.env.VITE_GRANTLESS_OPERATOR),
    [],
  );
  return !!user && operators.includes(user.pubkey);
}
