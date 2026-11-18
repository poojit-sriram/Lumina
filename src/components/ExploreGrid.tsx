import { useMemo } from 'react';
import { Heart, MessageCircle, Search, X } from 'lucide-react';
import type { Post, TopicCategory, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

const EXPLORE_TOPICS: ('All' | TopicCategory)[] = [
  'All',
  'Street',
  'Architecture',
  'Nature',
  'Minimal',
  'Portrait',
  'Culinary',
];

interface ExploreGridProps {
  posts: Post[];
  usersById: Map<string, UserProfile>;
  searchQuery: string;
  selectedTopic: 'All' | TopicCategory;
  onSearchChange: (q: string) => void;
  onTopicChange: (topic: 'All' | TopicCategory) => void;
  onOpenDetail: (post: Post) => void;
  onOpenProfile: (uid: string) => void;
}

export function ExploreGrid({
  posts,
  usersById,
  searchQuery,
  selectedTopic,
  onSearchChange,
  onTopicChange,
  onOpenDetail,
  onOpenProfile,
}: ExploreGridProps) {
  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase().replace(/^#/, '');
    return posts.filter((post) => {
      if (selectedTopic !== 'All' && post.topic !== selectedTopic) {
        return false;
      }
      if (!q) return true;
      const author = usersById.get(post.authorId);
      const haystack = [
        post.caption,
        post.location,
        post.topic,
        ...post.tags,
        author?.username || '',
        author?.displayName || '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, selectedTopic, searchQuery, usersById]);

  const matchingCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return Array.from(usersById.values())
      .filter(
        (u) =>
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [searchQuery, usersById]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search creators, locations, or #tags..."
            className="min-h-[46px] w-full rounded-xl border border-zinc-200 bg-white pr-10 pl-11 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {EXPLORE_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTopicChange(t)}
              className={`min-h-[38px] shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                selectedTopic === t
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-950 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {matchingCreators.length > 0 && (
        <div className="space-y-2 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Creators
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {matchingCreators.map((u) => (
              <button
                key={u.uid}
                type="button"
                onClick={() => onOpenProfile(u.uid)}
                className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/70"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                  <SafeImage
                    src={u.avatarUrl}
                    alt={u.displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                    {u.username}
                  </p>
                  <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {u.displayName}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {filteredPosts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No frames match that filter
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Try clearing the search query or switching to All topics.
          </p>
        </div>
      ) : (
        <div className="grid auto-rows-[160px] grid-cols-2 gap-2 sm:auto-rows-[210px] sm:grid-cols-3 sm:gap-3">
          {filteredPosts.map((post, index) => {
            const isHeroTile = index % 7 === 0 && filteredPosts.length >= 4;
            const author = usersById.get(post.authorId);
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenDetail(post)}
                className={`group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 text-left dark:border-zinc-800 dark:bg-zinc-900 ${
                  isHeroTile ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1'
                }`}
              >
                <SafeImage
                  src={post.imageUrl}
                  alt={post.caption || post.topic}
                  fallbackLabel={post.topic}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/75 via-black/15 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <span className="text-[11px] font-medium text-white/90">
                    {author?.username || 'creator'}
                  </span>
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <div className="flex items-center gap-3 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 fill-white" />
                        {post.likesCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5 fill-white" />
                        {post.commentsCount}
                      </span>
                    </div>
                    <span className="truncate text-[11px] font-normal text-zinc-200">
                      {post.topic}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
