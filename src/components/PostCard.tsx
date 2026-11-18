import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Bookmark,
  Heart,
  Info,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatRelativeTime } from '../lib/algorithm';
import {
  addComment,
  deletePost,
  toggleFollowUser,
  toggleLikePost,
  toggleSavePost,
} from '../lib/firestoreActions';
import type { Post, PostComment, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface PostCardProps {
  post: Post;
  author: UserProfile | undefined;
  currentUid: string;
  usersById: Map<string, UserProfile>;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
  algorithmReasons?: string[];
  algorithmScore?: number;
  onOpenProfile: (uid: string) => void;
  onOpenDetail: (post: Post) => void;
  onShareToDm: (post: Post) => void;
  onTagClick: (tag: string) => void;
}

export function PostCard({
  post,
  author,
  currentUid,
  usersById,
  isLiked,
  isSaved,
  isFollowing,
  algorithmReasons,
  algorithmScore,
  onOpenProfile,
  onOpenDetail,
  onShareToDm,
  onTagClick,
}: PostCardProps) {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [showAlgoDetails, setShowAlgoDetails] = useState(false);
  const [busyLike, setBusyLike] = useState(false);
  const [busySave, setBusySave] = useState(false);

  useEffect(() => {
    if (!showComments) return;
    const q = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(
          snap.docs.map((d) => d.data() as PostComment)
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, `posts/${post.id}/comments`);
      }
    );
    return () => unsub();
  }, [post.id, showComments]);

  const handleLike = async () => {
    if (busyLike) return;
    setBusyLike(true);
    try {
      await toggleLikePost(post, currentUid, isLiked);
    } finally {
      setBusyLike(false);
    }
  };

  const handleDoubleClickImage = async () => {
    setShowHeartBurst(true);
    window.setTimeout(() => setShowHeartBurst(false), 550);
    if (!isLiked && !busyLike) {
      await handleLike();
    }
  };

  const handleSave = async () => {
    if (busySave) return;
    setBusySave(true);
    try {
      await toggleSavePost(post, currentUid, isSaved);
    } finally {
      setBusySave(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      await addComment(post, currentUid, commentText);
      setCommentText('');
      setShowComments(true);
    } finally {
      setSubmittingComment(false);
    }
  };

  const aspectClass =
    post.aspectRatio === '1:1'
      ? 'aspect-square'
      : post.aspectRatio === '4:3'
      ? 'aspect-[4/3]'
      : post.aspectRatio === '4:5'
      ? 'aspect-[4/5]'
      : 'aspect-[3/4]';

  const isOwnPost = post.authorId === currentUid;

  return (
    <article className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onOpenProfile(post.authorId)}
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <SafeImage
              src={author?.avatarUrl || ''}
              alt={author?.displayName || 'Creator'}
              fallbackLabel={author?.username}
              className="h-full w-full object-cover"
            />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={() => onOpenProfile(post.authorId)}
                className="truncate font-semibold text-zinc-950 hover:underline dark:text-white"
              >
                {author?.username || 'photographer'}
              </button>
              <span className="text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
              {post.location && <span className="truncate">{post.location}</span>}
              {post.location && (
                <span aria-hidden="true">·</span>
              )}
              <span>{post.topic}</span>
              {post.filterName && post.filterName !== 'Original' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{post.filterName}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isOwnPost && (
            <button
              type="button"
              onClick={() => toggleFollowUser(currentUid, post.authorId, isFollowing)}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                isFollowing
                  ? 'border border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  : 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}

          {algorithmReasons && algorithmReasons.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAlgoDetails((v) => !v)}
              title="Feed ranking details"
              aria-label="Feed ranking details"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <Info className="h-4 w-4" />
            </button>
          )}

          {isOwnPost && (
            <button
              type="button"
              onClick={() => deletePost(post.id)}
              aria-label="Delete post"
              title="Delete post"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showAlgoDetails && algorithmReasons && (
        <div className="mb-3 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="font-semibold text-zinc-950 dark:text-zinc-100">
            Ranked {algorithmScore} pts
          </span>
          <span className="mx-1.5" aria-hidden="true">
            ·
          </span>
          <span>{algorithmReasons.join(' · ')}</span>
        </div>
      )}

      {/* Photo Frame */}
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 ${aspectClass}`}
      >
        <SafeImage
          src={post.imageUrl}
          alt={post.caption || `Photo by ${author?.displayName || 'creator'}`}
          fallbackLabel={post.location || post.topic}
          onDoubleClick={handleDoubleClickImage}
          className="h-full w-full cursor-pointer object-cover"
        />

        {showHeartBurst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart
              className="h-20 w-20 scale-110 fill-rose-600 text-rose-600 drop-shadow-lg transition-transform duration-200"
            />
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleLike}
            aria-label={isLiked ? 'Unlike post' : 'Like post'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-800 transition-transform hover:bg-zinc-100 active:scale-95 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isLiked ? 'fill-rose-600 text-rose-600' : ''
              }`}
            />
          </button>
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            aria-label="Comments"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onShareToDm(post)}
            aria-label="Send post in message"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          aria-label={isSaved ? 'Remove bookmark' : 'Bookmark post'}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <Bookmark
            className={`h-5 w-5 ${
              isSaved ? 'fill-zinc-950 text-zinc-950 dark:fill-white dark:text-white' : ''
            }`}
          />
        </button>
      </div>

      {/* Counts & Caption */}
      <div className="mt-1 space-y-1.5 px-1">
        <div className="flex items-center gap-3 text-xs font-semibold tabular-nums text-zinc-950 dark:text-white">
          <span>
            {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
          </span>
          {post.savesCount > 0 && (
            <>
              <span className="font-normal text-zinc-400" aria-hidden="true">
                ·
              </span>
              <span className="font-medium text-zinc-600 dark:text-zinc-400">
                {post.savesCount} saved
              </span>
            </>
          )}
        </div>

        {post.caption && (
          <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            <button
              type="button"
              onClick={() => onOpenProfile(post.authorId)}
              className="mr-1.5 font-semibold text-zinc-950 hover:underline dark:text-white"
            >
              {author?.username || 'photographer'}
            </button>
            {post.caption}
          </p>
        )}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick(tag)}
                className="hover:text-rose-600 hover:underline dark:hover:text-rose-400"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-0.5">
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {showComments
              ? 'Hide comments'
              : post.commentsCount > 0
              ? `View all ${post.commentsCount} comments`
              : 'Add a comment'}
          </button>
          <button
            type="button"
            onClick={() => onOpenDetail(post)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Open lightbox
          </button>
        </div>

        {showComments && (
          <div className="mt-3 space-y-2.5 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
            {comments.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No comments yet. Start the conversation.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {comments.map((c) => {
                  const cAuthor = usersById.get(c.authorId);
                  return (
                    <div key={c.id} className="flex items-baseline justify-between gap-2 text-xs">
                      <p className="text-zinc-800 dark:text-zinc-200">
                        <button
                          type="button"
                          onClick={() => onOpenProfile(c.authorId)}
                          className="mr-1.5 font-semibold text-zinc-950 hover:underline dark:text-white"
                        >
                          {cAuthor?.username || 'user'}
                        </button>
                        {c.text}
                      </p>
                      <span className="shrink-0 text-[11px] text-zinc-400">
                        {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                maxLength={500}
                className="min-h-[40px] flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || submittingComment}
                className="min-h-[40px] rounded-xl px-3 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                Post
              </button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
