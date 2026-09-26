import fs from 'fs';
import path from 'path';

export interface NanoBananaPrompt {
  id: number;
  title: string;
  description: string;
  content: string;
  category: string;
  style: string;
  author: string;
  image: string;
  date: string;
  featured: boolean;
}

export interface NanoBananaStats {
  total: number;
  categories: Record<string, number>;
  topStyles: Record<string, number>;
  averageCharLength: number;
  featuredCount: number;
  datasetSizeMB: number;
}

export interface SearchOptions {
  query?: string;
  category?: string;
  style?: string;
  featuredOnly?: boolean;
  sortBy?: 'newest' | 'oldest' | 'title' | 'length' | 'id';
  limit?: number;
  offset?: number;
}

export interface EnrichmentOptions {
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '21:9';
  stylePreset?: 'photorealistic' | 'cyberpunk' | 'anime' | 'cinematic' | 'oil-painting' | 'concept-art' | '3d-render';
  lighting?: 'golden-hour' | 'volumetric-fog' | 'neon-glow' | 'studio-dramatic' | 'bioluminescent';
  cameraAngle?: 'wide-angle' | 'macro-close-up' | 'low-angle-heroic' | 'isometric' | 'drone-overhead';
  negativePromptEnabled?: boolean;
}

class NanoBananaEngine {
  private prompts: NanoBananaPrompt[] = [];
  private isLoaded = false;
  private datasetSizeBytes = 0;

  constructor() {
    this.ensureLoaded();
  }

