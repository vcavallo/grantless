// ============================================================================
//  DEV-ONLY THROWAWAY KEYS — NOT SECRETS.
//
//  These keypairs exist purely to seed a *local* strfry relay with a fixed,
//  reproducible dataset for development and manual testing (see ./seed.ts).
//  They are published in plain sight on purpose: a developer pastes one of the
//  nsecs below into the signer to act as that role.
//
//  • NEVER use these keys on mainnet or with real value.
//  • NEVER treat any of these pubkeys as privileged — they are ordinary keys
//    with no special status (Grantless prime directive: no privileged actors).
//  • NEVER wire these into a production default; they belong to dev tooling only.
//
//  Regenerate your own with `nak key generate` if you fork — nothing here is
//  load-bearing.
// ============================================================================

export interface SeedAccount {
  /** Human-readable display name (used as the kind-0 profile name). */
  name: string;
  /** 64-char hex secret key. */
  sec: string;
  /** 64-char hex public key. */
  pub: string;
  /** bech32 npub (what you'd share). */
  npub: string;
  /** bech32 nsec (paste into the signer to act as this role). */
  nsec: string;
}

export interface Roster {
  /** List-publishing agent: signs the curation 30392s (the "TA", as Brainstorm does). */
  ta: SeedAccount;
  /** The curator whose lists drive discovery. */
  curator: SeedAccount;
  /** Grant applicants / patrons who post projects. */
  applicants: [SeedAccount, SeedAccount];
  /** A worker distinct from the applicants (for non-self-assigned projects). */
  worker: SeedAccount;
  /** Arbiters offered by the curator's grantless-arbiter list. */
  arbiters: [SeedAccount, SeedAccount];
  /** Funders who crowdfund the zap goals. */
  funders: [SeedAccount, SeedAccount, SeedAccount];
}

