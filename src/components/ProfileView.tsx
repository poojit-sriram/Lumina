import { useRef, useState } from 'react';
import { Bookmark, Camera, Grid, Heart, MessageCircle, Pencil, X } from 'lucide-react';
import { toggleFollowUser, updateUserProfile } from '../lib/firestoreActions';
import { processImageFile } from '../lib/imageUtils';
import type { Post, TopicCategory, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

const ALL_TOPICS: TopicCategory[] = [
  'Street',
  'Architecture',
  'Nature',
  'Minimal',
  'Portrait',
  'Culinary',
];

interface ProfileViewProps {
  profile: UserProfile | undefined;
  currentUid: string;
  posts: Post[];
  savedPosts: Post[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  onOpenPostDetail: (post: Post) => void;
  onMessageUser: (uid: string) => void;
}

export function ProfileView({
  profile,
  currentUid,
  posts,
  savedPosts,
  followersCount,
  followingCount,
  isFollowing,
  onOpenPostDetail,
  onMessageUser,
}: ProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [editOpen, setEditOpen] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [favoriteTopics, setFavoriteTopics] = useState<TopicCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  if (!profile) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        Loading creator profile...
      </div>
    );
  }

  const isOwnProfile = profile.uid === currentUid;
  const visiblePosts = activeTab === 'saved' && isOwnProfile ? savedPosts : posts;

  const openEditModal = () => {
    setDisplayName(profile.displayName);
    setUsername(profile.username);
    setBio(profile.bio);
    setAvatarUrl(profile.avatarUrl);
    setFavoriteTopics(profile.favoriteTopics || []);
    setEditOpen(true);
  };

  const toggleTopic = (t: TopicCategory) => {
    setFavoriteTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 6)
    );
  };

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    const processed = await processImageFile(file, 'none', 480);
    setAvatarUrl(processed.dataUrl);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await updateUserProfile(currentUid, {
        username,
        displayName,
        bio,
        avatarUrl,
        favoriteTopics,
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col gap-6 border-b border-zinc-200 pb-8 sm:flex-row sm:items-center sm:gap-10 dark:border-zinc-800">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 sm:h-28 sm:w-28 dark:border-zinc-800 dark:bg-zinc-900">
          <SafeImage
            src={profile.avatarUrl}
            alt={profile.displayName}
            fallbackLabel={profile.username}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                {profile.displayName}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                @{profile.username}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isOwnProfile ? (
                <button
                  type="button"
                  onClick={openEditModal}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>Edit profile</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => toggleFollowUser(currentUid, profile.uid, isFollowing)}
                    className={`min-h-[40px] rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                      isFollowing
                        ? 'border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200'
                        : 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950'
                    }`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMessageUser(profile.uid)}
                    className="min-h-[40px] rounded-xl border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Message
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm tabular-nums">
            <div>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {posts.length}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">posts</span>
            </div>
            <div>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {followersCount}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">followers</span>
            </div>
            <div>
              <span className="font-semibold text-zinc-950 dark:text-white">
                {followingCount}
              </span>{' '}
              <span className="text-zinc-500 dark:text-zinc-400">following</span>
            </div>
          </div>

          {profile.bio && (
            <p className="max-w-xl text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {profile.bio}
            </p>
          )}

          {profile.favoriteTopics && profile.favoriteTopics.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Interests: {profile.favoriteTopics.join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab('posts')}
          className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 text-xs font-semibold transition-colors ${
            activeTab === 'posts'
              ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
              : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          <Grid className="h-4 w-4" />
          <span>Posts</span>
        </button>

        {isOwnProfile && (
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`inline-flex min-h-[44px] items-center gap-2 border-b-2 text-xs font-semibold transition-colors ${
              activeTab === 'saved'
                ? 'border-zinc-950 text-zinc-950 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <Bookmark className="h-4 w-4" />
            <span>Saved</span>
          </button>
        )}
      </div>

      {/* Photo Grid */}
      {visiblePosts.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Camera className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {activeTab === 'saved' ? 'No saved frames yet' : 'No published frames yet'}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {activeTab === 'saved'
              ? 'Bookmark photos from the feed to collect them here.'
              : 'Shared photographs will appear in this gallery grid.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {visiblePosts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => onOpenPostDetail(post)}
              className="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <SafeImage
                src={post.imageUrl}
                alt={post.caption || post.topic}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-4 bg-black/45 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Heart className="h-4 w-4 fill-white" />
                  {post.likesCount}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <MessageCircle className="h-4 w-4 fill-white" />
                  {post.commentsCount}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <h3 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
                Edit Profile & Feed Interests
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                  <SafeImage
                    src={avatarUrl}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleAvatarUpload(e.target.files?.[0])}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="min-h-[38px] rounded-xl border border-zinc-200 px-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Change avatar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={60}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="min-h-[42px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Bio
                </label>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Algorithmic Feed Interests (select topics to prioritize)
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TOPICS.map((t) => {
                    const active = favoriteTopics.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTopic(t)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                          active
                            ? 'bg-rose-600 text-white'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="min-h-[42px] rounded-xl px-4 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[42px] rounded-xl bg-zinc-950 px-5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
