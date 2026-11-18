import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import {
  Bell,
  Camera,
  Compass,
  Home,
  LogOut,
  MessageCircle,
  Moon,
  PlusSquare,
  Sun,
  User as UserIcon,
} from 'lucide-react';
import { ActivityView } from './components/ActivityView';
import { AuthGate } from './components/AuthGate';
import { CreatePostModal } from './components/CreatePostModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ExploreGrid } from './components/ExploreGrid';
import { MessagesView } from './components/MessagesView';
import { PostCard } from './components/PostCard';
import { PostDetailModal } from './components/PostDetailModal';
import { ProfileView } from './components/ProfileView';
import { SafeImage } from './components/SafeImage';
import { ShareToDmModal } from './components/ShareToDmModal';
import { StoriesBar } from './components/StoriesBar';
import {
  getPostTimestampMs,
  getSuggestedCreators,
  rankFeedPosts,
} from './lib/algorithm';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import {
  ensureUserProfile,
  toggleFollowUser,
} from './lib/firestoreActions';
import { seedInitialCatalogIfAdmin } from './lib/seedData';
import type {
  Conversation,
  FeedMode,
  FollowRecord,
  LikeRecord,
  NavTab,
  NotificationItem,
  Post,
  SaveRecord,
  Story,
  TopicCategory,
  UserProfile,
} from './types';

