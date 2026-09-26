export interface Prompt {
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

export interface FilterOptions {
  searchQuery: string;
  category: string | null;
  style: string | null;
  author: string | null;
  featuredOnly: boolean;
  sortBy: 'newest' | 'oldest' | 'title' | 'author';
}

export interface PromptData {
  prompts: Prompt[];
  total: number;
}
