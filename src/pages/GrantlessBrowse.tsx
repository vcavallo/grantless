import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CuratorBrowser } from '@/components/grantless/CuratorBrowser';
import { CreateProjectDialog } from '@/components/grantless/CreateProjectDialog';
import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';

export default function GrantlessBrowse() {
  const { npub } = useParams<{ npub: string }>();
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
              <div className="flex items-center gap-2">
                <CreateProjectDialog />
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/catallax">Catallax dashboard</Link>
                </Button>
                <LoginArea className="max-w-60" />
              </div>
            </div>
            <p className="text-xl text-muted-foreground">The Invisible Handout.</p>
          </header>

          <CuratorBrowser curatorNpub={npub} />
        </div>
      </div>
    </>
  );
}
