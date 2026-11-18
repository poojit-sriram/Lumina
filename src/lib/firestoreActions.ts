import type { User } from 'firebase/auth';
import {
  deleteDoc,
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import type { AspectRatioOption, Post, TopicCategory, UserProfile } from '../types';

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 22);
  const base = cleaned.length >= 3 ? cleaned : `lumina${cleaned || 'user'}`;
  return base;
}

export async function ensureUserProfile(firebaseUser: User): Promise<void> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const displayName = (firebaseUser.displayName || 'Lumina Photographer').trim().slice(0, 60);
      const emailPrefix = firebaseUser.email?.split('@')[0] || displayName;
      const username = `${sanitizeUsername(emailPrefix).slice(0, 20)}.${firebaseUser.uid.slice(0, 4).toLowerCase()}`;

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        username,
        displayName,
        bio: 'Visual storyteller on Lumina.',
        avatarUrl: firebaseUser.photoURL || '',
        favoriteTopics: ['Street', 'Architecture'],
        isSeeded: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(doc(db, 'users', firebaseUser.uid, 'private', 'info'), {
        uid: firebaseUser.uid,
        email: (firebaseUser.email || '').slice(0, 150),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Pick<UserProfile, 'username' | 'displayName' | 'bio' | 'avatarUrl' | 'favoriteTopics'>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      username: sanitizeUsername(updates.username),
      displayName: updates.displayName.trim().slice(0, 60) || 'Photographer',
      bio: updates.bio.trim().slice(0, 240),
      avatarUrl: updates.avatarUrl.slice(0, 450000),
      favoriteTopics: updates.favoriteTopics.slice(0, 6),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function createPost(params: {
  authorId: string;
  imageUrl: string;
  aspectRatio: AspectRatioOption;
  filterName: string;
  caption: string;
  location: string;
  topic: TopicCategory;
  tags: string[];
}): Promise<string> {
  const postId = makeId('post');
  const path = `posts/${postId}`;
  try {
    await setDoc(doc(db, 'posts', postId), {
      id: postId,
      authorId: params.authorId,
      imageUrl: params.imageUrl,
      aspectRatio: params.aspectRatio,
      filterName: params.filterName.slice(0, 40) || 'Original',
      caption: params.caption.trim().slice(0, 1000),
      location: params.location.trim().slice(0, 80),
      topic: params.topic,
      tags: params.tags.map((t) => t.replace(/^#/, '').toLowerCase().trim()).filter(Boolean).slice(0, 8),
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return postId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deletePost(postId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
  }
}

export async function toggleLikePost(
  post: Post,
  currentUid: string,
  currentlyLiked: boolean
): Promise<void> {
  const likeId = `${post.id}_${currentUid}`;
  const batch = writeBatch(db);
  try {
    if (currentlyLiked) {
      batch.delete(doc(db, 'likes', likeId));
      batch.update(doc(db, 'posts', post.id), {
        likesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'likes', likeId), {
        postId: post.id,
        userId: currentUid,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'posts', post.id), {
        likesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
      if (post.authorId !== currentUid) {
        const notifId = makeId('notif');
        batch.set(doc(db, 'notifications', notifId), {
          id: notifId,
          recipientId: post.authorId,
          actorId: currentUid,
          type: 'like',
          postId: post.id,
          previewText: post.caption.slice(0, 80),
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `likes/${likeId}`);
  }
}

export async function toggleSavePost(
  post: Post,
  currentUid: string,
  currentlySaved: boolean
): Promise<void> {
  const saveId = `${post.id}_${currentUid}`;
  const batch = writeBatch(db);
  try {
    if (currentlySaved) {
      batch.delete(doc(db, 'saves', saveId));
      batch.update(doc(db, 'posts', post.id), {
        savesCount: increment(-1),
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.set(doc(db, 'saves', saveId), {
        postId: post.id,
        userId: currentUid,
        createdAt: serverTimestamp(),
      });
      batch.update(doc(db, 'posts', post.id), {
        savesCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `saves/${saveId}`);
  }
}

export async function addComment(
  post: Post,
  currentUid: string,
  text: string
): Promise<void> {
  const cleanText = text.trim().slice(0, 500);
  if (!cleanText) return;

  const commentId = makeId('cmt');
  const batch = writeBatch(db);
  try {
    batch.set(doc(db, 'posts', post.id, 'comments', commentId), {
      id: commentId,
      postId: post.id,
      authorId: currentUid,
      text: cleanText,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'posts', post.id), {
      commentsCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    if (post.authorId !== currentUid) {
      const notifId = makeId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: post.authorId,
        actorId: currentUid,
        type: 'comment',
        postId: post.id,
        previewText: cleanText.slice(0, 100),
        read: false,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `posts/${post.id}/comments/${commentId}`);
  }
}

export async function toggleFollowUser(
  currentUid: string,
  targetUid: string,
  currentlyFollowing: boolean
): Promise<void> {
  if (currentUid === targetUid) return;
  const followId = `${currentUid}_${targetUid}`;
  try {
    if (currentlyFollowing) {
      await deleteDoc(doc(db, 'follows', followId));
    } else {
      const batch = writeBatch(db);
      batch.set(doc(db, 'follows', followId), {
        followerId: currentUid,
        followingId: targetUid,
        createdAt: serverTimestamp(),
      });
      const notifId = makeId('notif');
      batch.set(doc(db, 'notifications', notifId), {
        id: notifId,
        recipientId: targetUid,
        actorId: currentUid,
        type: 'follow',
        read: false,
        createdAt: serverTimestamp(),
      });
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `follows/${followId}`);
  }
}

export async function createStory(
  authorId: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  const storyId = makeId('story');
  try {
    await setDoc(doc(db, 'stories', storyId), {
      id: storyId,
      authorId,
      imageUrl,
      caption: caption.trim().slice(0, 180),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `stories/${storyId}`);
  }
}

export function getConversationId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

export async function ensureConversation(currentUid: string, otherUid: string): Promise<string> {
  const convId = getConversationId(currentUid, otherUid);
  const participants = [currentUid, otherUid].sort();
  const convRef = doc(db, 'conversations', convId);
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        id: convId,
        participants,
        lastMessageText: '',
        lastMessageSenderId: currentUid,
        unreadBy: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}`);
  }
}

export async function sendDirectMessage(params: {
  currentUid: string;
  otherUid: string;
  text: string;
  imageUrl?: string;
  sharedPost?: {
    id: string;
    imageUrl: string;
    authorUsername: string;
  };
}): Promise<string> {
  const convId = getConversationId(params.currentUid, params.otherUid);
  const participants = [params.currentUid, params.otherUid].sort();
  const convRef = doc(db, 'conversations', convId);
  const msgId = makeId('msg');
  const msgRef = doc(db, 'conversations', convId, 'messages', msgId);

  const cleanText = params.text.trim().slice(0, 1000);
  const previewText = cleanText
    ? cleanText.slice(0, 120)
    : params.sharedPost
    ? `Shared a photo by @${params.sharedPost.authorUsername}`
    : 'Sent a photo';

  try {
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        id: convId,
        participants,
        lastMessageText: previewText,
        lastMessageSenderId: params.currentUid,
        unreadBy: [params.otherUid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(convRef, {
        lastMessageText: previewText,
        lastMessageSenderId: params.currentUid,
        unreadBy: [params.otherUid],
        updatedAt: serverTimestamp(),
      });
    }

    const messagePayload: Record<string, unknown> = {
      id: msgId,
      conversationId: convId,
      senderId: params.currentUid,
      participants,
      text: cleanText,
      createdAt: serverTimestamp(),
    };
    if (params.imageUrl) {
      messagePayload.imageUrl = params.imageUrl;
    }
    if (params.sharedPost) {
      messagePayload.sharedPostId = params.sharedPost.id;
      messagePayload.sharedPostImageUrl = params.sharedPost.imageUrl;
      messagePayload.sharedPostAuthorUsername = params.sharedPost.authorUsername.slice(0, 40);
    }

    await setDoc(msgRef, messagePayload);
    return convId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages/${msgId}`);
  }
}

export async function markConversationRead(
  convId: string,
  currentUid: string,
  currentUnreadBy: string[]
): Promise<void> {
  if (!currentUnreadBy.includes(currentUid)) return;
  try {
    await updateDoc(doc(db, 'conversations', convId), {
      unreadBy: currentUnreadBy.filter((id) => id !== currentUid),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${convId}`);
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  try {
    for (const id of notificationIds) {
      batch.update(doc(db, 'notifications', id), { read: true });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'notifications');
  }
}
