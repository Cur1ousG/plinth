import * as WebBrowser from 'expo-web-browser';
import { Pressable, Text, View } from 'react-native';

const SPOONACULAR_URL = 'https://spoonacular.com/food-api';

/**
 * Attribution for our recipe data provider.
 *
 * Spoonacular's free tier requires a visible credit linking back to them
 * wherever their data is displayed, so this appears on the screens that show
 * their content — recipe detail, Discover, and Settings.
 *
 * Paid tiers waive the requirement; keep this anyway unless there's a reason
 * not to. Crediting the source of an entire recipe catalogue is just correct.
 */
export function SpoonacularCredit({
  align = 'left',
  className = '',
}: {
  align?: 'left' | 'center';
  className?: string;
}) {
  const open = () => {
    void WebBrowser.openBrowserAsync(SPOONACULAR_URL).catch(() => {
      // Nothing useful to do if the browser won't open — the credit text is
      // still visible, which is what the attribution requires.
    });
  };

  return (
    <View className={`flex-row flex-wrap items-center ${align === 'center' ? 'justify-center' : ''} ${className}`}>
      <Text className="text-xs text-neutral-400 dark:text-neutral-600">
        Recipe data powered by{' '}
      </Text>
      <Pressable onPress={open} hitSlop={8}>
        <Text className="text-xs font-medium text-brand-600 underline">Spoonacular</Text>
      </Pressable>
    </View>
  );
}
