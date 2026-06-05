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

// The default relay is a plain, overridable bootstrapping convenience — no relay is
// privileged (Grantless prime directive). Two env overrides, both optional:
//   VITE_RELAY_URL     — point the WHOLE app at one relay (e.g. a local strfry for dev).
//   VITE_DEFAULT_RELAY — swap the default relay a forker ships, without code edits.
// A forker who repoints these (or edits the presets) gets an identically working app.
const defaultRelay: string = import.meta.env.VITE_DEFAULT_RELAY?.trim() || 'wss://relay.grantless.org';
const envRelay: string | undefined = import.meta.env.VITE_RELAY_URL?.trim() || undefined;

const defaultConfig: AppConfig = envRelay
  ? { theme: "light", relayUrl: envRelay, relayMode: "custom", customRelay: envRelay }
  : { theme: "light", relayUrl: defaultRelay, relayMode: "default" };

// Default read set (used in "default" relay mode). Grantless Catallax events live on
// relay.grantless.org; curation lists (kind 30392) are minted on Brainstorm, so its
// tags relay is included so freshly-minted lists resolve. All are overridable in
// Settings and none is privileged — repoint or remove any of them and the app still works.
const presetRelays = [
  { url: defaultRelay, name: 'Grantless' },
  { url: 'wss://tags.brainstorm.world/relay', name: 'Brainstorm tags' },
  { url: 'wss://relay.nostr.band', name: 'Nostr.Band' },
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
