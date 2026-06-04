import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  ExternalLink,
  GitFork,
  Users,
  Shield,
  Briefcase,
  Coins,
  ListChecks,
  Network,
} from 'lucide-react';

const GITHUB_URL = 'https://github.com/vcavallo/catallax-reference-client';

export default function About() {
  return (
    <>
      <Helmet>
        <title>About — Grantless</title>
        <meta
          name="description"
          content="How Grantless works: a permissionless, pleb-funded grant ecosystem built on open curation, Web of Trust, and the Catallax protocol."
        />
      </Helmet>

      <div className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-10">
          {/* Back */}
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to browse
            </Link>
          </Button>

          {/* Header */}
          <header className="space-y-3">
            <h1 className="text-4xl font-bold">About Grantless</h1>
            <p className="text-xl text-muted-foreground">The Invisible Handout.</p>
            <p className="text-base text-muted-foreground">
              Grantless is an open protocol that lets any team or individual participate in a
              permissionless, pleb-funded grant ecosystem. There are no centralized holders of
              purse strings, clutchers of pearls, nor any other gatekeeper standing between you and
              funding. The only thing in your way is <em>you</em>: work on something people actually want to
              crowdfund.
            </p>
          </header>

          {/* The roles */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Who's involved</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5 text-blue-600" />
                    Applicants &amp; teams
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Open-source teams and individuals who post a project they want funded. They set
                  the goal, pick an arbiter, and (often) do the work themselves.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Coins className="h-5 w-5 text-green-600" />
                    Funders (plebs)
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Anyone who wants a project to exist. They crowdfund a project's goal with sats —
                  no application, no committee, no permission.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Arbiters
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Trusted third parties who hold the pooled funds in escrow and release them when the
                  work is delivered (or refund the crowd if it isn't). The applicant chooses one —
                  carefully, since the sats pass through them.
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-amber-600" />
                    Curators
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  The people whose vouching decides who shows up here. A curator publishes a list of
                  applicants (and a list of trusted arbiters). You browse <em>through</em> a curator's
                  eyes — and you choose which curator to trust. (Hint: it doesn't have to be OpenSats, but it <em>can be</em>. ...That is, if they were participating here)
                </CardContent>
              </Card>
            </div>
          </section>

          {/* How it works */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <ol className="list-decimal space-y-2 pl-6 text-sm text-muted-foreground">
              <li>
                You pick a <strong>curator</strong> to browse. You see the applicants that curator
                vouches for, and their projects.
              </li>
              <li>
                An applicant <strong>posts a project</strong> — a crowdfunding task with a goal in
                sats — and assigns an <strong>arbiter</strong> from the curator's trusted set.
              </li>
              <li>
                The crowd <strong>funds</strong> it. Contributions are custodied by the arbiter, not
                by Grantless and not by any central treasury ("Grantless" isn't even an organization... it's just a dumb UI).
              </li>
              <li>
                A <strong>worker</strong> (often the team itself) does the work and marks it
                submitted.
              </li>
              <li>
                The arbiter <strong>concludes</strong> the project: release the pooled sats to the
                worker, or refund the crowd.
              </li>
            </ol>
            <p className="text-sm text-muted-foreground">
              Every step is an open event on Nostr. No privileged account, no app-controlled wallet,
              no off switch that anyone but the participants can reach.
            </p>
          </section>

          <Separator />

          {/* Curation: dlists, WoT, PoV */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ListChecks className="h-6 w-6" />
              OpenSets, not OpenSats
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Grantless has no "approved grantees" list living in a database somewhere. Who shows
                up is decided by
                {' '}<a
                  href="https://nostrhub.io/naddr1qvzqqqrcvypzpef89h53f0fsza2ugwdc3e54nfpun5nxfqclpy79r6w8nxsk5yp0qy2hwumn8ghj7un9d3shjtnyd968gmewwp6kyqqnv3jkxetww3exzmrf0fjkgttvd9ehgucxgd7rv"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  dlists
                </a>{' '}
                — decentralized, curated lists (we like to
                call them <strong>OpenSets</strong>) published openly on Nostr. A curator says "these
                are the people I vouch for", signs it, and that's it. Anyone can do it.
              </p>
              <p className="rounded-md bg-muted px-4 py-3">
                The joke writes itself: <strong>OpenSets are more powerful and more permissionless
                  than OpenSats.</strong> Instead of one fund deciding who deserves money behind closed
                doors, anyone can be a curator, anyone can be funded, and the lists are public,
                forkable, and yours to ignore.
              </p>
              <p>
                Trust here is <strong>Web of Trust (WoT)</strong>: it flows from people you already
                trust, not from a logo. And it's always a <strong>point of view (PoV)</strong> —
                <em>your</em> point of view, derived from who you (and the curators you choose)
                follow and vouch for. The app never grants trust; it only reflects yours. Two people
                can browse Grantless and honestly see different worlds, because they trust different
                curators.
              </p>
            </div>
          </section>

          {/* The ladder */}
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Network className="h-6 w-6" />
              The decentralization ladder
            </h2>
            <p className="text-sm text-muted-foreground">
              There's more than one way to "decentralize" grants. Most efforts stop a rung or two up.
              Here's the ladder, and where Grantless sits:
            </p>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li>
                <strong>1. Just have alternatives.</strong> More grant bodies than one — but each is
                still its own centralized gatekeeper.
              </li>
              <li>
                <strong>2. A forkable platform.</strong> Anyone can fork the software and run their
                own grant site. Better, but the forks don't talk to each other.
              </li>
              <li>
                <strong>3. A single protocol.</strong> Anyone can permissionlessly publish events
                that behave like a grant body, using their own UI, relay, and hand-picked "who to
                trust" list.
              </li>
              <li>
                <strong>4. An open curation system.</strong> Anyone can be a curator; a user's trust
                graph determines their point of view; one UI works for anyone, against any relay
                (their own or a shared one), for their own goals. No forks required, no hardcoded
                lists, no central moderation.
              </li>
            </ol>
            <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
              <strong>Grantless is already at rung 4.</strong> We ship a default relay for
              convenience, but you're free to point at any relay you want — and any curator,
              including yourself.
            </p>
          </section>

          <Separator />

          {/* Become an arbiter */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Shield className="h-6 w-6 text-purple-600" />
              Want to be an Arbiter?
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Arbiters are the trust backbone of a project. When a project is funded, the crowd's
                sats are custodied by the arbiter until the work is judged — so arbiters are chosen
                for their reputation, and they optionally earn a fee for the service and the risk.
              </p>
              <p>
                To be offered to applicants, an arbiter needs two things: to <strong>announce a
                  service</strong> (your terms and fee), and to be <strong>included in a curator's
                    trusted-arbiter list</strong>. Applicants can only pick arbiters their curator
                vouches for.
              </p>
              <p className="italic">
                A one-click "Become an Arbiter" flow (like "Post a project") is coming. For now, an
                arbiter service can be published from the Catallax dashboard.
              </p>
            </div>
          </section>

          {/* Become a curator */}
          <section className="space-y-3">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="h-6 w-6 text-amber-600" />
              Want to be a Curator?
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                A curator is anyone willing to say, publicly, "these are the applicants and arbiters
                I vouch for." Browsers who trust you will see the world through your lists. You don't
                need anyone's permission — you need to publish the lists.
              </p>
              <p>
                Any public charity currently in operation could just switch over to the Grantless protocol, publish their own lists and act as their own arbiters.
              </p>
              <p>
                Today, those curated lists (the OpenSets behind Grantless) are published
                through <strong>Brainstorm</strong>, as a convenient UI. Head to{' '}
                <a
                  href="https://tags.brainstorm.world"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground"
                >
                  tags.brainstorm.world
                </a>{' '}
                to create a <code>grantless-applicants</code> list (and a{' '}
                <code>grantless-arbiter</code> list) from your point of view; Grantless will pick
                them up automatically. Or you can just use nak or any other client, if you prefer. You just have to publish Kind 39999 events...
              </p>
              <p className="italic">
                A native curation experience inside Grantless — so you never have to leave to curate —
                is on the roadmap.
              </p>
            </div>
          </section>

          <Separator />

          {/* Fork it */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitFork className="h-5 w-5" />
                  Fork this and deploy your own version
                </CardTitle>
                <CardDescription>
                  Grantless is a reference client for an open protocol — not a walled garden. Run your
                  own, point it at your own relay, ship your own defaults.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                    View the source on GitHub
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Footer */}
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>
              Grantless is built on Nostr's {' '}
              <Link to="https://catallax.network" className="underline underline-offset-4 hover:text-foreground">
                Catallax
              </Link>{' '}
              meta-protocol.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
