import { Bell, CheckCheck, Heart, MessageCircle, UserPlus } from 'lucide-react';
import { formatRelativeTime } from '../lib/algorithm';
import { markNotificationsRead } from '../lib/firestoreActions';
import type { NotificationItem, Post, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface ActivityViewProps {
  notifications: NotificationItem[];
  usersById: Map<string, UserProfile>;
  postsById: Map<string, Post>;
  onOpenProfile: (uid: string) => void;
  onOpenPostDetail: (post: Post) => void;
}

export function ActivityView({
  notifications,
  usersById,
  postsById,
  onOpenProfile,
  onOpenPostDetail,
}: ActivityViewProps) {
  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div>
          <h2 className="font-display text-xl font-semibold text-zinc-950 dark:text-white">
            Activity
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Real-time likes, comments, and new followers
          </p>
        </div>

        {unreadIds.length > 0 && (
          <button
            type="button"
            onClick={() => void markNotificationsRead(unreadIds)}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <CheckCheck className="h-3.5 w-3.5 text-rose-600" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Bell className="mx-auto h-8 w-8 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            No notifications yet
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            When people like, comment on your frames, or follow you, updates appear here live.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {notifications.map((item) => {
            const actor = usersById.get(item.actorId);
            const post = item.postId ? postsById.get(item.postId) : undefined;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-4 px-4 py-3.5 transition-colors ${
                  !item.read ? 'bg-rose-50/40 dark:bg-rose-950/15' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(item.actorId)}
                    className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700"
                  >
                    <SafeImage
                      src={actor?.avatarUrl || ''}
                      alt={actor?.displayName || 'User'}
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <div className="min-w-0 text-sm">
                    <p className="text-zinc-800 dark:text-zinc-200">
                      <button
                        type="button"
                        onClick={() => onOpenProfile(item.actorId)}
                        className="mr-1 font-semibold text-zinc-950 hover:underline dark:text-white"
                      >
                        {actor?.username || 'creator'}
                      </button>
                      {item.type === 'like' && 'liked your photograph'}
                      {item.type === 'comment' && `commented: "${item.previewText || ''}"`}
                      {item.type === 'follow' && 'started following you'}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-400">
                      {item.type === 'like' && <Heart className="h-3 w-3 text-rose-600" />}
                      {item.type === 'comment' && <MessageCircle className="h-3 w-3 text-zinc-500" />}
                      {item.type === 'follow' && <UserPlus className="h-3 w-3 text-zinc-500" />}
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {post && (
                  <button
                    type="button"
                    onClick={() => onOpenPostDetail(post)}
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
                  >
                    <SafeImage
                      src={post.imageUrl}
                      alt="Post thumbnail"
                      className="h-full w-full object-cover"
                    />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