  private ensureLoaded(): void {
    if (this.isLoaded && this.prompts.length > 0) return;

    const candidatePaths = [
      path.join(process.cwd(), 'public', 'nano-banana-prompts.json'),
      path.join(process.cwd(), 'awesome-nano-banana-pro-prompts-main', 'website', 'public', 'nano-banana-prompts.json'),
      path.join(process.cwd(), 'integrations', 'awesome-nano', 'website', 'public', 'nano-banana-prompts.json')
    ];

    for (const filePath of candidatePaths) {
      if (fs.existsSync(filePath)) {
        try {
          const raw = fs.readFileSync(filePath, 'utf-8');
          this.datasetSizeBytes = Buffer.byteLength(raw);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.prompts)) {
            this.prompts = parsed.prompts;
            this.isLoaded = true;
            return;
          }
        } catch (err) {
          console.error(`[NanoBananaEngine] Error reading ${filePath}:`, err);
        }
      }
    }
  }

  public getAllPrompts(): NanoBananaPrompt[] {
    this.ensureLoaded();
    return this.prompts;
  }

  public getStats(): NanoBananaStats {
    this.ensureLoaded();
    const categories: Record<string, number> = {};
    const topStyles: Record<string, number> = {};
    let totalChars = 0;
    let featuredCount = 0;

    for (const p of this.prompts) {
      categories[p.category] = (categories[p.category] || 0) + 1;
      if (p.style) {
        topStyles[p.style] = (topStyles[p.style] || 0) + 1;
      }
      totalChars += (p.content?.length || 0);
      if (p.featured) featuredCount++;
    }

    return {
      total: this.prompts.length,
      categories,
      topStyles,
      averageCharLength: this.prompts.length ? Math.round(totalChars / this.prompts.length) : 0,
      featuredCount,
      datasetSizeMB: Number((this.datasetSizeBytes / (1024 * 1024)).toFixed(2))
    };
  }

  public search(options: SearchOptions = {}): { results: NanoBananaPrompt[]; total: number; offset: number; limit: number } {
    this.ensureLoaded();
    const {
      query = '',
      category,
      style,
      featuredOnly = false,
      sortBy = 'id',
      limit = 50,
      offset = 0
    } = options;

    const q = query.trim().toLowerCase();

    let filtered = this.prompts.filter(p => {
      if (category && category !== 'All' && p.category !== category) return false;
      if (style && p.style !== style) return false;
      if (featuredOnly && !p.featured) return false;

      if (!q) return true;

      const titleMatch = p.title?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      const contentMatch = p.content?.toLowerCase().includes(q);
      const authorMatch = p.author?.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);

      return titleMatch || descMatch || contentMatch || authorMatch || catMatch;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'length':
          return (b.content?.length || 0) - (a.content?.length || 0);
        case 'newest':
          return (b.date || '').localeCompare(a.date || '');
        case 'oldest':
          return (a.date || '').localeCompare(b.date || '');
        case 'id':
        default:
          return a.id - b.id;
      }
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      results: paginated,
      total,
      offset,
      limit
    };
  }

  public getById(id: number): NanoBananaPrompt | undefined {
    this.ensureLoaded();
    return this.prompts.find(p => p.id === id);
  }

  public getRandom(count = 1, category?: string): NanoBananaPrompt[] {
    this.ensureLoaded();
    const pool = category && category !== 'All' 
      ? this.prompts.filter(p => p.category === category)
      : this.prompts;

    if (pool.length === 0) return [];
    
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, pool.length));
  }

  public enrichPrompt(content: string, options: EnrichmentOptions = {}): {
    enrichedPrompt: string;
    negativePrompt?: string;
    tags: string[];
  } {
    const modifiers: string[] = [];
    const tags: string[] = [];

    // Style presets
    switch (options.stylePreset) {
      case 'photorealistic':
        modifiers.push('hyperrealistic 8k photo', 'shot on Hasselblad H6D-100c', 'RAW photo', 'natural skin texture', 'sharp focus', 'subsurface scattering');
        tags.push('Photorealistic', '8k RAW');
        break;
      case 'cyberpunk':
        modifiers.push('cyberpunk neon aesthetic', 'volumetric fog', 'holographic reflections', 'rain-slicked streets', 'octane render 8k');
        tags.push('Cyberpunk', 'Neon');
        break;
      case 'anime':
        modifiers.push('Makoto Shinkai and Studio Ghibli inspired anime art', 'vibrant key visuals', 'cel shaded masterpiece', 'detailed clouds');
        tags.push('Anime', 'Studio Ghibli');
        break;
      case 'cinematic':
        modifiers.push('cinematic still 35mm film', 'Arri Alexa LF', 'anamorphic lens flare', 'color graded film grain', 'IMAX presentation');
        tags.push('Cinematic', '35mm Film');
        break;
      case 'oil-painting':
        modifiers.push('classical master oil painting', 'rich impasto brushstrokes', 'Rembrandt chiaroscuro lighting', 'fine art canvas texture');
        tags.push('Oil Painting', 'Fine Art');
        break;
      case 'concept-art':
        modifiers.push('trending on ArtStation', 'Unreal Engine 5 architectural concept art', 'matte painting', 'speedpaint details');
        tags.push('Concept Art', 'ArtStation');
        break;
      case '3d-render':
        modifiers.push('Blender 4.0 Cycles render', 'physically based rendering (PBR)', 'raytracing ambient occlusion', 'clay and subsurface shaders');
        tags.push('3D Render', 'Cycles');
        break;
    }

    // Lighting
    if (options.lighting) {
      switch (options.lighting) {
        case 'golden-hour':
          modifiers.push('warm golden hour sunbeams', 'rim lighting');
          tags.push('Golden Hour');
          break;
        case 'volumetric-fog':
          modifiers.push('heavy volumetric crepuscular rays', 'atmospheric haze');
          tags.push('Volumetric');
          break;
        case 'neon-glow':
          modifiers.push('vivid multi-colored neon edge light', 'bloom highlights');
          tags.push('Neon Edge');
          break;
        case 'studio-dramatic':
          modifiers.push('three-point studio lighting', 'dramatic shadow contrast');
          tags.push('Studio Lighting');
          break;
        case 'bioluminescent':
          modifiers.push('bioluminescent ambient glow', 'ethereal deep sea luminescence');
          tags.push('Bioluminescence');
          break;
      }
    }

    // Camera angle
    if (options.cameraAngle) {
      switch (options.cameraAngle) {
        case 'wide-angle':
          modifiers.push('14mm ultra wide-angle perspective', 'expansive panoramic depth');
          break;
        case 'macro-close-up':
          modifiers.push('100mm macro telephoto close-up', 'extreme microscopic detail', 'shallow depth of field f/1.4');
          break;
        case 'low-angle-heroic':
          modifiers.push('low angle heroic ground shot', 'monumental grandeur');
          break;
        case 'isometric':
          modifiers.push('isometric tilt-shift orthographic projection', 'diorama miniature feel');
          break;
        case 'drone-overhead':
          modifiers.push('aerial drone birds-eye perspective', 'sweeping topography');
          break;
      }
    }

    let finalPrompt = content.trim();
    if (modifiers.length > 0) {
      finalPrompt = `${finalPrompt}, ${modifiers.join(', ')}`;
    }

    if (options.aspectRatio) {
      finalPrompt = `${finalPrompt} --ar ${options.aspectRatio}`;
      tags.push(`AR: ${options.aspectRatio}`);
    }

    let negativePrompt: string | undefined;
    if (options.negativePromptEnabled) {
      negativePrompt = 'blurry, malformed, extra limbs, bad anatomy, deformed eyes, low resolution, watermark, signature, jpeg artifacts, overexposed, oversaturated, text, logo';
    }

    return {
      enrichedPrompt: finalPrompt,
      negativePrompt,
      tags
    };
  }

  public remixPrompt(basePrompt: string, remixTheme: string): string {
    const cleanBase = basePrompt.replace(/--ar \d+:\d+/g, '').trim();
    return `[Remix Theme: ${remixTheme}] ${cleanBase}, reimagined with innovative artistic direction, high-definition textural clarity, and signature visual motifs of ${remixTheme}.`;
  }
}

export const nanoBananaEngine = new NanoBananaEngine();
