import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRelativeTime } from '../lib/algorithm';
import type { Story, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface StoriesBarProps {
  stories: Story[];
  usersById: Map<string, UserProfile>;
  currentUid: string;
  onAddStoryClick: () => void;
  onOpenProfile: (uid: string) => void;
}

export function StoriesBar({
  stories,
  usersById,
  currentUid,
  onAddStoryClick,
  onOpenProfile,
}: StoriesBarProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [viewedIds, setViewedIds] = useState<Set<string>>(() => new Set());

  const openStory = (idx: number) => {
    setActiveIndex(idx);
    const story = stories[idx];
    if (story) {
      setViewedIds((prev) => new Set(prev).add(story.id));
    }
  };

  const goNext = () => {
    if (activeIndex === null) return;
    if (activeIndex + 1 < stories.length) {
      openStory(activeIndex + 1);
    } else {
      setActiveIndex(null);
    }
  };

  const goPrev = () => {
    if (activeIndex === null) return;
    if (activeIndex > 0) {
      openStory(activeIndex - 1);
    }
  };

  const activeStory = activeIndex !== null ? stories[activeIndex] ?? null : null;
  const activeAuthor = activeStory ? usersById.get(activeStory.authorId) : undefined;

  const handleDeleteStory = async (storyId: string) => {
    try {
      await deleteDoc(doc(db, 'stories', storyId));
      setActiveIndex(null);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
        <button
          type="button"
          onClick={onAddStoryClick}
          className="group flex shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none"
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-zinc-300 bg-white transition-colors group-hover:border-rose-500 dark:border-zinc-700 dark:bg-zinc-900">
            <Plus className="h-5 w-5 text-zinc-700 transition-colors group-hover:text-rose-600 dark:text-zinc-300" />
          </div>
          <span className="max-w-[68px] truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Your story
          </span>
        </button>

        {stories.map((story, idx) => {
          const author = usersById.get(story.authorId);
          const isViewed = viewedIds.has(story.id);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => openStory(idx)}
              className="group flex shrink-0 flex-col items-center gap-1.5 focus-visible:outline-none"
            >
              <div
                className={`rounded-full p-[2.5px] transition-transform duration-150 group-hover:scale-[1.03] ${
                  isViewed
                    ? 'bg-zinc-300 dark:bg-zinc-700'
                    : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500'
                }`}
              >
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-zinc-50 bg-zinc-100 dark:border-zinc-950 dark:bg-zinc-800">
                  <SafeImage
                    src={author?.avatarUrl || story.imageUrl}
                    alt={author?.displayName || 'Creator story'}
                    fallbackLabel={author?.username || 'Story'}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <span className="max-w-[70px] truncate text-xs text-zinc-700 dark:text-zinc-300">
                {author?.username || 'creator'}
              </span>
            </button>
          );
        })}
      </div>

      {activeStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative flex h-[86vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-zinc-950 shadow-2xl">
            <div className="absolute top-0 right-0 left-0 z-20 flex gap-1 p-3">
              {stories.map((s, idx) => (
                <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
                  <div
                    className={`h-full transition-all ${
                      idx < (activeIndex ?? 0)
                        ? 'w-full bg-white'
                        : idx === activeIndex
                        ? 'w-full bg-white'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="absolute top-5 right-3 left-3 z-20 flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(null);
                  if (activeAuthor) onOpenProfile(activeAuthor.uid);
                }}
                className="flex items-center gap-2.5 text-left"
              >
                <div className="h-8 w-8 overflow-hidden rounded-full border border-white/30">
                  <SafeImage
                    src={activeAuthor?.avatarUrl || ''}
                    alt={activeAuthor?.displayName || 'Author'}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {activeAuthor?.username || 'creator'}
                  </p>
                  <p className="text-[11px] text-zinc-300">
                    {formatRelativeTime(activeStory.createdAt)}
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-1">
                {activeStory.authorId === currentUid && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStory(activeStory.id)}
                    aria-label="Delete story"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveIndex(null)}
                  aria-label="Close story"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 bg-zinc-900">
              <SafeImage
                src={activeStory.imageUrl}
                alt={activeStory.caption || 'Story frame'}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              {activeIndex !== null && activeIndex > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous story"
                  className="absolute top-1/2 left-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={goNext}
                aria-label="Next story"
                className="absolute top-1/2 right-2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {activeStory.caption && (
                <div className="absolute right-4 bottom-5 left-4 z-20">
                  <p className="text-sm leading-snug font-medium text-white">
                    {activeStory.caption}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
