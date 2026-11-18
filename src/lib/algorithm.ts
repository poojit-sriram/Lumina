import type { Post, RankedPost, TopicCategory, UserProfile } from '../types';

export function getPostTimestampMs(post: Post): number {
  if (!post.createdAt) return Date.now();
  if (typeof post.createdAt.toMillis === 'function') {
    return post.createdAt.toMillis();
  }
  return Date.now();
}

export function formatRelativeTime(timestamp: Post['createdAt']): string {
  if (!timestamp || typeof timestamp.toMillis !== 'function') {
    return 'Just now';
  }
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp.toMillis()) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return new Date(timestamp.toMillis()).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

interface RankContext {
  currentUid: string;
  currentUserProfile: UserProfile | null;
  followingIds: Set<string>;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  allPosts: Post[];
}

export function rankFeedPosts(posts: Post[], ctx: RankContext): RankedPost[] {
  // Infer user's dynamic topic & author affinity from past likes & saves
  const topicWeights = new Map<TopicCategory, number>();
  const authorInteractionBoost = new Map<string, number>();

  if (ctx.currentUserProfile?.favoriteTopics) {
    for (const topic of ctx.currentUserProfile.favoriteTopics) {
      topicWeights.set(topic, (topicWeights.get(topic) ?? 0) + 18);
    }
  }

  for (const p of ctx.allPosts) {
    if (ctx.likedPostIds.has(p.id)) {
      topicWeights.set(p.topic, (topicWeights.get(p.topic) ?? 0) + 10);
      authorInteractionBoost.set(
        p.authorId,
        (authorInteractionBoost.get(p.authorId) ?? 0) + 8
      );
    }
    if (ctx.savedPostIds.has(p.id)) {
      topicWeights.set(p.topic, (topicWeights.get(p.topic) ?? 0) + 14);
      authorInteractionBoost.set(
        p.authorId,
        (authorInteractionBoost.get(p.authorId) ?? 0) + 12
      );
    }
  }

  const now = Date.now();

  const ranked: RankedPost[] = posts.map((post) => {
    const reasons: string[] = [];
    let score = 0;

    // 1. Social graph affinity
    if (ctx.followingIds.has(post.authorId)) {
      score += 36;
      reasons.push('From someone you follow');
    } else if (post.authorId === ctx.currentUid) {
      score += 24;
      reasons.push('Your recent post');
    }

    const interactionBoost = authorInteractionBoost.get(post.authorId) ?? 0;
    if (interactionBoost > 0) {
      score += Math.min(interactionBoost, 24);
      if (!ctx.followingIds.has(post.authorId) && post.authorId !== ctx.currentUid) {
        reasons.push('Creator you engage with');
      }
    }

    // 2. Topic / Interest affinity
    const topicScore = topicWeights.get(post.topic) ?? 0;
    if (topicScore > 0) {
      score += Math.min(topicScore, 34);
      reasons.push(`Matches ${post.topic} interest`);
    }

    // 3. Engagement velocity with time decay
    const ageHours = Math.max(0.25, (now - getPostTimestampMs(post)) / (1000 * 60 * 60));
    const engagementRaw =
      post.likesCount * 2 + post.commentsCount * 3.5 + post.savesCount * 4;
    const velocity = (engagementRaw / Math.pow(ageHours + 2, 1.25)) * 12;
    score += Math.min(velocity, 45);
    if (engagementRaw >= 4) {
      reasons.push('High community engagement');
    }

    // 4. Freshness boost (recent shares rise quickly)
    const freshness = 24 * Math.exp(-ageHours / 18);
    score += freshness;
    if (ageHours < 6) {
      reasons.push('Freshly shared');
    }

    if (reasons.length === 0) {
      reasons.push('Curated for discovery');
    }

    return {
      post,
      score: Math.round(score),
      reasons,
    };
  });

  return ranked.sort((a, b) => b.score - a.score);
}

export function getSuggestedCreators(
  users: UserProfile[],
  currentUid: string,
  followingIds: Set<string>,
  preferredTopics: TopicCategory[]
): UserProfile[] {
  const prefSet = new Set(preferredTopics);
  return users
    .filter((u) => u.uid !== currentUid && !followingIds.has(u.uid))
    .sort((a, b) => {
      const aOverlap = a.favoriteTopics.filter((t) => prefSet.has(t)).length;
      const bOverlap = b.favoriteTopics.filter((t) => prefSet.has(t)).length;
      return bOverlap - aOverlap;
    })
    .slice(0, 4);
}
