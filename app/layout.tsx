import type {Metadata, Viewport} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Standalone Subject Creator AI',
  description: 'Universal Subject Virtualization & Workspace Hub for offline-first AI development',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SubjectCreator',
  },
  openGraph: {
    title: 'Standalone Subject Creator AI',
    description: 'Universal Subject Virtualization & Workspace Hub for offline-first AI development',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Standalone Subject Creator AI',
    description: 'Universal Subject Virtualization & Workspace Hub for offline-first AI development',
  },
};

export const viewport: Viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                // 1. Resilient Storage Shim for sandboxed/partitioned iframes
                try {
                  var probeKey = '__storage_probe__';
                  window.localStorage.setItem(probeKey, probeKey);
                  window.localStorage.removeItem(probeKey);
                } catch (storageErr) {
                  var createMemoryStorage = function() {
                    var s = {};
                    return {
                      getItem: function(k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
                      setItem: function(k, v) { s[k] = String(v); },
                      removeItem: function(k) { delete s[k]; },
                      clear: function() { s = {}; },
                      key: function(i) { return Object.keys(s)[i] || null; },
                      get length() { return Object.keys(s).length; }
                    };
                  };
                  try {
                    var mem = createMemoryStorage();
                    Object.defineProperty(window, 'localStorage', { value: mem, writable: true, configurable: true });
                    Object.defineProperty(window, 'sessionStorage', { value: createMemoryStorage(), writable: true, configurable: true });
                  } catch (defErr) {}
                }

                // 2. MatchMedia fallback if missing in embedded iframe
                if (!window.matchMedia) {
                  window.matchMedia = function() {
                    return {
                      matches: false,
                      media: '',
                      onchange: null,
                      addListener: function() {},
                      removeListener: function() {},
                      addEventListener: function() {},
                      removeEventListener: function() {},
                      dispatchEvent: function() { return false; }
                    };
                  };
                }

                // 3. Resilient Fetch & Network Shield for sandboxed iframes
                try {
                  var netProps = ['fetch', 'Headers', 'Request', 'Response'];
                  for (var ni = 0; ni < netProps.length; ni++) {
                    (function(prop) {
                      if (prop in window) {
                        try {
                          var currentVal = window[prop];
                          Object.defineProperty(window, prop, {
                            value: currentVal,
                            writable: true,
                            configurable: true,
                            enumerable: true
                          });
                        } catch (redefErr) {
                          try {
                            var valStore = window[prop];
                            Object.defineProperty(window, prop, {
                              get: function() { return valStore; },
                              set: function(v) { valStore = v; },
                              configurable: true,
                              enumerable: true
                            });
                          } catch (accessorErr) {}
                        }
                      }
                    })(netProps[ni]);
                  }

                  // 4. Neutralize browser extension DOM tampering (e.g. bis_skin_checked from Bitdefender/coupon extensions)
                  try {
                    // A. MutationObserver running immediately to strip bis_skin_checked before & during React hydration
                    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
                      var bisObserver = new MutationObserver(function(mutations) {
                        for (var m = 0; m < mutations.length; m++) {
                          var mut = mutations[m];
                          if (mut.type === 'attributes' && mut.attributeName && mut.attributeName.indexOf('bis_') === 0) {
                            if (mut.target && mut.target.removeAttribute) mut.target.removeAttribute(mut.attributeName);
                          } else if (mut.type === 'childList') {
                            for (var n = 0; n < mut.addedNodes.length; n++) {
                              var node = mut.addedNodes[n];
                              if (node && node.nodeType === 1) {
                                if (node.hasAttribute && node.hasAttribute('bis_skin_checked')) node.removeAttribute('bis_skin_checked');
                                var subs = node.querySelectorAll ? node.querySelectorAll('[bis_skin_checked]') : [];
                                for (var s = 0; s < subs.length; s++) subs[s].removeAttribute('bis_skin_checked');
                              }
                            }
                          }
                        }
                      });
                      bisObserver.observe(document.documentElement || document, {
                        attributes: true,
                        subtree: true,
                        childList: true,
                        attributeFilter: ['bis_skin_checked']
                      });
                    }

                    // B. Immediate cleanup of any pre-existing bis_skin_checked attributes
                    if (typeof document !== 'undefined') {
                      var stripExtensionAttrs = function() {
                        try {
                          var elements = document.querySelectorAll('[bis_skin_checked]');
                          for (var i = 0; i < elements.length; i++) {
                            elements[i].removeAttribute('bis_skin_checked');
                          }
                        } catch (e) {}
                      };
                      stripExtensionAttrs();
                      if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', stripExtensionAttrs);
                      }
                    }

                    // C. Intercept and filter React hydration mismatch errors caused by browser extensions
                    var origConsoleError = console.error;
                    console.error = function() {
                      var text = '';
                      for (var i = 0; i < arguments.length; i++) {
                        try {
                          var a = arguments[i];
                          text += (typeof a === 'string' ? a : (a && a.message ? a.message : (typeof a === 'object' ? JSON.stringify(a) : String(a)))) + ' ';
                        } catch (e) {}
                      }
                      if (
                        text.indexOf('bis_skin_checked') !== -1 ||
                        text.indexOf('bis_frame_id') !== -1 ||
                        (text.indexOf('hydration-mismatch') !== -1 && text.indexOf('bis_') !== -1) ||
                        (text.indexOf('hydrated but some attributes') !== -1 && text.indexOf('bis_skin_checked') !== -1)
                      ) {
                        return; // Filter out false-positive React hydration warning caused by client browser extension
                      }
                      return origConsoleError.apply(console, arguments);
                    };
                  } catch (bisErr) {}

                  // 5. Shield against third-party Chrome/Edge extension runtime exceptions (e.g. reading 'M_ID')
                  window.addEventListener('error', function(errEvt) {
                    if (!errEvt) return;
                    var msg = (errEvt.message || '').toString();
                    var file = (errEvt.filename || '').toString();
                    var stack = (errEvt.error && errEvt.error.stack ? errEvt.error.stack : '').toString();

                    var isExtensionError = 
                      file.indexOf('chrome-extension://') !== -1 ||
                      file.indexOf('moz-extension://') !== -1 ||
                      stack.indexOf('chrome-extension://') !== -1 ||
                      stack.indexOf('moz-extension://') !== -1 ||
                      msg.indexOf('M_ID') !== -1 ||
                      msg.indexOf('bis_skin_checked') !== -1 ||
                      (msg.indexOf('fetch') !== -1 && msg.indexOf('getter') !== -1);

                    if (isExtensionError) {
                      if (errEvt.preventDefault) errEvt.preventDefault();
                      if (errEvt.stopImmediatePropagation) errEvt.stopImmediatePropagation();
                      return true;
                    }
                  }, true);

                  window.addEventListener('unhandledrejection', function(rejEvt) {
                    if (!rejEvt) return;
                    var reason = rejEvt.reason;
                    var stack = (reason && reason.stack ? reason.stack : '').toString();
                    var msg = (reason && reason.message ? reason.message : String(reason)).toString();

                    if (
                      stack.indexOf('chrome-extension://') !== -1 ||
                      stack.indexOf('moz-extension://') !== -1 ||
                      msg.indexOf('M_ID') !== -1
                    ) {
                      if (rejEvt.preventDefault) rejEvt.preventDefault();
                      if (rejEvt.stopImmediatePropagation) rejEvt.stopImmediatePropagation();
                    }
                  }, true);
                } catch (netShieldErr) {}
              })();
            `
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