export const ROSTER: Roster = {
  ta: {
    name: 'Grantless List Agent (TA)',
    sec: 'a7cf37013de0b62639c1dfa731af0c6b7359cc348539c9f1e2e8f389d5eced38',
    pub: '81e73dc7bcc137881816ca0771a7f8173311f8c00067c1aa3c1198ea5160b65d',
    npub: 'npub1s8nnm3aucymcsxqkegrhrflczue3r7xqqpnur23uzxvw55tqkewsgesvup',
    nsec: 'nsec15l8nwqfauzmzvwwpm7nnrtcvdde4nnp5s5uunu0zarecn40va5uqp9m2fk',
  },
  curator: {
    name: 'Cleo the Curator',
    sec: '23f5317c7f0d85a1176159ba87e0f5b10ddc1e10cd6d72baefb8cfc637b450cd',
    pub: '355a400ae8952eabd70b61917904541d20f0cb3e3e130f220f7564c20eba22ef',
    npub: 'npub1x4dyqzhgj5h2h4ctvxghjpz5r5s0pje78cfs7gs0w4jvyr46ythsyp69rp',
    nsec: 'nsec1y06nzlrlpkz6z9mptxag0c84kyxac8sse4kh9wh0hr8uvda52rxstmgwsg',
  },
  applicants: [
    {
      name: 'Alice (Applicant)',
      sec: '502f2c142ff1320bdf5ea78176ed39ac961bac9b1ba30d3d7c1e2c7abd870011',
      pub: 'ac74b352f9afbb6f0e40f046ab7ba961f88548f4a1455f35224d22cad6ed8cb5',
      npub: 'npub1436tx5he47ak7rjq7pr2k7afv8ug2j8559z47dfzf53v44hd3j6sydfkn4',
      nsec: 'nsec12qhjc9p07yeqhh6757qhdmfe4jtphtymrw3s60turck840v8qqgsulsq8j',
    },
    {
      name: 'Bob (Applicant)',
      sec: 'fdaed50d2ea14557c6565d6a5226a66752557b10b6dd9580a240c8e5949e074c',
      pub: '15a4803b26a49af3a67e1d814922018fcdabd0422275138478b4844aafadb721',
      npub: 'npub1zkjgqwex5jd08fn7rkq5jgsp3lx6h5zzyf638prckjzy4tadkussml2rre',
      nsec: 'nsec1lkhd2rfw59z403jkt449yf4xvaf927cskmwetq9zgrywt9y7qaxq6l65qa',
    },
  ],
  worker: {
    name: 'Carol (Worker)',
    sec: 'b9c5499bfa192385226250cf9a3b3c227586477200e3d7c8b721ed0df20a01ff',
    pub: 'c5b757d163d9f7fcb96e043a78abc59479e336141294ae1e24aed8ba0a8f401b',
    npub: 'npub1ckm405trm8mlewtwqsa83279j3u7xds5z222u83y4mvt5z50gqdsp65ljl',
    nsec: 'nsec1h8z5nxl6ry3c2gnz2r8e5weuyf6cv3mjqr3a0j9hy8ksmus2q8ls5ymwca',
  },
  arbiters: [
    {
      name: 'Dave (Arbiter)',
      sec: 'b803bf3f7a851e8897b2404cc012ebe7a6bf56833d4dc88818e02f6c588f1f87',
      pub: 'ddb8d04ee2f69e29f4e48d3c6ba701b8dcc689894da62ff7b118251997c78d4a',
      npub: 'npub1mkudqnhz760zna8y357xhfcphrwvdzvffknzlaa3rqj3n978349q7quwzk',
      nsec: 'nsec1hqpm70m6s50g39ajgpxvqyhtu7nt745r84xu3zqcuqhkcky0r7rszu7x04',
    },
    {
      name: 'Erin (Arbiter)',
      sec: '666d9f3db5e2f5881143ec17c1f7cedf92c4b93267ad2f9e8db5b234e635bd2c',
      pub: 'fe7df97f914f057ccebbda82e121d83da66c165d7fc237e090e71d4fed01e408',
      npub: 'npub1le7ljlu3fuzhen4mm2pwzgwc8knxc9ja0lpr0cysuuw5lmgpusyqhxpzh6',
      nsec: 'nsec1veke70d4ut6csy2rastura7wm7fvfwfjv7kjl85dkkerfe34h5kq2j4wqq',
    },
  ],
  funders: [
    {
      name: 'Frank (Funder)',
      sec: 'c44077ad80b85041848c7b13c42a6b868b31c3c617db4d0741585f3461f91eed',
      pub: '393198c60caafe80129194150570e11f5b3b5edb1876179aa652d88557c1ab44',
      npub: 'npub18yce33sv4tlgqy53js2s2u8pradnkhkmrpmp0x4x2tvg247p4dzq5m2c5f',
      nsec: 'nsec1c3q80tvqhpgyrpyv0vfug2nts69nrs7xzld56p6ptp0ngc0ermksk0udw5',
    },
    {
      name: 'Grace (Funder)',
      sec: 'e626af48a87d7d045d0a4e70fac3358bf71bb8567d9272f556c38511694f2e30',
      pub: 'ea49293ce6f813f779f27fe03975cff48cfcbccd6f4bbdf66f026fcedabdbb62',
      npub: 'npub1afyjj08xlqflw70j0lsrjaw07jx0e0xdda9mman0qfhuak4ahd3qnhcqqm',
      nsec: 'nsec1ucn27j9g047sghg2fec04se430m3hwzk0kf89a2kcwz3z6209ccqemaj0z',
    },
    {
      name: 'Heidi (Funder)',
      sec: '9f872f00ab232c7f0bb009940f513e2243b2e66dfba17f52102608777763e5fe',
      pub: '9b08fcca2a3d6ac15de560e90c3abb91d4bd8f70b09f593229d8586d7c68c21b',
      npub: 'npub1nvy0ej32844vzh09vr5scw4mj82tmrmskz04jv3fmpvx6lrgcgds3cl0ws',
      nsec: 'nsec1n7rj7q9tyvk87zaspx2q75f7yfpm9endlwsh75ssycy8wamruhlqx5eee9',
    },
  ],
};

/** Every account in the roster, flattened (for iteration). */
export function allSeedAccounts(): SeedAccount[] {
  return [
    ROSTER.ta,
    ROSTER.curator,
    ...ROSTER.applicants,
    ROSTER.worker,
    ...ROSTER.arbiters,
    ...ROSTER.funders,
  ];
}

/** A human-readable role → npub + nsec table, printed after seeding. */
export function formatRoster(): string {
  const rows: Array<[string, SeedAccount]> = [
    ['list-agent', ROSTER.ta],
    ['curator', ROSTER.curator],
    ['applicant-1', ROSTER.applicants[0]],
    ['applicant-2', ROSTER.applicants[1]],
    ['worker', ROSTER.worker],
    ['arbiter-1', ROSTER.arbiters[0]],
    ['arbiter-2', ROSTER.arbiters[1]],
    ['funder-1', ROSTER.funders[0]],
    ['funder-2', ROSTER.funders[1]],
    ['funder-3', ROSTER.funders[2]],
  ];
  const lines = [
    'DEV-ONLY accounts (paste an nsec into the signer to act as that role):',
    '',
  ];
  for (const [role, acct] of rows) {
    lines.push(`  ${role.padEnd(12)} ${acct.name}`);
    lines.push(`    npub: ${acct.npub}`);
    lines.push(`    nsec: ${acct.nsec}`);
  }
  return lines.join('\n');
}
