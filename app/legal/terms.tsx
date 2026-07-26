import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

export default function TermsScreen() {
  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Terms of service' }} />

      <Text className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Terms of service
      </Text>
      <Text className="mb-6 text-xs text-neutral-500 dark:text-neutral-400">
        Last updated: 5 May 2026
      </Text>

      <Section title="Welcome">
        These terms govern your use of Plinth. By creating an account or using the app, you agree
        to them. If you don&apos;t agree, please don&apos;t use the app.
        {'\n\n'}
        Operator: Shawn Masule (Namibia){'\n'}
        Contact: shawnmmasule@gmail.com
      </Section>

      <Section title="Your account">
        <Bullet>You must be at least 13 years old to use Plinth.</Bullet>
        <Bullet>
          Keep your sign-in credentials secure. You&apos;re responsible for activity on your
          account.
        </Bullet>
        <Bullet>
          We may suspend or close accounts that violate these terms, attempt fraud, or harm other
          users.
        </Bullet>
      </Section>

      <Section title="Free trial">
        New accounts get free access to Plinth Premium for the first 21 days. After the trial ends,
        premium features are locked unless you subscribe. The trial does not auto-charge — you
        only pay if you actively choose to subscribe.
      </Section>

      <Section title="Subscription & billing">
        <Bullet>
          Plinth Premium is a paid subscription billed through Lemon Squeezy. Pricing is shown at
          checkout in your local currency.
        </Bullet>
        <Bullet>
          Subscriptions auto-renew at the end of each billing period unless cancelled. We&apos;ll
          renew at the same price you signed up at.
        </Bullet>
        <Bullet>
          You can cancel any time from Premium tab → Cancel subscription. You keep access until
          the end of the current billing period.
        </Bullet>
        <Bullet>
          Refunds are at our discretion and handled per Lemon Squeezy&apos;s terms. Email us if you
          believe a charge was made in error.
        </Bullet>
        <Bullet>
          We may change pricing for new sign-ups. Existing subscribers stay on the price they
          signed up at until they cancel.
        </Bullet>
      </Section>

      <Section title="Recipe content">
        Recipes shown in Plinth are sourced from third-party providers (Spoonacular and the
        original publishers). We don&apos;t guarantee accuracy, nutritional precision, or
        suitability for medical conditions or allergies. Always check ingredients yourself before
        cooking, especially if you have dietary restrictions.
      </Section>

      <Section title="Dietitian plan disclaimer">
        Plinth is not a medical service. Calorie and macro suggestions are rough estimates based
        on standard formulas, not personalised medical advice. Consult a qualified dietitian or
        physician before making significant dietary changes, especially if you have a health
        condition.
      </Section>

      <Section title="Acceptable use">
        Don&apos;t use Plinth to:
        {'\n\n'}
        <Bullet>Violate any law or another person&apos;s rights.</Bullet>
        <Bullet>Reverse engineer, scrape, or copy the app or its data.</Bullet>
        <Bullet>Attempt to gain unauthorised access to the service or other accounts.</Bullet>
        <Bullet>Resell access or share your account with others.</Bullet>
      </Section>

      <Section title="Intellectual property">
        The Plinth name, brand, code, and design are owned by us. You may use the app for personal,
        non-commercial purposes. Recipe content and images displayed in-app remain the property of
        their original creators and are shown under fair use for personal cooking purposes.
      </Section>

      <Section title="App store rules">
        If you downloaded Plinth from the App Store or Play Store, your use is also subject to
        their terms. Apple and Google are third-party beneficiaries of these terms with the right
        to enforce them.
      </Section>

      <Section title="Limitation of liability">
        Plinth is provided &quot;as is&quot; without warranties of any kind. We are not liable for
        any indirect, incidental, special, consequential, or punitive damages, or loss of profits,
        data, or use, arising from your use of the app. Some jurisdictions don&apos;t allow these
        exclusions, so they may not apply to you.
      </Section>

      <Section title="Termination">
        You may stop using Plinth at any time. We may terminate or suspend your access if you
        breach these terms. On termination, your right to use the app ends, but sections that by
        their nature should survive termination (intellectual property, limitation of liability,
        outstanding subscription charges) will continue to apply.
      </Section>

      <Section title="Changes to these terms">
        We may update these terms when we add features, change services, or comply with new laws.
        If we make material changes, we&apos;ll notify you in-app or by email. Continuing to use
        Plinth after changes take effect means you accept the updated terms.
      </Section>

      <Section title="Governing law">
        These terms are governed by the laws of the Republic of Namibia. Disputes will be resolved
        in Namibian courts.
      </Section>

      <Section title="Contact">
        Questions about these terms: plinthrecipes@gmail.com
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
