/**
 * Colors consumed by React Navigation and by components that need a raw value
 * rather than a Tailwind class (icon tints, ActivityIndicator, tab bars).
 *
 * These mirror the Tailwind palette in `tailwind.config.js` — `brand` is the
 * orange scale, and the surfaces are warm: `cream` and `charcoal` for canvases,
 * Tailwind's `stone` scale for everything above them. Nothing here is a true
 * white, a true black, or a cool grey; food photography is meant to be the only
 * neutral thing on screen.
 *
 * Keep the two files in step. If you add a colour to one, add it to the other.
 */

import { Platform } from 'react-native';

/** brand-500 / brand-400 — the accent, on light and dark canvases respectively. */
const tintLight = '#f97316';
const tintDark = '#fb923c';

export const Colors = {
  light: {
    text: '#1c1917', // stone-900
    textMuted: '#78716c', // stone-500
    background: '#fffbf7', // cream
    surface: '#ffffff',
    border: '#e7e5e4', // stone-200
    tint: tintLight,
    icon: '#78716c',
    tabIconDefault: '#a8a29e', // stone-400
    tabIconSelected: tintLight,
  },
  dark: {
    text: '#fafaf9', // stone-50
    textMuted: '#a8a29e', // stone-400
    background: '#12100e', // charcoal
    surface: '#1c1917', // stone-900
    border: '#292524', // stone-800
    tint: tintDark,
    icon: '#a8a29e',
    tabIconDefault: '#78716c',
    tabIconSelected: tintDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
