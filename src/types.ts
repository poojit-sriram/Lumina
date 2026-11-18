import type { Timestamp } from 'firebase/firestore';

export type TopicCategory =
  | 'Street'
  | 'Architecture'
  | 'Nature'
  | 'Minimal'
  | 'Portrait'
  | 'Culinary';

export type AspectRatioOption = '1:1' | '3:4' | '4:3' | '4:5';

export type FeedMode = 'for-you' | 'following' | 'latest';

export type NavTab = 'home' | 'explore' | 'messages' | 'activity' | 'profile';

export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  favoriteTopics: TopicCategory[];
  isSeeded: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Post {
  id: string;
  authorId: string;
  imageUrl: string;
  aspectRatio: AspectRatioOption;
  filterName: string;
  caption: string;
  location: string;
  topic: TopicCategory;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  savesCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Timestamp | null;
}

export interface LikeRecord {
  postId: string;
  userId: string;
  createdAt: Timestamp | null;
}

export interface SaveRecord {
  postId: string;
  userId: string;
  createdAt: Timestamp | null;
}

export interface FollowRecord {
  followerId: string;
  followingId: string;
  createdAt: Timestamp | null;
}

export interface Story {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string;
  createdAt: Timestamp | null;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageText: string;
  lastMessageSenderId: string;
  unreadBy: string[];
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  participants: string[];
  text: string;
  sharedPostId?: string;
  sharedPostImageUrl?: string;
  sharedPostAuthorUsername?: string;
  imageUrl?: string;
  createdAt: Timestamp | null;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  actorId: string;
  type: 'like' | 'comment' | 'follow';
  postId?: string;
  previewText?: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export interface RankedPost {
  post: Post;
  score: number;
  reasons: string[];
}
