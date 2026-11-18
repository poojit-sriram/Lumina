import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload, X } from 'lucide-react';
import { createPost, createStory } from '../lib/firestoreActions';
import { PHOTO_FILTERS, processImageFile } from '../lib/imageUtils';
import type { TopicCategory } from '../types';

const TOPICS: TopicCategory[] = [
  'Street',
  'Architecture',
  'Nature',
  'Minimal',
  'Portrait',
  'Culinary',
];

interface CreatePostModalProps {
  open: boolean;
  initialMode?: 'post' | 'story';
  currentUid: string;
  onClose: () => void;
  onPublished?: (mode: 'post' | 'story') => void;
}

export function CreatePostModal({
  open,
  initialMode = 'post',
  currentUid,
  onClose,
  onPublished,
}: CreatePostModalProps) {
  const [mode, setMode] = useState<'post' | 'story'>(initialMode);
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState(PHOTO_FILTERS[0]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [topic, setTopic] = useState<TopicCategory>('Street');
  const [tagsInput, setTagsInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPEG, PNG, or WebP).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetAndClose = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setCaption('');
    setLocation('');
    setTagsInput('');
    setSelectedFilter(PHOTO_FILTERS[0]);
    setError(null);
    onClose();
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || publishing) return;
    setPublishing(true);
    setError(null);

    try {
      const processed = await processImageFile(selectedFile, selectedFilter.cssFilter, 1080);

      if (mode === 'story') {
        await createStory(currentUid, processed.dataUrl, caption);
      } else {
        const parsedTags = tagsInput
          .split(/[\s,]+/)
          .map((t) => t.replace(/^#/, '').trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 8);

        await createPost({
          authorId: currentUid,
          imageUrl: processed.dataUrl,
          aspectRatio: processed.aspectRatio,
          filterName: selectedFilter.name,
          caption,
          location,
          topic,
          tags: parsedTags,
        });
      }

      onPublished?.(mode);
      handleResetAndClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish photograph.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={handleResetAndClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-4">
            <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-white">
              Share Frame
            </h2>
            <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setMode('post')}
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  mode === 'post'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Feed Post
              </button>
              <button
                type="button"
                onClick={() => setMode('story')}
                className={`rounded-md px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  mode === 'story'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Story
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetAndClose}
            aria-label="Close composer"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="space-y-5 p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
            className="hidden"
          />

          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileChange(e.dataTransfer.files?.[0]);
              }}
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center transition-colors hover:border-rose-500 hover:bg-zinc-100/70 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-rose-500"
            >
              <ImagePlus className="h-10 w-10 text-zinc-400" strokeWidth={1.5} />
              <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Select a photograph from your device
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Drag and drop or click to browse · Auto-optimized for fast sharing
              </p>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 dark:border-zinc-800">
                <img
                  src={previewUrl}
                  alt="Selected preview"
                  style={{ filter: selectedFilter.cssFilter }}
                  className="mx-auto max-h-[360px] w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xl bg-black/75 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-black"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Replace photo
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Darkroom Preset
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {PHOTO_FILTERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSelectedFilter(preset)}
                      className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedFilter.name === preset.name
                          ? 'border-rose-600 bg-rose-50 text-rose-700 dark:border-rose-500 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={mode === 'story' ? 180 : 1000}
              placeholder={
                mode === 'story'
                  ? 'Add a brief note to your story...'
                  : 'Tell the story behind this frame...'
              }
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
            />
          </div>

          {mode === 'post' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Topic Category
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as TopicCategory)}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={80}
                  placeholder="Kyoto, Japan"
                  className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Tags (comma or space separated)
                </label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="35mm, architecture, daylight"
                  className="min-h-[44px] w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="min-h-[44px] rounded-xl px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || publishing}
              className="min-h-[44px] rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-40"
            >
              {publishing
                ? 'Publishing...'
                : mode === 'story'
                ? 'Share to Story'
                : 'Publish Photo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
