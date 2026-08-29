import NetInfo from '@react-native-community/netinfo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Slim banner pinned to the top edge when the device is offline.
 * Mounted once at the root so every screen sees it without per-screen plumbing.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setOnline(!!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsub();
  }, []);

  if (online) return null;

  return (
    <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 z-50">
      <View className="mx-3 mt-1 flex-row items-center rounded-2xl bg-stone-900 px-4 py-2 dark:bg-stone-100">
        <Ionicons name="cloud-offline-outline" size={16} color="#ffffff" />
        <Text className="ml-2 text-xs font-medium text-white dark:text-stone-900">
          You&apos;re offline. Saved data still works; new searches will resume when you reconnect.
        </Text>
      </View>
    </SafeAreaView>
  );
}
