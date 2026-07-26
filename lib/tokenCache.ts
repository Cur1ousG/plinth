import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const createTokenCache = () => ({
  getToken: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  saveToken: (key: string, token: string) => SecureStore.setItemAsync(key, token),
});

export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
