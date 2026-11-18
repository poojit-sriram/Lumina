import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { ArrowRight, Camera, Compass, MessageCircle, Sparkles } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { SEED_POSTS } from '../lib/seedData';
import { SafeImage } from './SafeImage';

export function AuthGate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const previewPhotos = SEED_POSTS.slice(0, 4);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-12 px-6 py-12 lg:grid-cols-12 lg:px-10">
        <div className="lg:col-span-6">
          <div className="flex items-center gap-2.5 text-zinc-950 dark:text-zinc-100">
            <Camera className="h-6 w-6 text-rose-600" strokeWidth={1.75} />
            <span className="font-display text-2xl font-bold tracking-tight">Lumina</span>
          </div>

          <h1 className="mt-8 max-w-xl font-display text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl dark:text-white">
            Real-time photography, curated for your eye.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Share high-craft frames instantly, explore an algorithmic feed tuned to what you save
            and follow, and message creators directly in real time.
          </p>

          <div className="mt-8 space-y-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-950 dark:text-white">
                  Transparent algorithmic feed
                </span>{' '}
                — ranked by social affinity, topic interests, and engagement velocity.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-950 dark:text-white">
                  Instant photo publishing & stories
                </span>{' '}
                — built-in darkroom filters with live multi-client sync.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-950 dark:text-white">
                  Private direct messaging
                </span>{' '}
                — share posts and photographs in real-time 1-on-1 threads.
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="inline-flex min-h-[48px] items-center gap-3 rounded-xl bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              <span>{loading ? 'Connecting account...' : 'Continue with Google'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Protected by Google Authentication & Firestore rules
            </span>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {previewPhotos.map((item, idx) => (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${
                  idx === 1 ? 'mt-6' : idx === 2 ? '-mt-6' : ''
                }`}
              >
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <SafeImage
                    src={item.imageUrl}
                    alt={item.caption}
                    fallbackLabel={item.location}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-950 dark:text-zinc-100">
                    {item.topic}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span className="truncate">{item.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
