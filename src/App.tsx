// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from 'react-helmet-async';
import { Suspense } from 'react';
import NostrProvider from '@/components/NostrProvider';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NostrLoginProvider } from '@nostrify/react/login';
import { AppProvider } from '@/components/AppProvider';
import { RelayEnvOverride } from '@/components/RelayEnvOverride';
import { AppConfig } from '@/contexts/AppContext';
import AppRouter from './AppRouter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      gcTime: Infinity,
    },
  },
});

// Optional dev convenience: point the app at one relay via VITE_RELAY_URL
// (e.g. the local strfry seeded by `npm run seed`). Unset by default → the normal
// default relay below is used and behavior is unchanged. No relay is privileged;
// this is a plain, overridable bootstrapping default (Grantless prime directive).
const envRelay: string | undefined = import.meta.env.VITE_RELAY_URL?.trim() || undefined;

const defaultConfig: AppConfig = envRelay
  ? { theme: "light", relayUrl: envRelay, relayMode: "custom", customRelay: envRelay }
  : { theme: "light", relayUrl: "wss://relay.primal.net", relayMode: "default" };

const presetRelays = [
  { url: 'wss://ditto.pub/relay', name: 'Ditto' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
  { url: 'wss://relay.damus.io', name: 'Damus' },
  { url: 'wss://relay.primal.net', name: 'Primal' },
];

export function App() {
  return (
    <HelmetProvider>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <RelayEnvOverride />
        <QueryClientProvider client={queryClient}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Suspense>
                  <AppRouter />
                </Suspense>
              </TooltipProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </QueryClientProvider>
      </AppProvider>
    </HelmetProvider>
  );
}

export default App;
