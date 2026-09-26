<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3.0-black?style=for-the-badge&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss" alt="TailwindCSS">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/rajkotpodman/website/ci-linux.yml?style=flat-square&label=Linux%20CI" alt="CI Linux">
  <img src="https://img.shields.io/github/actions/workflow/status/rajkotpodman/website/ci-macos.yml?style=flat-square&label=macOS%20CI" alt="CI macOS">
  <img src="https://img.shields.io/github/actions/workflow/status/rajkotpodman/website/docker-build.yml?style=flat-square&label=Docker%20Build" alt="Docker">
  <img src="https://img.shields.io/github/actions/workflow/status/rajkotpodman/website/github-pages.yml?style=flat-square&label=GitHub%20Pages" alt="Pages">
</p>

<h1 align="center">🍌 Nano Banana Pro — AI Prompt Gallery</h1>

<p align="center">
  A blazing-fast, beautifully crafted web gallery for <strong>2,500+ hand-curated AI image generation prompts</strong>.
  <br/>
  Copy, remix, and create stunning visuals — powered by <strong>Next.js 16</strong>, <strong>React 19</strong>, and <strong>Tailwind CSS v4</strong>.
</p>

---

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🎨 Glass-Morphism UI</h3>
      <p>Stunning frosted-glass cards, animated gradients, floating banana emoji, and smooth hover effects — a premium browsing experience.</p>
    </td>
    <td width="50%">
      <h3>🔍 Smart Filtering & Search</h3>
      <p>Filter by <strong>category</strong>, <strong>style</strong>, <strong>author</strong>, or <strong>featured</strong>. Full-text search across titles, descriptions, and content. Sort by newest, oldest, title, or author.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>📋 One-Click Copy</h3>
      <p>Click any prompt card to copy the full prompt to clipboard with a toast notification. Clipboard API with execCommand fallback.</p>
    </td>
    <td>
      <h3>🖼️ Lazy-Loaded Images</h3>
      <p>Images load lazily with 6 gradient fallback palettes. External image CORS handling via <code>referrerPolicy="no-referrer"</code>.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>📱 Fully Responsive</h3>
      <p>Fluid grid layout that adapts from mobile to 4K displays. Sticky search bar, collapsible filter panel, smooth transitions.</p>
    </td>
    <td>
      <h3>💰 Monetization Buttons</h3>
      <p>Built-in <strong>BUY NOW PRO</strong>, <strong>DONATION SYSTEM</strong>, and <strong>OFFICIAL DIGITAL STORE</strong> CTAs in the header.</p>
    </td>
  </tr>
</table>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 22
- **npm** ≥ 10

### Local Development

```bash
# Clone the repo
git clone https://github.com/rajkotpodman/website.git
cd website/website

# Install dependencies
npm ci

# Start dev server with Turbopack
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build   # Builds optimized production bundle
npm start       # Starts production server on port 3000
```

---

## 🐳 Docker

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t nano-banana-pro .
docker run -p 3000:3000 nano-banana-pro
```

The Docker image runs as a non-root `appuser` (UID 1001) on Alpine Linux for security.

---

## ☁️ Deployment

| Platform | Config File | Status |
| :--- | :--- | :--- |
| **Vercel** | `vercel.json` | One-click deploy — root: `website`, framework: Next.js |
| **Render** | `render.yaml` | Auto-detected Blueprint deploy |
| **Railway** | `railway.json` | Nixpacks builder, auto-detected |
| **GitHub Pages** | `.github/workflows/github-pages.yml` | Static export via `NEXT_OUTPUT=export` |
| **Docker** | `Dockerfile` + `docker-compose.yml` | Multi-stage build, non-root user |
| **Android APK** | `capacitor.config.ts` | Capacitor wrapper, built via GitHub Actions |

---

## 🔄 CI/CD Pipelines

| Workflow | Trigger | Description |
| :--- | :--- | :--- |
| **CI Linux** | Push to `master` | Build + Lint on Ubuntu, Node 22 |
| **CI macOS** | Push to `master` | Build + Lint on macOS, Node 22 |
| **Docker Build** | Push to `master` | Multi-arch Docker image build & cache |
| **GitHub Pages** | Push to `master` | Static export → deploy to `gh-pages` |
| **Android APK** | Push to `master` | Capacitor sync + Gradle build |

---

## 📁 Project Structure

```text
.
├── .github/workflows/          # CI/CD pipeline definitions
│   ├── ci-linux.yml
│   ├── ci-macos.yml
│   ├── docker-build.yml
│   └── github-pages.yml
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.yml          # Docker Compose orchestration
├── vercel.json                 # Vercel deployment config
├── render.yaml                 # Render Blueprint config
├── railway.json                # Railway deployment config
├── nano-banana-prompts.jsonl   # Raw 2,500 prompts (JSONL)
└── website/
    ├── capacitor.config.ts     # Capacitor (Android APK) config
    ├── next.config.ts          # Next.js config (standalone/export)
    ├── package.json
    ├── tsconfig.json
    ├── public/
    │   └── nano-banana-prompts.json   # 2,500 prompts data
    └── src/
        ├── app/
        │   ├── globals.css     # Tailwind + custom glass-morphism
        │   ├── layout.tsx      # Root layout with metadata
        │   └── page.tsx        # Entry point → <Gallery />
        ├── components/
        │   ├── Header.tsx      # Hero + stats + action buttons
        │   ├── SearchBar.tsx   # Sticky search with clear
        │   ├── FilterPanel.tsx # Category/style/author filters
        │   ├── PromptCard.tsx  # Individual prompt card
        │   └── Gallery.tsx     # Main gallery orchestrator
        ├── lib/
        │   └── prompts.ts      # Data fetching & filtering logic
        └── types/
            └── prompt.ts       # TypeScript interfaces
```

---

## 🧩 Data Schema

Each prompt in `nano-banana-prompts.json` follows this structure:

```typescript
interface Prompt {
  id: number;           // Unique identifier
  title: string;        // Prompt title
  description: string;  // Short description
  content: string;      // Full prompt text (copyable)
  category: string;     // Category (e.g., "Portrait", "Landscape")
  style: string;        // Art style (e.g., "Photorealistic")
  author: string;       // Creator name
  image: string;        // Preview image URL
  date: string;         // ISO date string
  featured: boolean;    // Featured flag
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16.3 (Turbopack) |
| **UI Library** | React 19.2 |
| **Styling** | Tailwind CSS v4 |
| **Language** | TypeScript 5 |
| **Linting** | ESLint 9 + eslint-config-next |
| **Container** | Docker + Alpine Linux |
| **Mobile** | Capacitor (Android APK) |
| **CI/CD** | GitHub Actions |

---

## 📄 License

This project is licensed under the terms in the `LICENSE` file.

---

<p align="center">
  <sub>Made with 🍌 by <a href="https://github.com/rajkotpodman">rajkotpodman</a></sub>
</p>
