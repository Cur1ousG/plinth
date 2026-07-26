import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Privacy policy' }} />

      <Text className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Privacy policy
      </Text>
      <Text className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">
        Last updated: 27 July 2026
      </Text>

      <Section title="Who we are">
        Plinth is a recipe discovery and meal planning app. This policy explains what data we
        collect, why we collect it, and the choices you have.
        {'\n\n'}
        Operator: Shawn Masule (Namibia){'\n'}
        Contact: plinthrecipes@gmail.com
      </Section>

      <Section title="What we collect">
        <Bullet>
          <B>Account info</B> — your email address, name, and (optional) profile picture, provided
          via our authentication partner Clerk.
        </Bullet>
        <Bullet>
          <B>Recipes & meal data</B> — recipes you save, meals you plan in the calendar, and items
          you add to your shopping cart. Stored on your account so they sync across your devices.
        </Bullet>
        <Bullet>
          <B>Preferences</B> — appearance settings, dietary preferences, language, notification
          preferences. Stored on your device and on your account.
        </Bullet>
        <Bullet>
          <B>Subscription details</B> — when you subscribe to Plinth Premium, we record the status
          of your subscription. Payment card details are handled entirely by Lemon Squeezy and
          never touch our servers.
        </Bullet>
        <Bullet>
          <B>Crash and error reports</B> — when something goes wrong in the app we record the
          error, a stack trace, your device model and OS version, and an anonymous identifier for
          your account so we can tell repeat failures apart. We do not record your screen, and we
          do not use third-party advertising or behavioural analytics.
        </Bullet>
        <Bullet>
          <B>Diagnostic data</B> — basic logs (errors, request timestamps) from our backend.
        </Bullet>
      </Section>

      <Section title="How we use it">
        <Bullet>To run the app — show your saved recipes, sync them across devices, etc.</Bullet>
        <Bullet>
          To provide premium features — verify your subscription state and personalise meal
          suggestions.
        </Bullet>
        <Bullet>
          To send notifications you opt in to — daily meal reminders, account-related emails.
        </Bullet>
        <Bullet>To improve the app — diagnose bugs and improve performance.</Bullet>
      </Section>

      <Section title="Who we share it with">
        We only share data with the service providers that make Plinth work:
        {'\n\n'}
        <Bullet>
          <B>Clerk</B> (authentication) — stores your account credentials, email, and profile
          image.
        </Bullet>
        <Bullet>
          <B>Convex</B> (database & backend) — stores your recipes, meal plans, cart, and
          subscription state. Hosted in the EU (Ireland).
        </Bullet>
        <Bullet>
          <B>Spoonacular</B> (recipe data) — receives your recipe search queries to return
          matching results. Queries are not tied to your identity from Spoonacular&apos;s side.
        </Bullet>
        <Bullet>
          <B>Lemon Squeezy</B> (payments) — handles subscription checkout and stores billing data.
          We receive only your subscription status, not your payment details.
        </Bullet>
        <Bullet>
          <B>Sentry</B> (crash reporting) — receives error reports when the app misbehaves,
          including device model, OS version, and an anonymous account identifier. It never
          receives your email, name, saved recipes, or meal plans. Hosted in the EU.
        </Bullet>
        {'\n'}
        We do not sell your data, and we do not run third-party advertising trackers.
      </Section>

      <Section title="Your rights">
        <Bullet>
          <B>Access & export</B> — email us and we&apos;ll send you a copy of your data within 30
          days.
        </Bullet>
        <Bullet>
          <B>Deletion</B> — sign out and email us to request account deletion. We&apos;ll remove
          your account and associated data within 30 days, except where we&apos;re legally required
          to retain billing records.
        </Bullet>
        <Bullet>
          <B>Correction</B> — you can update your name, email, password, and profile photo from
          Settings → Account at any time.
        </Bullet>
        <Bullet>
          <B>Opt out of notifications</B> — Settings → Notifications.
        </Bullet>
      </Section>

      <Section title="Data retention">
        We keep your account data while your account exists. When you delete your account, we
        remove it within 30 days. Anonymised diagnostic logs may be retained for up to 12 months
        for security and reliability analysis.
      </Section>

      <Section title="Children">
        Plinth is not directed at children under 13. We don&apos;t knowingly collect data from
        anyone under 13. If you believe we&apos;ve done so, contact us and we&apos;ll delete it.
      </Section>

      <Section title="Changes to this policy">
        We may update this policy when we add features or change service providers. The Last
        updated date at the top reflects the current version. Significant changes will be
        announced in-app.
      </Section>

      <Section title="Contact">
        Questions or requests: plinthrecipes@gmail.com
      </Section>

      <View className="h-8" />
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="mb-2 text-base font-semibold text-neutral-900 dark:text-neutral-50">
        {title}
      </Text>
      <Text className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
        {children}
      </Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <Text className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">
      {'• '}
      {children}
      {'\n'}
    </Text>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <Text className="font-semibold text-neutral-900 dark:text-neutral-50">{children}</Text>;
}
