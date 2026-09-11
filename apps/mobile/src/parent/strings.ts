// Parent-facing copy (not part of the kid pack). English only in v1; i18n key map for later packs.
/** "Mom, Grandma and Buddy" */
const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

export const P = {
  gate: {
    title: "Grown-ups only",
    hint: "Solve this, then press and hold the button.",
    hold: "Press and hold",
    holding: "Keep holding…",
    wrong: "Not quite. Try another one.",
  },
  onboarding: {
    title: "Setting up Capy",
    // Capy asks these himself (speech bubble, silent — this is the grown-ups' zone)
    name: "Hi! What should I call your child?",
    namePlaceholder: "First name or nickname",
    age: "How old are they?",
    tradition: "Which tradition do you pray in?",
    bedtime: "When is bedtime?",
    people: "Who should we pray for?",
    goal: "What matters most to you?",
    goals: ["A calm bedtime routine", "Learning to pray on their own", "Gratitude every day", "Praying for family"],
    ages: { "4-8": "4 – 8 years", "9-11": "9 – 11 years" } as Record<string, string>,
    yourChild: "your child",
    next: "Next",
    back: "Back",
    finish: "Meet Capy",
    /** what each answer buys — shown right under the options as soon as there is an answer */
    payoff: {
      name: (name: string) => `Capy will greet ${name} by name every day.`,
      age: (band: string) => `Lessons, words and games tuned for ages ${band}.`,
      tradition: (label: string) => `Prayers and Bible words in the ${label} tradition — nothing your family wouldn't say.`,
      bedtime: (hour: string) => `Capy will be ready for bedtime prayer every night at ${hour}.`,
      people: (people: string[]) => `Capy will remember to pray for ${list(people)} — and tell you when your child did.`,
      goal: (goal: string) => `We'll start with "${goal.toLowerCase()}".`,
    },
    // spoken lines name nobody — one pre-rendered file serves every family, and the bubble must match the audio
    planBubble: "All set! Here's our plan.",
    planTitle: (name: string) => `Capy's 4-week plan for ${name}`,
    planRows: {
      bedtime: (hour: string) => `3-minute Prayer Moment every night at ${hour}`,
      people: (people: string[]) => (people.length ? `Praying for ${list(people)}` : "Praying for the people they love"),
      tradition: (label: string) => `${label} tradition · kid-sized words, no fear or guilt`,
    },
  },
  corner: {
    title: "Parent Corner",
    child: "Child",
    bedtime: "Bedtime",
    reminder: "Bedtime reminder (local notification)",
    people: "Prayer people",
    addPerson: "Add someone",
    note: "Note for Capy (e.g. \"Grandpa's surgery Tuesday\")",
    remove: "Remove",
    progress: "This week",
    voice: "Capy's voice on this device",
    freePlay: "Free play (no daily limit)",
    freePlayHint: "Normally one Prayer Moment unlocks per day. Turn this on to try everything at once.",
    premium: "Premium (sandbox)",
    premiumHint: "Store purchases arrive with the RevenueCat build. This switch only simulates the entitlement.",
    deleteData: "Delete my child's data",
    deleteConfirm: "This erases the profile, progress, prayer people and streak on this device. Continue?",
    deleted: "Deleted.",
    privacy: "Capy Prayer collects no photos, voice, location or contacts. The only child data is a nickname, an age band and prayer progress, stored under your account.",
    backup: "Back up progress",
    backupHint: "Sign in with your email to keep progress safe and restore it on a new phone. We never ask for your child's data.",
    email: "Your email",
    sendCode: "Send code",
    code: "6-digit code",
    verify: "Sign in",
    signedIn: (email: string) => `Signed in as ${email}. Progress backs up automatically.`,
    signOut: "Sign out",
    restored: "Progress restored from your account.",
    offline: "Backup is off in this build (no server configured).",
    back: "Back to Capy",
    cancel: "Cancel",
    delete: "Delete",
  },
  paywall: {
    // spoken (see P.onboarding.planBubble). The written title below it is where the child's name appears.
    capyLine: "I can't wait to pray together!",
    title: (name: string) => `Everything Capy has planned for ${name}`,
    recap: {
      bedtime: (hour: string) => `Bedtime prayer every night at ${hour} — free forever`,
      people: (people: string[]) => (people.length ? `Prayer people: ${list(people)}` : "Prayer people your child adds"),
      weeks: (n: number) => `${n} weeks of Prayer Moments: one skill at a time, one a day`,
      report: "A weekly note to you: what they prayed, and for whom",
    },
    // trial timeline — the honest version of what Blinkist made standard: when we remind, when we charge
    timeline: [
      { icon: "🔓", title: "Today", body: "Full access. Every week, every place, up to 4 children." },
      { icon: "🔔", title: "Day 5", body: "We send you a reminder that the trial is ending." },
      { icon: "💳", title: "Day 7", body: "First charge — only if you kept it. Cancel any time before, in one tap." },
    ],
    annualTitle: "Yearly",
    annualPrice: "$49.99",
    annualNote: "$4.17 a month · save 48%",
    monthlyTitle: "Monthly",
    monthlyPrice: "$7.99",
    monthlyNote: "Cancel any month",
    bestValue: "BEST VALUE",
    cta: "Start 7 days free",
    ctaSubAnnual: "then $49.99/year · cancel any time",
    ctaSubMonthly: "then $7.99/month · cancel any time",
    trust: "No ads. No data about your child leaves the app. Cancel in one tap from Parent Corner or your app store.",
    sandbox: "Continue in sandbox",
    restore: "Restore purchases",
    later: "Start with free bedtime prayers",
  },
  lock: "Premium",
} as const;

/**
 * Lines Capy says out loud in the grown-ups' zone (onboarding, paywall), pre-rendered by tools/tts-batch.ts into
 * apps/mobile/assets/audio like the pack lines. Capy names nobody out loud, so one file serves every family (same rule
 * as {kidName} in the pack); the child's name appears in the written titles. Until the files exist, the device voice reads the bubble.
 */
export const CAPY_LINES: Record<string, string> = {
  "ob_name.mp3": P.onboarding.name,
  "ob_age.mp3": P.onboarding.age,
  "ob_tradition.mp3": P.onboarding.tradition,
  "ob_bedtime.mp3": P.onboarding.bedtime,
  "ob_people.mp3": P.onboarding.people,
  "ob_goal.mp3": P.onboarding.goal,
  "ob_plan.mp3": P.onboarding.planBubble,
  "pw_hello.mp3": P.paywall.capyLine,
};
