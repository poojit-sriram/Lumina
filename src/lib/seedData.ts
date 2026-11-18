import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { AspectRatioOption, TopicCategory } from '../types';

export interface SeedCreator {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  favoriteTopics: TopicCategory[];
}

export interface SeedPost {
  id: string;
  authorId: string;
  imageUrl: string;
  aspectRatio: AspectRatioOption;
  filterName: string;
  caption: string;
  location: string;
  topic: TopicCategory;
  tags: string[];
}

export interface SeedStory {
  id: string;
  authorId: string;
  imageUrl: string;
  caption: string;
}

export const SEED_CREATORS: SeedCreator[] = [
  {
    uid: 'creator-maya',
    username: 'maya.arch',
    displayName: 'Maya Lin',
    bio: 'Architectural daylight & raw travertine studies. Based between Zurich and Kyoto.',
    avatarUrl: '/src/assets/images/avatar_maya_1795022038786.jpg',
    favoriteTopics: ['Architecture', 'Minimal'],
  },
  {
    uid: 'creator-julian',
    username: 'julian.35mm',
    displayName: 'Julian Vance',
    bio: 'Documentary street photographer shooting 35mm rain and late-evening neon.',
    avatarUrl: '/src/assets/images/avatar_julian_1795022038826.jpg',
    favoriteTopics: ['Street', 'Portrait'],
  },
  {
    uid: 'creator-sora',
    username: 'sora.table',
    displayName: 'Sora Takahashi',
    bio: 'Stoneware ceramics, morning rituals, and quiet coastal horizons.',
    avatarUrl: '/src/assets/images/avatar_sora_1795022038872.jpg',
    favoriteTopics: ['Culinary', 'Minimal'],
  },
  {
    uid: 'creator-marcus',
    username: 'marcus.form',
    displayName: 'Marcus Cole',
    bio: 'Industrial designer exploring acoustic spaces, alpine silence, and warm oak.',
    avatarUrl: '/src/assets/images/avatar_marcus_1795022040387.jpg',
    favoriteTopics: ['Nature', 'Minimal'],
  },
];

export const SEED_POSTS: SeedPost[] = [
  {
    id: 'seed-post-tokyo-rain',
    authorId: 'creator-julian',
    imageUrl: '/src/assets/images/photo_tokyo_rain_1795022040416.jpg',
    aspectRatio: '3:4',
    filterName: 'Original',
    caption: 'Paper lanterns reflected across wet cobblestones just after the evening downpour in Omoide Yokocho.',
    location: 'Shinjuku, Tokyo',
    topic: 'Street',
    tags: ['tokyo', '35mm', 'nightstreet'],
  },
  {
    id: 'seed-post-brutalist-sun',
    authorId: 'creator-maya',
    imageUrl: '/src/assets/images/photo_brutalist_sun_1795022041495.jpg',
    aspectRatio: '3:4',
    filterName: 'Crisp Daylight',
    caption: '4:45 PM shadow geometry slicing across the travertine colonnade. No artificial light needed.',
    location: 'Basel, Switzerland',
    topic: 'Architecture',
    tags: ['travertine', 'brutalism', 'lightandshadow'],
  },
  {
    id: 'seed-post-ceramics-table',
    authorId: 'creator-sora',
    imageUrl: '/src/assets/images/photo_ceramics_table_1795022041994.jpg',
    aspectRatio: '1:1',
    filterName: 'Kodak Warm',
    caption: 'First pour from the new speckled stoneware kiln batch before the studio opens.',
    location: 'Nakagyo, Kyoto',
    topic: 'Culinary',
    tags: ['ceramics', 'espresso', 'morninglight'],
  },
  {
    id: 'seed-post-alpine-mist',
    authorId: 'creator-marcus',
    imageUrl: '/src/assets/images/photo_alpine_mist_1795022041905.jpg',
    aspectRatio: '4:3',
    filterName: 'Original',
    caption: 'Zero wind at 5:40 AM. Low mist drifting above the treeline before the first ferry.',
    location: 'Dolomites, Italy',
    topic: 'Nature',
    tags: ['alpine', 'dawn', 'mediumformat'],
  },
  {
    id: 'seed-post-coastal-cliff',
    authorId: 'creator-sora',
    imageUrl: '/src/assets/images/photo_coastal_cliff_1795022041923.jpg',
    aspectRatio: '3:4',
    filterName: 'Kodak Warm',
    caption: 'Following the stone ridge path down toward the cobalt cove on Portra 400.',
    location: 'Amalfi Coast',
    topic: 'Nature',
    tags: ['coastline', 'portra400', 'summer'],
  },
  {
    id: 'seed-post-vinyl-studio',
    authorId: 'creator-marcus',
    imageUrl: '/src/assets/images/photo_vinyl_studio_1795022043000.jpg',
    aspectRatio: '1:1',
    filterName: 'Velvet Matte',
    caption: 'Sunday afternoon listening session. Birch shelving and late sun across oak planks.',
    location: 'Copenhagen',
    topic: 'Minimal',
    tags: ['listeningroom', 'vinyl', 'interiors'],
  },
];

export const SEED_STORIES: SeedStory[] = [
  {
    id: 'seed-story-maya',
    authorId: 'creator-maya',
    imageUrl: '/src/assets/images/photo_brutalist_sun_1795022041495.jpg',
    caption: 'Golden hour shadows in the west courtyard.',
  },
  {
    id: 'seed-story-julian',
    authorId: 'creator-julian',
    imageUrl: '/src/assets/images/photo_tokyo_rain_1795022040416.jpg',
    caption: 'Midnight walk through Shinjuku rain.',
  },
  {
    id: 'seed-story-sora',
    authorId: 'creator-sora',
    imageUrl: '/src/assets/images/photo_ceramics_table_1795022041994.jpg',
    caption: 'Fresh glaze test & morning pour-over.',
  },
  {
    id: 'seed-story-marcus',
    authorId: 'creator-marcus',
    imageUrl: '/src/assets/images/photo_vinyl_studio_1795022043000.jpg',
    caption: 'Spinning ambient records until dusk.',
  },
];

let seedAttempted = false;

export async function seedInitialCatalogIfAdmin(userEmail: string | null | undefined): Promise<void> {
  if (seedAttempted) return;
  if (userEmail !== '24ug1bycs669@bmsit.in') return;
  seedAttempted = true;

  try {
    const existingPosts = await getDocs(query(collection(db, 'posts'), limit(1)));
    if (!existingPosts.empty) return;

    const batch = writeBatch(db);
    for (const creator of SEED_CREATORS) {
      batch.set(doc(db, 'users', creator.uid), {
        uid: creator.uid,
        username: creator.username,
        displayName: creator.displayName,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        favoriteTopics: creator.favoriteTopics,
        isSeeded: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const post of SEED_POSTS) {
      batch.set(doc(db, 'posts', post.id), {
        id: post.id,
        authorId: post.authorId,
        imageUrl: post.imageUrl,
        aspectRatio: post.aspectRatio,
        filterName: post.filterName,
        caption: post.caption,
        location: post.location,
        topic: post.topic,
        tags: post.tags,
        likesCount: 0,
        commentsCount: 0,
        savesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    for (const story of SEED_STORIES) {
      batch.set(doc(db, 'stories', story.id), {
        id: story.id,
        authorId: story.authorId,
        imageUrl: story.imageUrl,
        caption: story.caption,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (err) {
    console.warn('Seed check skipped or failed:', err);
  }
}