function LuminaWorkspace() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [feedMode, setFeedMode] = useState<FeedMode>('for-you');
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);
  const [activeDmPeerUid, setActiveDmPeerUid] = useState<string | null>(null);

  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'post' | 'story'>('post');
  const [detailPostId, setDetailPostId] = useState<string | null>(null);
  const [sharePost, setSharePost] = useState<Post | null>(null);

  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreTopic, setExploreTopic] = useState<'All' | TopicCategory>('All');

  // Real-time Firestore collections
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [follows, setFollows] = useState<FollowRecord[]>([]);
  const [likes, setLikes] = useState<LikeRecord[]>([]);
  const [saves, setSaves] = useState<SaveRecord[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user) {
        void ensureUserProfile(user);
        void seedInitialCatalogIfAdmin(user.email);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setUsers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubPosts = onSnapshot(
      query(collection(db, 'posts'), orderBy('createdAt', 'desc')),
      (snap) => setPosts(snap.docs.map((d) => d.data() as Post)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'posts')
    );

    const unsubStories = onSnapshot(
      query(collection(db, 'stories'), orderBy('createdAt', 'desc')),
      (snap) => setStories(snap.docs.map((d) => d.data() as Story)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'stories')
    );

    const unsubFollows = onSnapshot(
      collection(db, 'follows'),
      (snap) => setFollows(snap.docs.map((d) => d.data() as FollowRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'follows')
    );

    const unsubLikes = onSnapshot(
      query(collection(db, 'likes'), where('userId', '==', uid)),
      (snap) => setLikes(snap.docs.map((d) => d.data() as LikeRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'likes')
    );

    const unsubSaves = onSnapshot(
      query(collection(db, 'saves'), where('userId', '==', uid)),
      (snap) => setSaves(snap.docs.map((d) => d.data() as SaveRecord)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'saves')
    );

    const unsubConversations = onSnapshot(
      query(collection(db, 'conversations'), where('participants', 'array-contains', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Conversation);
        list.sort((a, b) => {
          const aMs = a.updatedAt?.toMillis?.() ?? 0;
          const bMs = b.updatedAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        setConversations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), where('recipientId', '==', uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as NotificationItem);
        list.sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() ?? 0;
          const bMs = b.createdAt?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubUsers();
      unsubPosts();
      unsubStories();
      unsubFollows();
      unsubLikes();
      unsubSaves();
      unsubConversations();
      unsubNotifications();
    };
  }, [authReady, firebaseUser]);

  const currentUid = firebaseUser?.uid ?? '';

  const usersById = useMemo(() => {
    const map = new Map<string, UserProfile>();
    for (const u of users) map.set(u.uid, u);
    return map;
  }, [users]);

  const postsById = useMemo(() => {
    const map = new Map<string, Post>();
    for (const p of posts) map.set(p.id, p);
    return map;
  }, [posts]);

  const currentUserProfile = usersById.get(currentUid) ?? null;

  const followingIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of follows) {
      if (f.followerId === currentUid) set.add(f.followingId);
    }
    return set;
  }, [follows, currentUid]);

  const likedPostIds = useMemo(
    () => new Set(likes.map((l) => l.postId)),
    [likes]
  );

  const savedPostIds = useMemo(
    () => new Set(saves.map((s) => s.postId)),
    [saves]
  );

  const rankedForYouPosts = useMemo(
    () =>
      rankFeedPosts(posts, {
        currentUid,
        currentUserProfile,
        followingIds,
        likedPostIds,
        savedPostIds,
        allPosts: posts,
      }),
    [posts, currentUid, currentUserProfile, followingIds, likedPostIds, savedPostIds]
  );

  const displayedFeedItems = useMemo(() => {
    if (feedMode === 'for-you') {
      return rankedForYouPosts;
    }
    if (feedMode === 'following') {
      return posts
        .filter((p) => followingIds.has(p.authorId) || p.authorId === currentUid)
        .sort((a, b) => getPostTimestampMs(b) - getPostTimestampMs(a))
        .map((post) => ({ post, score: undefined, reasons: undefined }));
    }
    return [...posts]
      .sort((a, b) => getPostTimestampMs(b) - getPostTimestampMs(a))
      .map((post) => ({ post, score: undefined, reasons: undefined }));
  }, [feedMode, rankedForYouPosts, posts, followingIds, currentUid]);

  const suggestedCreators = useMemo(
    () =>
      getSuggestedCreators(
        users,
        currentUid,
        followingIds,
        currentUserProfile?.favoriteTopics ?? []
      ),
    [users, currentUid, followingIds, currentUserProfile]
  );

  const unreadDmCount = useMemo(
    () => conversations.filter((c) => c.unreadBy.includes(currentUid)).length,
    [conversations, currentUid]
  );

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const openProfile = (uid: string) => {
    setSelectedProfileUid(uid);
    setActiveTab('profile');
  };

  const openMessagesWith = (uid: string) => {
    setActiveDmPeerUid(uid);
    setActiveTab('messages');
  };

  const handleTagClick = (tag: string) => {
    setExploreTopic('All');
    setExploreQuery(tag);
    setActiveTab('explore');
  };

  const activeProfileUid = selectedProfileUid ?? currentUid;
  const activeProfile = usersById.get(activeProfileUid);
  const activeProfilePosts = useMemo(
    () => posts.filter((p) => p.authorId === activeProfileUid),
    [posts, activeProfileUid]
  );
  const activeProfileSavedPosts = useMemo(
    () => posts.filter((p) => savedPostIds.has(p.id)),
    [posts, savedPostIds]
  );

  const activeProfileFollowers = useMemo(
    () => follows.filter((f) => f.followingId === activeProfileUid).length,
    [follows, activeProfileUid]
  );
  const activeProfileFollowing = useMemo(
    () => follows.filter((f) => f.followerId === activeProfileUid).length,
    [follows, activeProfileUid]
  );

  const detailPost = detailPostId ? postsById.get(detailPostId) ?? null : null;

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2.5 text-zinc-600 dark:text-zinc-400">
          <Camera className="h-5 w-5 text-rose-600" />
          <span className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
            Lumina
          </span>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthGate />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Mobile Top Header (compact, <= 52px) */}
      <header className="sticky top-0 z-30 flex h-13 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/90">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"
        >
          <Camera className="h-5 w-5 text-rose-600" strokeWidth={1.75} />
          <span>Lumina</span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDarkMode((d) => !d)}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            aria-label="Activity"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-rose-600">
                {unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Left Navigation Rail */}
        <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col justify-between border-r border-zinc-200 bg-white px-3 py-6 md:flex xl:w-64 xl:px-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-8">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className="flex items-center justify-center gap-2.5 px-2 xl:justify-start"
            >
              <Camera className="h-6 w-6 shrink-0 text-rose-600" strokeWidth={1.75} />
              <span className="hidden font-display text-xl font-bold tracking-tight whitespace-nowrap xl:inline">
                Lumina
              </span>
            </button>

            <nav className="space-y-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                className={`flex min-h-[44px] w-full items-center justify-center gap-3.5 rounded-xl px-3 text-sm whitespace-nowrap transition-colors xl:justify-start ${
                  activeTab === 'home'
                    ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-white'
                    : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white'
                }`}
              >
                <Home className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('explore')}
                className={`flex min-h-[44px] w-full items-center justify-center gap-3.5 rounded-xl px-3 text-sm whitespace-nowrap transition-colors xl:justify-start ${
                  activeTab === 'explore'
                    ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-white'
                    : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white'
                }`}
              >
                <Compass className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">Explore</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('messages')}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-white'
                    : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center justify-center gap-3.5 xl:justify-start">
                  <MessageCircle className="h-5 w-5 shrink-0" />
                  <span className="hidden xl:inline">Messages</span>
                </span>
                {unreadDmCount > 0 && (
                  <span className="hidden text-xs font-bold tabular-nums text-rose-600 xl:inline">
                    {unreadDmCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'activity'
                    ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-white'
                    : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white'
                }`}
              >
                <span className="flex items-center justify-center gap-3.5 xl:justify-start">
                  <Bell className="h-5 w-5 shrink-0" />
                  <span className="hidden xl:inline">Activity</span>
                </span>
                {unreadNotifCount > 0 && (
                  <span className="hidden text-xs font-bold tabular-nums text-rose-600 xl:inline">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setComposerMode('post');
                  setComposerOpen(true);
                }}
                className="flex min-h-[44px] w-full items-center justify-center gap-3.5 rounded-xl px-3 text-sm font-medium text-zinc-600 whitespace-nowrap transition-colors hover:bg-zinc-50 hover:text-zinc-950 xl:justify-start dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white"
              >
                <PlusSquare className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">Create</span>
              </button>

              <button
                type="button"
                onClick={() => openProfile(currentUid)}
                className={`flex min-h-[44px] w-full items-center justify-center gap-3.5 rounded-xl px-3 text-sm whitespace-nowrap transition-colors xl:justify-start ${
                  activeTab === 'profile' && activeProfileUid === currentUid
                    ? 'bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-900 dark:text-white'
                    : 'font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-white'
                }`}
              >
                <UserIcon className="h-5 w-5 shrink-0" />
                <span className="hidden xl:inline">Profile</span>
              </button>
            </nav>
          </div>

          <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDarkMode((d) => !d)}
              className="flex min-h-[40px] w-full items-center justify-center gap-3 rounded-xl px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 xl:justify-start dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              {darkMode ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              <span className="hidden xl:inline">{darkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="flex min-h-[40px] w-full items-center justify-center gap-3 rounded-xl px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-100 xl:justify-start dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="min-w-0 flex-1 px-4 pt-5 pb-20 sm:px-6 md:py-8 lg:px-10">
          {activeTab === 'home' && (
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 xl:grid-cols-12">
              {/* Feed Column */}
              <div className="space-y-6 xl:col-span-8">
                <StoriesBar
                  stories={stories}
                  usersById={usersById}
                  currentUid={currentUid}
                  onAddStoryClick={() => {
                    setComposerMode('story');
                    setComposerOpen(true);
                  }}
                  onOpenProfile={openProfile}
                />

                {/* Feed Mode Segmented Switcher */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3 dark:border-zinc-800">
                  <div className="flex items-center gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
                    <button
                      type="button"
                      onClick={() => setFeedMode('for-you')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        feedMode === 'for-you'
                          ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                          : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      For You
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedMode('following')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        feedMode === 'following'
                          ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                          : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Following
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeedMode('latest')}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                        feedMode === 'latest'
                          ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                          : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                      }`}
                    >
                      Latest
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setComposerMode('post');
                      setComposerOpen(true);
                    }}
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    <PlusSquare className="h-3.5 w-3.5" />
                    <span>Share Photo</span>
                  </button>
                </div>

                {displayedFeedItems.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <Camera
                      className="mx-auto h-9 w-9 text-zinc-300 dark:text-zinc-700"
                      strokeWidth={1.5}
                    />
                    <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {feedMode === 'following'
                        ? 'Your Following feed is quiet'
                        : 'No photographs published yet'}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {feedMode === 'following'
                        ? 'Follow photographers from Suggested Creators or switch to For You.'
                        : 'Publish the first frame to start your real-time gallery feed.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedFeedItems.map(({ post, score, reasons }) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        author={usersById.get(post.authorId)}
                        currentUid={currentUid}
                        usersById={usersById}
                        isLiked={likedPostIds.has(post.id)}
                        isSaved={savedPostIds.has(post.id)}
                        isFollowing={followingIds.has(post.authorId)}
                        algorithmScore={score}
                        algorithmReasons={reasons}
                        onOpenProfile={openProfile}
                        onOpenDetail={(p) => setDetailPostId(p.id)}
                        onShareToDm={(p) => setSharePost(p)}
                        onTagClick={handleTagClick}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right Discovery Rail */}
              <aside className="hidden space-y-6 xl:col-span-4 xl:block">
                {currentUserProfile && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                      type="button"
                      onClick={() => openProfile(currentUid)}
                      className="flex min-w-0 items-center gap-3 text-left"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                        <SafeImage
                          src={currentUserProfile.avatarUrl}
                          alt={currentUserProfile.displayName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-white">
                          {currentUserProfile.displayName}
                        </p>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          @{currentUserProfile.username}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openProfile(currentUid)}
                      className="shrink-0 text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                    >
                      Profile
                    </button>
                  </div>
                )}

                {suggestedCreators.length > 0 && (
                  <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        Suggested Creators
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('explore')}
                        className="text-xs font-semibold text-zinc-950 hover:underline dark:text-white"
                      >
                        Explore
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {suggestedCreators.map((creator) => (
                        <div
                          key={creator.uid}
                          className="flex items-center justify-between gap-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => openProfile(creator.uid)}
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700">
                              <SafeImage
                                src={creator.avatarUrl}
                                alt={creator.displayName}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-zinc-950 dark:text-white">
                                {creator.username}
                              </p>
                              <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                {creator.favoriteTopics.slice(0, 2).join(' · ')}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openMessagesWith(creator.uid)}
                              aria-label={`Message ${creator.username}`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleFollowUser(currentUid, creator.uid, false)}
                              className="min-h-[32px] rounded-lg px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            >
                              Follow
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs leading-relaxed text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    How For You ranks frames
                  </p>
                  <p className="mt-1.5">
                    Posts are scored live using creators you follow, topics from your liked and saved frames, engagement velocity, and recency.
                  </p>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'explore' && (
            <div className="mx-auto max-w-5xl">
              <ExploreGrid
                posts={posts}
                usersById={usersById}
                searchQuery={exploreQuery}
                selectedTopic={exploreTopic}
                onSearchChange={setExploreQuery}
                onTopicChange={setExploreTopic}
                onOpenDetail={(p) => setDetailPostId(p.id)}
                onOpenProfile={openProfile}
              />
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="mx-auto max-w-5xl">
              <MessagesView
                currentUid={currentUid}
                users={users}
                usersById={usersById}
                conversations={conversations}
                activeOtherUid={activeDmPeerUid}
                postsById={postsById}
                onSelectOtherUid={setActiveDmPeerUid}
                onOpenPostDetail={(p) => setDetailPostId(p.id)}
                onOpenProfile={openProfile}
              />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="mx-auto max-w-2xl">
              <ActivityView
                notifications={notifications}
                usersById={usersById}
                postsById={postsById}
                onOpenProfile={openProfile}
                onOpenPostDetail={(p) => setDetailPostId(p.id)}
              />
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="mx-auto max-w-4xl">
              <ProfileView
                profile={activeProfile}
                currentUid={currentUid}
                posts={activeProfilePosts}
                savedPosts={activeProfileSavedPosts}
                followersCount={activeProfileFollowers}
                followingCount={activeProfileFollowing}
                isFollowing={followingIds.has(activeProfileUid)}
                onOpenPostDetail={(p) => setDetailPostId(p.id)}
                onMessageUser={openMessagesWith}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="fixed right-0 bottom-0 left-0 z-30 grid h-14 grid-cols-5 items-center border-t border-zinc-200 bg-white/95 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          aria-label="Home"
          className={`flex h-full flex-col items-center justify-center ${
            activeTab === 'home' ? 'text-rose-600' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explore')}
          aria-label="Explore"
          className={`flex h-full flex-col items-center justify-center ${
            activeTab === 'explore' ? 'text-rose-600' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <Compass className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">Explore</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setComposerMode('post');
            setComposerOpen(true);
          }}
          aria-label="Create post"
          className="flex h-full flex-col items-center justify-center text-zinc-700 dark:text-zinc-200"
        >
          <PlusSquare className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">Create</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          aria-label="Messages"
          className={`relative flex h-full flex-col items-center justify-center ${
            activeTab === 'messages' ? 'text-rose-600' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">
            DMs{unreadDmCount > 0 ? ` (${unreadDmCount})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => openProfile(currentUid)}
          aria-label="Profile"
          className={`flex h-full flex-col items-center justify-center ${
            activeTab === 'profile' ? 'text-rose-600' : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <UserIcon className="h-5 w-5" />
          <span className="mt-0.5 text-[10px] font-medium">Profile</span>
        </button>
      </nav>

      {/* Modals */}
      <CreatePostModal
        open={composerOpen}
        initialMode={composerMode}
        currentUid={currentUid}
        onClose={() => setComposerOpen(false)}
        onPublished={(mode) => {
          if (mode === 'post') setActiveTab('home');
        }}
      />

      <PostDetailModal
        post={detailPost}
        usersById={usersById}
        currentUid={currentUid}
        isLiked={detailPost ? likedPostIds.has(detailPost.id) : false}
        isSaved={detailPost ? savedPostIds.has(detailPost.id) : false}
        onClose={() => setDetailPostId(null)}
        onOpenProfile={openProfile}
        onShareToDm={(p) => setSharePost(p)}
      />

      <ShareToDmModal
        post={sharePost}
        currentUid={currentUid}
        users={users}
        usersById={usersById}
        onClose={() => setSharePost(null)}
        onSent={(recipientUid) => {
          setSharePost(null);
          openMessagesWith(recipientUid);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <LuminaWorkspace />
    </ErrorBoundary>
  );
}
