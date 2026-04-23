import { useEffect } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';

// Check if running in Capacitor (native app)
export const isNativeApp = () => {
  return window.Capacitor !== undefined && window.Capacitor.isNativePlatform();
};

export const isPlatform = (platform) => {
  if (!window.Capacitor) return false;
  return window.Capacitor.getPlatform() === platform;
};

// Hook to initialize capacitor plugins
export const useCapacitor = () => {
  useEffect(() => {
    if (!isNativeApp()) return;

    const initCapacitor = async () => {
      try {
        // Configure status bar
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#f97316' });
        
        // Hide splash screen after app loads
        await SplashScreen.hide();
        
        // Add back button handler for Android
        CapacitorApp.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            CapacitorApp.exitApp();
          }
        });

        // Keyboard handling
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.paddingBottom = `${info.keyboardHeight}px`;
        });

        Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.paddingBottom = '0px';
        });

      } catch (error) {
        console.log('Capacitor init error:', error);
      }
    };

    initCapacitor();

    return () => {
      CapacitorApp.removeAllListeners();
      Keyboard.removeAllListeners();
    };
  }, []);
};

// Safe area insets hook for notches/status bars
export const useSafeArea = () => {
  useEffect(() => {
    if (!isNativeApp()) return;
    
    // Add safe area CSS variables
    const root = document.documentElement;
    root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
  }, []);
};

export default {
  isNativeApp,
  isPlatform,
  useCapacitor,
  useSafeArea
};
