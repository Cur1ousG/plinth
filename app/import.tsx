import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link, Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api } from '@/convex/_generated/api';
import { AuthGate } from '@/components/auth-gate';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { convex } from '@/lib/convex';

type Mode = 'link' | 'text';

type Draft = {
  title: string;
  thumbnail?: string;
  siteName?: string;
  url?: string;
  ingredients: { name?: string; amount?: number; unit?: string; original: string }[];
  instructions?: string;
  totalTime?: string;
  yields?: string;
  confidence: 'high' | 'partial';
};

export default function ImportScreen() {
  return (
    <AuthGate>
      <ImportInner />
    </AuthGate>
  );
}

function ImportInner() {
  const router = useRouter();
  const { hasPremium, ready } = useEntitlement();
  const { save } = useSavedRecipes();

  const [mode, setMode] = useState<Mode>('link');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const headerOptions = <Stack.Screen options={{ title: 'Import a recipe' }} />;

  if (ready && !hasPremium) {
    return <PremiumWall headerOptions={headerOptions} />;
  }

  const runImport = async () => {
    const value = input.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const result: Draft =
        mode === 'link'
          ? await convex.action(api.importRecipe.fromUrl, { url: value })
          : await convex.action(api.importRecipe.fromText, { text: value });
      setDraft(result);
    } catch (err) {
      // The actions return advice, not stack traces — "copy the caption and
      // paste it instead" is the useful half of most failures here.
      Alert.alert('Could not import', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const onSave = async () => {
    if (!draft || saving) return;
    setSaving(true);
    try {
      await save({
        id: `import:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
        title: draft.title.trim() || 'Imported recipe',
        url: draft.url,
        thumbnail: draft.thumbnail,
        siteName: draft.siteName,
        ingredients: draft.ingredients,
        instructions: draft.instructions,
        totalTime: draft.totalTime,
        yields: draft.yields,
      });
      router.replace({ pathname: '/your-recipes', params: { from: 'Import' } });
    } catch (err) {
      Alert.alert('Could not save', err instanceof Error ? err.message : 'Unknown error');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal" edges={['bottom']}>
      {headerOptions}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-5 pb-10 pt-4" keyboardShouldPersistTaps="handled">
          {draft ? (
            <DraftPreview
              draft={draft}
              onChange={setDraft}
              onDiscard={() => setDraft(null)}
              onSave={onSave}
              saving={saving}
            />
          ) : (
            <>
              <ModeTabs mode={mode} onChange={(m) => { setMode(m); setInput(''); }} />
              <InputArea mode={mode} value={input} onChange={setInput} />
              <Pressable
                onPress={runImport}
                disabled={busy || !input.trim()}
                className="mt-4 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-40">
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-base font-semibold text-white">Import</Text>
                )}
              </Pressable>
              <Hint mode={mode} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* -------------------------------------------------------------------------- */

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <View className="mb-4 flex-row rounded-2xl bg-stone-100 p-1 dark:bg-stone-900">
      {(
        [
          { id: 'link' as Mode, label: 'Paste a link', icon: 'link' as const },
          { id: 'text' as Mode, label: 'Paste text', icon: 'document-text-outline' as const },
        ]
      ).map((t) => {
        const active = mode === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            className={`flex-1 flex-row items-center justify-center rounded-xl py-2.5 ${
              active ? 'bg-white dark:bg-stone-800' : ''
            }`}>
            <Ionicons name={t.icon} size={16} color={active ? '#ea580c' : '#78716c'} />
            <Text
              className={`ml-2 text-sm ${
                active
                  ? 'font-semibold text-stone-900 dark:text-stone-50'
                  : 'text-stone-500 dark:text-stone-400'
              }`}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function InputArea({
  mode,
  value,
  onChange,
}: {
  mode: Mode;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={
        mode === 'link'
          ? 'https://www.bbcgoodfood.com/recipes/…'
          : 'Paste the caption or the recipe text here…'
      }
      placeholderTextColor="#a8a29e"
      autoCapitalize="none"
      autoCorrect={false}
      multiline={mode === 'text'}
      keyboardType={mode === 'link' ? 'url' : 'default'}
      className={`rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50 ${
        mode === 'text' ? 'h-56' : ''
      }`}
      style={mode === 'text' ? { textAlignVertical: 'top' } : undefined}
    />
  );
}

/**
 * For pasted text this is genuinely instructional, not decoration. Captions
 * vary wildly, and the one thing that reliably tells ingredients from steps is
 * a line saying "Ingredients:" and another saying "Method:". Plinth guesses
 * without them — a numbered line starts the method — but a caption that lists
 * ingredients without numbers and steps without headings is ambiguous to a
 * person too. Showing the shape that works costs a sentence and saves the
 * tidying up afterwards.
 */
function Hint({ mode }: { mode: Mode }) {
  if (mode === 'link') {
    return (
      <View className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <Text className="text-sm font-semibold text-stone-900 dark:text-stone-50">
          Works with most recipe sites
        </Text>
        <Text className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-400">
          Paste the link to any recipe page and Plinth will pull out the ingredients and steps.
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <Text className="text-sm font-semibold text-stone-900 dark:text-stone-50">
        For Instagram, TikTok and the rest
      </Text>
      <Text className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-400">
        Social apps don&apos;t publish recipes in a form we can read. Open the post, copy the
        caption, and paste it here.
      </Text>

      <Text className="mt-3 text-sm font-semibold text-stone-900 dark:text-stone-50">
        For the cleanest result
      </Text>
      <Text className="mt-1 text-sm leading-5 text-stone-600 dark:text-stone-400">
        Add a line saying <Text className="font-semibold">Ingredients:</Text> above the
        ingredients and <Text className="font-semibold">Method:</Text> above the steps. Captions
        often leave these out, and they&apos;re what tells the two apart.
      </Text>

      <View className="mt-3 rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
        <Text className="text-xs leading-5 text-stone-600 dark:text-stone-400">
          Hot honey chicken{'\n'}
          <Text className="font-semibold">Ingredients:</Text>{'\n'}
          2 chicken breasts{'\n'}
          1 tsp paprika{'\n'}
          <Text className="font-semibold">Method:</Text>{'\n'}
          Slice the chicken into strips{'\n'}
          Fry for 7 minutes a side
        </Text>
      </View>

      <Text className="mt-3 text-xs leading-5 text-stone-500 dark:text-stone-400">
        The first line becomes the recipe name, and you can change anything on the next screen
        before saving.
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Nothing is saved until this screen is confirmed. Parsing someone else's page
 * is guesswork, and a recipe with a wrong ingredient is worse than no recipe,
 * so the last step is always a human looking at it.
 */
function DraftPreview({
  draft,
  onChange,
  onDiscard,
  onSave,
  saving,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onDiscard: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [newIngredient, setNewIngredient] = useState('');

  const removeAt = (i: number) =>
    onChange({ ...draft, ingredients: draft.ingredients.filter((_, n) => n !== i) });

  const addIngredient = () => {
    const line = newIngredient.trim();
    if (!line) return;
    onChange({ ...draft, ingredients: [...draft.ingredients, { original: line }] });
    setNewIngredient('');
  };

  return (
    <View>
      {draft.thumbnail ? (
        <Image
          source={{ uri: draft.thumbnail }}
          style={{ height: 180, width: '100%', borderRadius: 16 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {draft.confidence === 'partial' ? (
        <View className="mt-4 flex-row rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <Ionicons name="alert-circle-outline" size={18} color="#b45309" />
          <Text className="ml-2 flex-1 text-xs leading-5 text-amber-900 dark:text-amber-200">
            We couldn&apos;t read everything cleanly. Check the ingredients below before saving.
          </Text>
        </View>
      ) : null}

      {/* Named rather than labelled "Title", because a caption's first line is
          often a sentence rather than a dish name, and this is the field
          someone will want to fix. */}
      <Text className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Recipe name
      </Text>
      <TextInput
        value={draft.title}
        onChangeText={(title) => onChange({ ...draft, title })}
        placeholder="What do you want to call this?"
        placeholderTextColor="#a8a29e"
        className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-base font-semibold text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
      />
      <Text className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        This is what you&apos;ll see in Your Recipes.
      </Text>

      {draft.siteName || draft.totalTime ? (
        <Text className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          {[draft.siteName, draft.totalTime].filter(Boolean).join(' · ')}
        </Text>
      ) : null}

      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        Ingredients ({draft.ingredients.length})
      </Text>
      <View className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        {draft.ingredients.map((ing, i) => (
          <View
            key={`${ing.original}-${i}`}
            className="flex-row items-center border-b border-stone-100 px-4 py-3 last:border-b-0 dark:border-stone-800">
            <Text className="flex-1 text-sm text-stone-800 dark:text-stone-200">
              {ing.original}
            </Text>
            <Pressable onPress={() => removeAt(i)} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color="#a8a29e" />
            </Pressable>
          </View>
        ))}
        {draft.ingredients.length === 0 ? (
          <Text className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
            None found — add them below.
          </Text>
        ) : null}
      </View>

      <View className="mt-2 flex-row items-center">
        <TextInput
          value={newIngredient}
          onChangeText={setNewIngredient}
          onSubmitEditing={addIngredient}
          placeholder="Add an ingredient"
          placeholderTextColor="#a8a29e"
          returnKeyType="done"
          className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
        />
        <Pressable onPress={addIngredient} hitSlop={8} className="ml-2 p-2">
          <Ionicons name="add-circle" size={26} color="#ea580c" />
        </Pressable>
      </View>

      {draft.instructions ? (
        <>
          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Method
          </Text>
          <View className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <Text className="text-sm leading-6 text-stone-700 dark:text-stone-300">
              {draft.instructions}
            </Text>
          </View>
        </>
      ) : null}

      <Pressable
        onPress={onSave}
        disabled={saving}
        className="mt-6 items-center rounded-2xl bg-brand-500 px-5 py-4 active:opacity-80 disabled:opacity-60">
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white">Save to my recipes</Text>
        )}
      </Pressable>

      <Pressable onPress={onDiscard} className="mt-3 items-center py-2">
        <Text className="text-sm text-stone-500 dark:text-stone-400">Start over</Text>
      </Pressable>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function PremiumWall({ headerOptions }: { headerOptions: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-cream px-8 dark:bg-charcoal">
      {headerOptions}
      <View className="h-16 w-16 items-center justify-center rounded-2xl bg-brand-500">
        <Ionicons name="link" size={30} color="#ffffff" />
      </View>
      <Text className="mt-5 text-center text-xl font-bold text-stone-900 dark:text-stone-50">
        Import any recipe
      </Text>
      <Text className="mt-2 text-center text-sm leading-6 text-stone-600 dark:text-stone-400">
        Paste a link from any recipe site, or the caption from an Instagram reel, and Plinth pulls
        out the ingredients and steps.
      </Text>
      <Link href="/premium" asChild>
        <Pressable className="mt-6 rounded-2xl bg-brand-500 px-6 py-3 active:opacity-80">
          <Text className="text-base font-semibold text-white">See Plinth Premium</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
