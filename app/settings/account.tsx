import { useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/convex/_generated/api';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthGate } from '@/components/auth-gate';
import { clerkErrorMessage } from '@/lib/clerkErrors';

export default function AccountSettings() {
  return (
    <AuthGate>
      <AccountSettingsInner />
    </AuthGate>
  );
}

function AccountSettingsInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { user, isLoaded } = useUser();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
    }
  }, [user]);

  const nameChanged =
    !!user && (firstName !== (user.firstName ?? '') || lastName !== (user.lastName ?? ''));

  const onSaveName = async () => {
    if (!user || savingName || !nameChanged) return;
    setSavingName(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err) {
      Alert.alert('Update failed', clerkErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const onChangePhoto = async () => {
    if (!user || photoBusy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access in your device settings to change your profile picture.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;

    setPhotoBusy(true);
    try {
      const asset = picked.assets[0];
      if (!asset.base64) {
        throw new Error('Image data missing — please try a different photo.');
      }
      const mime = asset.mimeType ?? guessMimeFromUri(asset.uri) ?? 'image/jpeg';
      const dataUrl = `data:${mime};base64,${asset.base64}`;
      await user.setProfileImage({ file: dataUrl });
    } catch (err) {
      Alert.alert('Upload failed', clerkErrorMessage(err));
    } finally {
      setPhotoBusy(false);
    }
  };

  const onRemovePhoto = () => {
    if (!user || photoBusy) return;
    Alert.alert('Remove profile picture?', 'This will replace your photo with a default avatar.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setPhotoBusy(true);
          try {
            await user.setProfileImage({ file: null });
          } catch (err) {
            Alert.alert('Remove failed', clerkErrorMessage(err));
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);
  };

  if (!isLoaded || !user) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream dark:bg-charcoal">
        <Stack.Screen options={{ title: 'Account', headerBackTitle: from || 'Back' }} />
        <ActivityIndicator color="#f97316" />
      </SafeAreaView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-cream dark:bg-charcoal"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Account', headerBackTitle: from || 'Back' }} />

      <SectionHeader>Profile picture</SectionHeader>
      <View className="mb-6 flex-row items-center">
        <View className="h-20 w-20 overflow-hidden rounded-full bg-brand-500">
          {user.hasImage && user.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{ height: '100%', width: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-2xl font-bold text-white">
                {(user.firstName?.[0] ??
                  user.primaryEmailAddress?.emailAddress?.[0] ??
                  'P').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="ml-4 flex-1 gap-2">
          <Pressable
            onPress={onChangePhoto}
            disabled={photoBusy}
            className="rounded-xl bg-brand-500 px-4 py-2 active:opacity-80 disabled:opacity-60">
            {photoBusy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-sm font-semibold text-white">
                {user.hasImage ? 'Change photo' : 'Upload photo'}
              </Text>
            )}
          </Pressable>
          {user.hasImage && (
            <Pressable
              onPress={onRemovePhoto}
              disabled={photoBusy}
              className="rounded-xl border border-stone-200 px-4 py-2 active:bg-stone-100 disabled:opacity-60 dark:border-stone-800 dark:active:bg-stone-900">
              <Text className="text-center text-sm font-medium text-stone-700 dark:text-stone-300">
                Remove photo
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <SectionHeader>Name</SectionHeader>
      <View className="mb-4 flex-row gap-2">
        <View className="flex-1">
          <Field
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
        </View>
        <View className="flex-1">
          <Field
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />
        </View>
      </View>
      <Pressable
        onPress={onSaveName}
        disabled={!nameChanged || savingName}
        className={`mb-8 items-center rounded-2xl px-5 py-3 ${
          nameChanged ? 'bg-brand-500 active:opacity-80' : 'bg-stone-200 dark:bg-stone-800'
        } ${savingName ? 'opacity-60' : ''}`}>
        {savingName ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text
            className={`text-base font-semibold ${
              nameChanged ? 'text-white' : 'text-stone-500'
            }`}>
            Save name
          </Text>
        )}
      </Pressable>

      <SectionHeader>Email</SectionHeader>
      <View className="mb-8 overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <View className="px-4 py-4">
          <Text className="text-xs uppercase text-stone-500 dark:text-stone-400">Current</Text>
          <Text className="mt-0.5 text-base text-stone-900 dark:text-stone-50">
            {user.primaryEmailAddress?.emailAddress ?? '—'}
          </Text>
        </View>
        <Divider />
        <Pressable
          onPress={() => setEmailModalOpen(true)}
          className="flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900">
          <Ionicons name="mail-outline" size={20} color="#f97316" />
          <Text className="ml-3 flex-1 text-base font-medium text-stone-900 dark:text-stone-50">
            Change email
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
        </Pressable>
      </View>

      <SectionHeader>Password</SectionHeader>
      <View className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <Pressable
          onPress={() => setPasswordModalOpen(true)}
          className="flex-row items-center px-4 py-4 active:bg-stone-100 dark:active:bg-stone-900">
          <Ionicons name="lock-closed-outline" size={20} color="#f97316" />
          <Text className="ml-3 flex-1 text-base font-medium text-stone-900 dark:text-stone-50">
            Change password
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
        </Pressable>
      </View>

      <SectionHeader>Danger zone</SectionHeader>
      <View className="overflow-hidden rounded-2xl border border-red-200 dark:border-red-900">
        <Pressable
          onPress={() => setDeleteModalOpen(true)}
          className="flex-row items-center px-4 py-4 active:bg-red-50 dark:active:bg-red-950">
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
          <View className="ml-3 flex-1">
            <Text className="text-base font-medium text-red-600">Delete account</Text>
            <Text className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
              Removes your account and all your data permanently
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#a8a29e" />
        </Pressable>
      </View>

      <ChangeEmailModal
        visible={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSuccess={() => setEmailModalOpen(false)}
      />
      <ChangePasswordModal
        visible={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
      <DeleteAccountModal
        visible={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </ScrollView>
  );
}

function DeleteAccountModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const deleteMyData = useMutation(api.users.deleteMyData);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setConfirmText('');
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    if (!user || busy) return;
    if (confirmText !== 'DELETE') {
      Alert.alert('Type DELETE', 'Type DELETE in capitals to confirm.');
      return;
    }
    setBusy(true);
    try {
      // Wipe app data first while we still have a valid Clerk session.
      await deleteMyData({});
      // Then delete the Clerk user; this signs them out automatically.
      await user.delete();
      // AuthGate sees the signed-out state and redirects to /sign-in.
    } catch (err) {
      Alert.alert('Could not delete account', clerkErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
        <View className="flex-row items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            Delete account
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color="#78716c" />
          </Pressable>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="px-5 py-6">
          <View className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <Text className="text-base font-semibold text-red-800 dark:text-red-200">
              This is permanent
            </Text>
            <Text className="mt-2 text-sm leading-5 text-red-700 dark:text-red-300">
              Deleting your account will:
            </Text>
            <View className="mt-2">
              <Text className="text-sm leading-6 text-red-700 dark:text-red-300">
                {'• '}Sign you out on every device{'\n'}
                {'• '}Remove your saved recipes, planned meals, and shopping cart{'\n'}
                {'• '}Cancel any active subscription at the end of the current period{'\n'}
                {'• '}Delete your name, email, and profile picture from our records
              </Text>
            </View>
            <Text className="mt-3 text-xs text-red-700 dark:text-red-300">
              This cannot be undone. We can&apos;t recover anything once it&apos;s gone.
            </Text>
          </View>

          <Text className="mb-2 text-sm font-medium text-stone-700 dark:text-stone-300">
            Type <Text className="font-bold">DELETE</Text> in capitals to confirm
          </Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="DELETE"
            placeholderTextColor="#78716c"
            autoCapitalize="characters"
            autoCorrect={false}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
          />

          <Pressable
            onPress={onSubmit}
            disabled={busy || confirmText !== 'DELETE'}
            className={`mt-4 items-center rounded-2xl px-5 py-3 ${
              confirmText === 'DELETE' && !busy
                ? 'bg-red-600 active:opacity-80'
                : 'bg-stone-200 dark:bg-stone-800'
            }`}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`text-base font-semibold ${
                  confirmText === 'DELETE' ? 'text-white' : 'text-stone-500'
                }`}>
                Permanently delete my account
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ChangeEmailModal({
  visible,
  onClose,
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEmail('');
    setCode('');
    setPendingId(null);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onStart = async () => {
    if (!user || busy || !email.trim()) return;
    setBusy(true);
    try {
      const created = await user.createEmailAddress({ email: email.trim() });
      await created.prepareVerification({ strategy: 'email_code' });
      setPendingId(created.id);
    } catch (err) {
      Alert.alert('Could not start change', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const onVerify = async () => {
    if (!user || !pendingId || busy) return;
    const trimmed = code.replace(/\s+/g, '');
    if (!trimmed) {
      Alert.alert('Enter the code', 'Paste the code we sent to your new email.');
      return;
    }
    setBusy(true);
    try {
      const target = user.emailAddresses.find((e) => e.id === pendingId);
      if (!target) throw new Error('Pending email not found');
      const verified = await target.attemptVerification({ code: trimmed });
      if (verified.verification.status !== 'verified') {
        throw new Error('Verification did not complete.');
      }
      await user.update({ primaryEmailAddressId: verified.id });
      const oldPrimary = user.emailAddresses.find(
        (e) => e.id !== verified.id && e.id === user.primaryEmailAddressId,
      );
      if (oldPrimary) {
        try {
          await oldPrimary.destroy();
        } catch {
          // non-fatal — keep the old as a secondary if removal blocked
        }
      }
      Alert.alert('Email updated', 'Your primary email is now ' + verified.emailAddress);
      reset();
      onSuccess();
    } catch (err) {
      Alert.alert('Verification failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
        <View className="flex-row items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            Change email
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color="#78716c" />
          </Pressable>
        </View>

        <View className="flex-1 px-5 py-6">
          {pendingId ? (
            <>
              <Text className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                We sent a 6-digit code to {email}. Enter it to confirm.
              </Text>
              <Field
                label="Verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoComplete="one-time-code"
              />
            </>
          ) : (
            <>
              <Text className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                Enter the new email address. We&apos;ll send a verification code there before
                making the change.
              </Text>
              <Field
                label="New email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
            </>
          )}

          <Pressable
            onPress={pendingId ? onVerify : onStart}
            disabled={busy}
            className="mt-4 items-center rounded-2xl bg-brand-500 px-5 py-3 active:opacity-80 disabled:opacity-60">
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {pendingId ? 'Verify and update' : 'Send code'}
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async () => {
    if (!user || busy) return;
    if (next.length < 8) {
      Alert.alert('Too short', 'New password must be at least 8 characters.');
      return;
    }
    if (next !== confirm) {
      Alert.alert('Passwords don’t match', 'Re-type your new password to confirm.');
      return;
    }
    setBusy(true);
    try {
      await user.updatePassword({
        currentPassword: current,
        newPassword: next,
        signOutOfOtherSessions: true,
      });
      Alert.alert('Password updated', 'Your password has been changed.');
      reset();
      onClose();
    } catch (err) {
      Alert.alert('Update failed', clerkErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={close}>
      <SafeAreaView className="flex-1 bg-cream dark:bg-charcoal">
        <View className="flex-row items-center justify-between border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <Text className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            Change password
          </Text>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={24} color="#78716c" />
          </Pressable>
        </View>

        <View className="flex-1 px-5 py-6">
          <Field
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
          />
          <Field
            label="New password"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="password-new"
          />
          <Field
            label="Confirm new password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="password-new"
          />

          <Text className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            We&apos;ll sign you out of other devices when your password changes.
          </Text>

          <Pressable
            onPress={onSubmit}
            disabled={busy}
            className="mt-4 items-center rounded-2xl bg-brand-500 px-5 py-3 active:opacity-80 disabled:opacity-60">
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">Update password</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function guessMimeFromUri(uri: string): string | null {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (!ext) return null;
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return null;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
      {children}
    </Text>
  );
}

function Field({
  label,
  ...input
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-3">
      <Text className="mb-1 text-sm font-medium text-stone-700 dark:text-stone-300">
        {label}
      </Text>
      <TextInput
        {...input}
        placeholderTextColor="#78716c"
        className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-base text-stone-900 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-50"
      />
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-stone-200 dark:bg-stone-800" />;
}
