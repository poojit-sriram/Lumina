import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Bookmark, Heart, Send, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatRelativeTime } from '../lib/algorithm';
import { addComment, toggleLikePost, toggleSavePost } from '../lib/firestoreActions';
import type { Post, PostComment, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface PostDetailModalProps {
  post: Post | null;
  usersById: Map<string, UserProfile>;
  currentUid: string;
  isLiked: boolean;
  isSaved: boolean;
  onClose: () => void;
  onOpenProfile: (uid: string) => void;
  onShareToDm: (post: Post) => void;
}

export function PostDetailModal({
  post,
  usersById,
  currentUid,
  isLiked,
  isSaved,
  onClose,
  onOpenProfile,
  onShareToDm,
}: PostDetailModalProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!post) return;
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => d.data() as PostComment));
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/comments`);
      }
    );
    return () => unsub();
  }, [post]);

  useEffect(() => {
    if (!post) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [post, onClose]);

  if (!post) return null;

  const author = usersById.get(post.authorId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      await addComment(post, currentUid, commentText);
      setCommentText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl md:grid-cols-12 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-center bg-zinc-950 md:col-span-7">
          <SafeImage
            src={post.imageUrl}
            alt={post.caption || 'Photograph'}
            className="max-h-[55vh] w-full object-contain md:max-h-[90vh]"
          />
        </div>

        <div className="flex max-h-[45vh] flex-col md:col-span-5 md:max-h-[90vh]">
          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProfile(post.authorId);
              }}
              className="flex items-center gap-3 text-left"
            >
              <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-800">
                <SafeImage
                  src={author?.avatarUrl || ''}
                  alt={author?.displayName || 'Creator'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                  {author?.username || 'photographer'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {post.location ? `${post.location} · ` : ''}
                  {post.topic}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close lightbox"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {post.caption && (
              <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                <span className="mr-1.5 font-semibold text-zinc-950 dark:text-white">
                  {author?.username || 'photographer'}
                </span>
                {post.caption}
                <p className="mt-1 text-xs text-zinc-400">
                  {formatRelativeTime(post.createdAt)}
                </p>
              </div>
            )}

            <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
              {comments.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  No comments yet.
                </p>
              ) : (
                comments.map((c) => {
                  const cAuthor = usersById.get(c.authorId);
                  return (
                    <div key={c.id} className="text-sm">
                      <span className="mr-1.5 font-semibold text-zinc-950 dark:text-white">
                        {cAuthor?.username || 'user'}
                      </span>
                      <span className="text-zinc-700 dark:text-zinc-300">{c.text}</span>
                      <span className="ml-2 text-xs text-zinc-400">
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleLikePost(post, currentUid, isLiked)}
                  aria-label="Like"
                  className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Heart
                    className={`h-5 w-5 ${isLiked ? 'fill-rose-600 text-rose-600' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onShareToDm(post);
                  }}
                  aria-label="Send in message"
                  className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => toggleSavePost(post, currentUid, isSaved)}
                aria-label="Bookmark"
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <Bookmark
                  className={`h-5 w-5 ${
                    isSaved ? 'fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white' : ''
                  }`}
                />
              </button>
            </div>

            <p className="mt-1 text-xs font-semibold tabular-nums text-zinc-950 dark:text-white">
              {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
            </p>

            <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={500}
                className="min-h-[40px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-950 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || sending}
                className="min-h-[40px] rounded-xl px-3 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                Post
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
