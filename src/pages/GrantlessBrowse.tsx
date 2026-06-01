import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { NomineeBrowser } from '@/components/grantless/NomineeBrowser';
import { Button } from '@/components/ui/button';

export default function GrantlessBrowse() {
  return (
    <>
      <Helmet>
        <title>Grantless</title>
        <meta
          name="description"
          content="Grantless — The Invisible Handout. Crowdfunded grants for open-source work, on Catallax."
        />
      </Helmet>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8">
          <header className="space-y-1">
            <div className="flex items-baseline justify-between gap-4">
              <h1 className="text-4xl font-bold">Grantless</h1>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/catallax">Catallax dashboard</Link>
              </Button>
            </div>
            <p className="text-xl text-muted-foreground">The Invisible Handout.</p>
          </header>

          <NomineeBrowser />
        </div>
      </div>
    </>
  );
}
