import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { CuratorBrowser } from '@/components/grantless/CuratorBrowser';
import { LoginArea } from '@/components/auth/LoginArea';
import { Button } from '@/components/ui/button';
import { useIsOperator } from '@/hooks/useIsOperator';

export default function GrantlessBrowse() {
  const { npub } = useParams<{ npub: string }>();
  const isOperator = useIsOperator();
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
                {isOperator && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin">Admin</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/about">About</Link>
                </Button>
                <LoginArea className="max-w-60" />
              </div>
            </div>
            <p className="text-xl text-muted-foreground">The Invisible Handout.</p>
            <div className="max-w-2xl space-y-2 pt-2 text-base text-muted-foreground">
              <p>
                Grantless is an open protocol that allows any team or individual to
                participate in a permissionless, pleb-funded grant ecosystem. There are no
                centralized holders of purse strings, clutchers of pearls, nor other form of
                gatekeeper to stand in the way of you and funding.
              </p>
              <p>
                The only thing in your way is <em>you</em>: work on something people actually want to
                crowdfund.{' '}
                (<Link
                  to="/about"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  how does this work?
                </Link>)
              </p>
            </div>
          </header>

          <CuratorBrowser curatorNpub={npub} />
        </div>
      </div>
    </>
  );
}
