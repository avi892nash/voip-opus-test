import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'voip-opus.install-dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'dismissed') {
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-white shadow-xl rounded-2xl border border-gray-200 p-4 z-50"
        >
          <div className="flex items-start space-x-3">
            <img src="/icons/favicon-64x64.png" alt="" className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Install this app</h3>
              <p className="text-sm text-gray-600 mt-1">
                Add VoIP + Opus to your home screen for faster access and offline learning content.
              </p>
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={install}
                  className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
