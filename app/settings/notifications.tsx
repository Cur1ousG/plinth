import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';

import { AuthGate } from '@/components/auth-gate';
import {
  cancelDailyMealReminder,
  ensurePushPermission,
  scheduleDailyMealReminder,
} from '@/lib/notifications';
import { useSettings } from '@/providers/settings-provider';

const HOUR_OPTIONS = [6, 8, 12, 15, 18, 20];

export default function NotificationsSettings() {
  return (
    <AuthGate>
      <NotificationsInner />
    </AuthGate>
  );
}

function NotificationsInner() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { notifications, setNotifications } = useSettings();
  const [busy, setBusy] = useState(false);

  const togglePush = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!notifications.push) {
        const granted = await ensurePushPermission();
        if (!granted) {
          Alert.alert(
            'Permission needed',
            'Enable notifications for Plinth in your device settings to receive reminders.',
          );
          return;
        }
        await setNotifications({ push: true });
      } else {
        await setNotifications({ push: false, dailyReminder: false });
        await cancelDailyMealReminder();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleDailyReminder = async () => {
    if (busy) return;
    if (!notifications.push) {
      Alert.alert('Push needed', 'Enable push notifications first to receive reminders.');
      return;
    }
    setBusy(true);
    try {
      if (!notifications.dailyReminder) {
        await scheduleDailyMealReminder(notifications.dailyReminderHour);
        await setNotifications({ dailyReminder: true });
      } else {
        await cancelDailyMealReminder();
        await setNotifications({ dailyReminder: false });
      }
    } catch (err) {
      Alert.alert(
        'Could not schedule',
        err instanceof Error ? err.message : 'Try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  const setReminderHour = async (hour: number) => {
    await setNotifications({ dailyReminderHour: hour });
    if (notifications.dailyReminder) {
      try {
        await scheduleDailyMealReminder(hour);
      } catch {
        // non-fatal
      }
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-neutral-950"
      contentContainerClassName="px-5 py-6">
      <Stack.Screen options={{ title: 'Notifications', headerBackTitle: from || 'Back' }} />

      <SectionHeader>Push notifications</SectionHeader>
      <View className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <ToggleRow
          icon="notifications-outline"
          label="Enable push"
          sub="Allow Plinth to send notifications to this device"
          value={notifications.push}
          onChange={togglePush}
          disabled={busy}
        />
        <Divider />
        <ToggleRow
          icon="alarm-outline"
          label="Daily meal reminder"
          sub={`Remind me about today's plan at ${formatHour(notifications.dailyReminderHour)}`}
          value={notifications.dailyReminder}
          onChange={toggleDailyReminder}
          disabled={busy || !notifications.push}
        />
      </View>

      {notifications.push && (
        <>
          <SectionHeader>Reminder time</SectionHeader>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {HOUR_OPTIONS.map((h) => {
              const active = h === notifications.dailyReminderHour;
              return (
                <Pressable
                  key={h}
                  onPress={() => setReminderHour(h)}
                  className={`rounded-full border px-4 py-2 ${
                    active
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900'
                      : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  }`}>
                  <Text
                    className={`text-sm ${
                      active
                        ? 'font-semibold text-brand-700 dark:text-brand-100'
                        : 'text-neutral-700 dark:text-neutral-300'
                    }`}>
                    {formatHour(h)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <SectionHeader>Other channels</SectionHeader>
      <View className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <ToggleRow
          icon="mail-outline"
          label="Email notifications"
          sub="Weekly digest of new recipes you'd like"
          value={notifications.email}
          onChange={() => setNotifications({ email: !notifications.email })}
        />
        <Divider />
        <ToggleRow
          icon="chatbox-outline"
          label="SMS notifications"
          sub="Text reminders for planned meals"
          value={notifications.sms}
          onChange={() => setNotifications({ sms: !notifications.sms })}
        />
      </View>

      <Text className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Email and SMS preferences are saved on this device. Actual delivery launches alongside
        Plinth&apos;s server-side notification service.
      </Text>
    </ScrollView>
  );
}

function ToggleRow({
  icon,
  label,
  sub,
  value,
  onChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  value: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center px-4 py-4 ${disabled ? 'opacity-50' : ''}`}
      pointerEvents={disabled ? 'none' : 'auto'}>
      <Ionicons name={icon} size={22} color="#737373" />
      <View className="ml-4 flex-1">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">
          {label}
        </Text>
        {sub ? (
          <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{sub}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: '#fb923c', false: undefined }}
        thumbColor={value ? '#f97316' : undefined}
      />
    </View>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
      {children}
    </Text>
  );
}

function Divider() {
  return <View className="h-px bg-neutral-200 dark:bg-neutral-800" />;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12:00 AM';
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return '12:00 PM';
  return `${hour - 12}:00 PM`;
}
