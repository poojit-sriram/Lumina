import { useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import { sendDirectMessage } from '../lib/firestoreActions';
import type { Post, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface ShareToDmModalProps {
  post: Post | null;
  currentUid: string;
  users: UserProfile[];
  usersById: Map<string, UserProfile>;
  onClose: () => void;
  onSent: (recipientUid: string) => void;
}

export function ShareToDmModal({
  post,
  currentUid,
  users,
  usersById,
  onClose,
  onSent,
}: ShareToDmModalProps) {
  const [note, setNote] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(() => new Set());

  if (!post) return null;

  const postAuthor = usersById.get(post.authorId);
  const recipients = users.filter((u) => u.uid !== currentUid);

  const handleSend = async (recipientUid: string) => {
    setSendingTo(recipientUid);
    try {
      await sendDirectMessage({
        currentUid,
        otherUid: recipientUid,
        text: note,
        sharedPost: {
          id: post.id,
          imageUrl: post.imageUrl,
          authorUsername: postAuthor?.username || 'creator',
        },
      });
      setSentTo((prev) => new Set(prev).add(recipientUid));
      onSent(recipientUid);
    } finally {
      setSendingTo(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Send in Direct Message
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
              <SafeImage
                src={post.imageUrl}
                alt={post.caption || 'Post'}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-950 dark:text-white">
                @{postAuthor?.username || 'creator'}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {post.caption || post.topic}
              </p>
            </div>
          </div>

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write an optional note..."
            maxLength={240}
            className="min-h-[42px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
          />

          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {recipients.map((u) => {
              const isSent = sentTo.has(u.uid);
              return (
                <div
                  key={u.uid}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                      <SafeImage
                        src={u.avatarUrl}
                        alt={u.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                        {u.displayName}
                      </p>
                      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                        @{u.username}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend(u.uid)}
                    disabled={sendingTo === u.uid || isSent}
                    className={`inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
                      isSent
                        ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        : 'bg-rose-600 text-white hover:bg-rose-700'
                    }`}
                  >
                    {isSent ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>{sendingTo === u.uid ? 'Sending...' : 'Send'}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
