import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import {
  ArrowLeft,
  ImagePlus,
  MessageSquarePlus,
  Search,
  Send,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatRelativeTime } from '../lib/algorithm';
import {
  ensureConversation,
  getConversationId,
  markConversationRead,
  sendDirectMessage,
} from '../lib/firestoreActions';
import { processImageFile } from '../lib/imageUtils';
import type { Conversation, DirectMessage, Post, UserProfile } from '../types';
import { SafeImage } from './SafeImage';

interface MessagesViewProps {
  currentUid: string;
  users: UserProfile[];
  usersById: Map<string, UserProfile>;
  conversations: Conversation[];
  activeOtherUid: string | null;
  postsById: Map<string, Post>;
  onSelectOtherUid: (uid: string | null) => void;
  onOpenPostDetail: (post: Post) => void;
  onOpenProfile: (uid: string) => void;
}

export function MessagesView({
  currentUid,
  users,
  usersById,
  conversations,
  activeOtherUid,
  postsById,
  onSelectOtherUid,
  onOpenPostDetail,
  onOpenProfile,
}: MessagesViewProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [draftText, setDraftText] = useState('');
  const [sending, setSending] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showNewPicker, setShowNewPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConvId = activeOtherUid
    ? getConversationId(currentUid, activeOtherUid)
    : null;

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConvId) ?? null,
    [conversations, activeConvId]
  );

  // Subscribe to real-time messages for active thread
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    let unsub: (() => void) | undefined;
    let cancelled = false;

    const init = async () => {
      if (activeOtherUid) {
        await ensureConversation(currentUid, activeOtherUid);
      }
      if (cancelled) return;
      const q = query(
        collection(db, 'conversations', activeConvId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          setMessages(snap.docs.map((d) => d.data() as DirectMessage));
        },
        (err) => {
          handleFirestoreError(
            err,
            OperationType.LIST,
            `conversations/${activeConvId}/messages`
          );
        }
      );
    };

    void init();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [activeConvId, activeOtherUid, currentUid]);

  // Mark conversation as read when active
  useEffect(() => {
    if (activeConversation && activeConversation.unreadBy.includes(currentUid)) {
      void markConversationRead(
        activeConversation.id,
        currentUid,
        activeConversation.unreadBy
      );
    }
  }, [activeConversation, currentUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const otherUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users
      .filter((u) => u.uid !== currentUid)
      .filter(
        (u) =>
          !q ||
          u.username.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q)
      );
  }, [users, currentUid, userSearch]);

  const activePeer = activeOtherUid ? usersById.get(activeOtherUid) : undefined;

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOtherUid || !draftText.trim() || sending) return;
    setSending(true);
    try {
      await sendDirectMessage({
        currentUid,
        otherUid: activeOtherUid,
        text: draftText,
      });
      setDraftText('');
    } finally {
      setSending(false);
    }
  };

  const handleSendPhoto = async (file: File | undefined) => {
    if (!file || !activeOtherUid || sending) return;
    setSending(true);
    try {
      const processed = await processImageFile(file, 'none', 960);
      await sendDirectMessage({
        currentUid,
        otherUid: activeOtherUid,
        text: '',
        imageUrl: processed.dataUrl,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid h-[calc(100vh-8rem)] min-h-[540px] grid-cols-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white md:h-[calc(100vh-4rem)] md:grid-cols-12 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Left Conversation List */}
      <div
        className={`flex flex-col border-r border-zinc-200 dark:border-zinc-800 md:col-span-5 lg:col-span-4 ${
          activeOtherUid ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-800">
          <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-white">
            Direct Messages
          </h2>
          <button
            type="button"
            onClick={() => setShowNewPicker((v) => !v)}
            title="New message"
            aria-label="New message"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-zinc-100 p-3 dark:border-zinc-800/80">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Find a creator to message..."
              className="min-h-[38px] w-full rounded-xl border border-zinc-200 bg-zinc-50 pr-3 pl-9 text-xs text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showNewPicker || userSearch.trim() ? (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              <p className="px-4 py-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Start conversation
              </p>
              {otherUsers.map((u) => (
                <button
                  key={u.uid}
                  type="button"
                  onClick={() => {
                    onSelectOtherUid(u.uid);
                    setShowNewPicker(false);
                    setUserSearch('');
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                    <SafeImage
                      src={u.avatarUrl}
                      alt={u.displayName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                      {u.displayName}
                    </p>
                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      @{u.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="space-y-4 p-5 text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No private conversations yet. Choose a creator below to start messaging.
              </p>
              <div className="space-y-1 text-left">
                {otherUsers.slice(0, 5).map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => onSelectOtherUid(u.uid)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                      <SafeImage
                        src={u.avatarUrl}
                        alt={u.displayName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-zinc-950 dark:text-white">
                        {u.displayName}
                      </p>
                      <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                        @{u.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {conversations.map((conv) => {
                const peerId = conv.participants.find((id) => id !== currentUid) || '';
                const peer = usersById.get(peerId);
                const isSelected = peerId === activeOtherUid;
                const isUnread = conv.unreadBy.includes(currentUid);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => onSelectOtherUid(peerId)}
                    className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800/80'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                      <SafeImage
                        src={peer?.avatarUrl || ''}
                        alt={peer?.displayName || 'Creator'}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            isUnread
                              ? 'font-bold text-zinc-950 dark:text-white'
                              : 'font-semibold text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {peer?.displayName || peer?.username || 'Creator'}
                        </p>
                        <span className="shrink-0 text-[11px] text-zinc-400">
                          {formatRelativeTime(conv.updatedAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-xs ${
                            isUnread
                              ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                              : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {conv.lastMessageText || 'Conversation started'}
                        </p>
                        {isUnread && (
                          <span className="shrink-0 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Active Thread */}
      <div
        className={`flex flex-col md:col-span-7 lg:col-span-8 ${
          activeOtherUid ? 'flex' : 'hidden md:flex'
        }`}
      >
        {!activeOtherUid ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <MessageSquarePlus className="h-9 w-9 text-zinc-300 dark:text-zinc-700" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-base font-semibold text-zinc-950 dark:text-white">
              Your Private Messages
            </h3>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Select a conversation or pick a creator on the left to exchange photos, posts, and messages in real time.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSelectOtherUid(null)}
                  aria-label="Back to conversations"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => activePeer && onOpenProfile(activePeer.uid)}
                  className="flex items-center gap-3 text-left"
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                    <SafeImage
                      src={activePeer?.avatarUrl || ''}
                      alt={activePeer?.displayName || 'Creator'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {activePeer?.displayName || 'Creator'}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      @{activePeer?.username || 'creator'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-zinc-50/60 p-4 dark:bg-zinc-950/40">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Say hello to @{activePeer?.username || 'creator'} to begin this private thread.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUid;
                  const linkedPost = msg.sharedPostId ? postsById.get(msg.sharedPostId) : undefined;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm ${
                          isMine
                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                            : 'border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {msg.sharedPostImageUrl && (
                          <button
                            type="button"
                            onClick={() => linkedPost && onOpenPostDetail(linkedPost)}
                            className="block w-56 overflow-hidden rounded-xl border border-black/10 text-left dark:border-white/10"
                          >
                            <div className="aspect-[4/3] w-full overflow-hidden">
                              <SafeImage
                                src={msg.sharedPostImageUrl}
                                alt="Shared post"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <p
                              className={`px-2.5 py-1.5 text-[11px] font-medium ${
                                isMine
                                  ? 'bg-white/10 text-white dark:bg-black/10 dark:text-zinc-900'
                                  : 'bg-zinc-50 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                              }`}
                            >
                              Post by @{msg.sharedPostAuthorUsername || 'creator'}
                            </p>
                          </button>
                        )}

                        {msg.imageUrl && (
                          <div className="w-60 overflow-hidden rounded-xl">
                            <SafeImage
                              src={msg.imageUrl}
                              alt="Direct message photograph"
                              className="h-auto w-full object-cover"
                            />
                          </div>
                        )}

                        {msg.text && <p className="leading-relaxed break-words">{msg.text}</p>}
                      </div>
                      <span className="mt-1 px-1 text-[10px] text-zinc-400">
                        {formatRelativeTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSendText}
              className="flex items-center gap-2 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  void handleSendPhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending}
                aria-label="Send photo in message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
              <input
                type="text"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                maxLength={1000}
                placeholder={`Message @${activePeer?.username || 'creator'}...`}
                className="min-h-[42px] flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              />
              <button
                type="submit"
                disabled={!draftText.trim() || sending}
                aria-label="Send message"
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
