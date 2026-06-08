// NOTE: This file should normally not be modified unless you are adding a new provider.
// To add new routes, edit the AppRouter.tsx file.

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { HelmetProvider } from 'react-helmet-async';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
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

// Persist the query cache to localStorage so a hard reload paints last-seen content
// immediately (then revalidates) instead of starting cold. Local, per-browser, public
// Nostr events only — no privilege, fork-safe. Relay/account context lives in the query
// keys (so a relay/account switch never reuses another context's cache); `buster` is a
// schema version — bump it to discard all persisted data on a breaking cache change.
const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'grantless:query-cache',
});
const persistOptions = {
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24h
  buster: 'v1', // schema version — bump to discard all persisted data on a breaking change
};

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

/** Minimal fallback while a route's lazy chunk loads. */
function RouteFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <AppProvider storageKey="nostr:app-config" defaultConfig={defaultConfig} presetRelays={presetRelays}>
        <RelayEnvOverride />
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <NostrLoginProvider storageKey='nostr:login'>
            <NostrProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<RouteFallback />}>
                  <AppRouter />
                </Suspense>
              </TooltipProvider>
            </NostrProvider>
          </NostrLoginProvider>
        </PersistQueryClientProvider>
      </AppProvider>
    </HelmetProvider>
  );
}

export default App;
