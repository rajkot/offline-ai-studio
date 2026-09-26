import { Prompt, FilterOptions, PromptData } from '@/types/prompt';

const BASE_PATH = '/website';

export async function fetchPrompts(): Promise<PromptData> {
  try {
    const response = await fetch(`${BASE_PATH}/nano-banana-prompts.json`);
    if (!response.ok) {
      console.error('Failed to load nano-banana-prompts.json');
      return { prompts: [], total: 0 };
    }
    const data: PromptData = await response.json();
    console.log(`✓ Loaded ${data.total} prompts from nano-banana-prompts.json`);
    return data;
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return { prompts: [], total: 0 };
  }
}

export function filterPrompts(prompts: Prompt[], filters: FilterOptions): Prompt[] {
  const filtered = prompts.filter(prompt => {
    const q = filters.searchQuery.toLowerCase();
    const matchesSearch = !q ||
      prompt.title.toLowerCase().includes(q) ||
      prompt.description.toLowerCase().includes(q) ||
      prompt.content.toLowerCase().includes(q) ||
      prompt.author.toLowerCase().includes(q);

    const matchesCategory = !filters.category || prompt.category === filters.category;
    const matchesStyle = !filters.style || prompt.style === filters.style;
    const matchesAuthor = !filters.author || prompt.author === filters.author;
    const matchesFeatured = !filters.featuredOnly || prompt.featured;

    return matchesSearch && matchesCategory && matchesStyle && matchesAuthor && matchesFeatured;
  });

  // Sort
  switch (filters.sortBy) {
    case 'newest': filtered.sort((a, b) => (b.date || '').localeCompare(a.date || '')); break;
    case 'oldest': filtered.sort((a, b) => (a.date || '').localeCompare(b.date || '')); break;
    case 'title': filtered.sort((a, b) => a.title.localeCompare(b.title)); break;
    case 'author': filtered.sort((a, b) => a.author.localeCompare(b.author)); break;
  }

  return filtered;
}

export function getUniqueCategories(prompts: Prompt[]): string[] {
  const cats = new Map<string, number>();
  prompts.forEach(p => cats.set(p.category, (cats.get(p.category) || 0) + 1));
  return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}

export function getUniqueStyles(prompts: Prompt[]): string[] {
  const styles = new Map<string, number>();
  prompts.forEach(p => { if (p.style) styles.set(p.style, (styles.get(p.style) || 0) + 1); });
  return Array.from(styles.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}

export function getUniqueAuthors(prompts: Prompt[]): string[] {
  const authors = new Map<string, number>();
  prompts.forEach(p => { if (p.author) authors.set(p.author, (authors.get(p.author) || 0) + 1); });
  return Array.from(authors.entries()).sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
