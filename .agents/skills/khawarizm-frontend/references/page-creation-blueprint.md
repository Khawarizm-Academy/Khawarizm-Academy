# Khawarizm Academy — Universal Page Creation Blueprint & Walkthrough

> **Goal:** Create any new page or feature in under 15 minutes with zero styling guesswork and zero redundant code.

---

## 1. The 6-Step Universal Recipe

Follow these exact 6 steps whenever implementing a new screen or feature from a prompt or Figma/HTML mockup:

```
[Step 1: Scaffold Feature Folder]
         │
         ▼
[Step 2: Define Types & Localization]
         │
         ▼
[Step 3: Setup Mock Data]
         │
         ▼
[Step 4: Build Feature-Specific Subcomponents]
         │
         ▼
[Step 5: Assemble the Page Shell & Layout]
         │
         ▼
[Step 6: Register Route & Verify Build]
```

---

### Step 1: Scaffold Feature Folder
Create the standard feature hierarchy inside `src/features/<feature-name>/`:
```
src/features/<feature-name>/
├── components/          # Feature-specific pieces (e.g. FilterSidebar, QuickSummaryStrip)
├── data/                # Non-component modules (e.g. dashboard's radialRingColors.ts)
├── hooks/               # Feature queries and state hooks
├── pages/               # Top-level Page view (e.g. CatalogPage.tsx)
├── types.ts             # Feature-specific state/props interfaces
└── <feature>.css        # Feature-owned concept classes (e.g. auth.css, catalog.css, dashboard.css)
```
The feature CSS holds every 1-feature concept class in `@layer components` and is `@import`ed at the top of `globals.css` (never imported by a `.tsx`) — see `khawarizm-frontend` §3.7.

---

### Step 2: Define Types & Localization
1. **Types (`types.ts`):** Keep domain state in clean English:
```ts
export type CatalogTab = 'all' | 'courses' | 'scholarships';
export type EducationLevel = 'all' | 'bachelor' | 'master' | 'phd' | 'bootcamp';
export type FilterDomain = 'all' | 'ai' | 'programming' | 'cybersecurity' | 'space';
```

2. **Localization (`src/shared/lib/localization.ts`):**
Register any new keys in the dictionary:
```ts
catalog_filters: {
  all: 'الكل',
  ai: 'ذكاء اصطناعي',
  programming: 'برمجة',
  cybersecurity: 'أمن سيبراني',
  space: 'علوم الفضاء',
}
```

---

### Step 3: Setup Mock Data
Put the records in `src/shared/json/mock<Feature>.json`. If the feature needs a typed adapter, create `src/mocks/<feature>.ts` that only casts the JSON — it must hold no data of its own.
- Ensure entities match the Django REST backend schema defined in `docs/07-backend-notes.md`.
- Use existing shared entities (`Course`, `Scholarship`, `Event`) whenever possible.

---

### Step 4: Build Feature Subcomponents (Using Concept Classes!)
If a section or sidebar is unique to this feature, build it using **existing semantic classes**, avoiding ad-hoc inline styles.

Example — the real `CatalogFilterSidebar.tsx` builds its chrome from the feature's concept classes (`.catalog-sidebar`, `.catalog-panel-head`, `.catalog-panel-title`, `.catalog-reset` in `features/catalog/catalog.css`), and delegates the pill rows to the shared `<CatalogFilterGroups />`:
```tsx
export const CatalogFilterSidebar: React.FC<CatalogFilterSidebarProps> = ({
  type,
  filters,
  onChangeFilter,
  onReset,
}) => {
  return (
    <aside className="catalog-sidebar">
      <div className="catalog-panel-head">
        <div className="catalog-panel-title">
          <Filter size={16} className="text-gold-400" />
          <span>{catalogJson.filters.header}</span>
        </div>

        <button type="button" onClick={onReset} className="catalog-reset hover:text-gold-200">
          {catalogJson.filters.resetLabel}
        </button>
      </div>

      <CatalogFilterGroups
        tab={type}
        filters={filters}
        surface="desktop"
        onChangeFilter={onChangeFilter}
      />
    </aside>
  );
};
```

---

### Step 5: Assemble the Page Shell
Construct the final page using the **Universal Page Template**:
```tsx
import React, { useState } from 'react';
import { DesktopNavbar } from '@/shared/components/Navbar/DesktopNavbar';
import { MobileHeader } from '@/shared/components/Navbar/MobileHeader';
import { MobileBottomBar } from '@/shared/components/BottomNav/MobileBottomBar';
import { Footer } from '@/shared/components/Footer/Footer';
import { SmartSearchBox } from '@/shared/components/Search/SmartSearchBox';
import { CourseCard } from '@/shared/components/Cards/CourseCard';
import { ScholarshipCard } from '@/shared/components/Cards/ScholarshipCard';
import { CatalogFilterSidebar } from '@/features/catalog/components/filters/CatalogFilterSidebar';
import { mockCourses, mockScholarships } from '@/shared/mocks/homepage';
import type { NavTabKey } from '@/shared/lib/localization';
import type { FilterDomain } from '@/features/catalog/types';

export const CatalogPage: React.FC = () => {
  const [activeNavTab, setActiveNavTab] = useState<NavTabKey>('catalog');
  const [activeDomain, setActiveDomain] = useState<FilterDomain>('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="page-wrapper">
      {/* 1. Atmospheric Celestial Glows */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[5%] right-[5%] w-[600px] h-[600px] rounded-full bg-blue-400/[0.04] blur-[140px]" />
        <div className="absolute top-[35%] left-[5%] w-[550px] h-[550px] rounded-full bg-gold-400/[0.03] blur-[130px]" />
      </div>

      {/* 2. Top Navbars */}
      <div className="w-full hidden md:block animate-fade-in-down relative z-20">
        <DesktopNavbar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
      </div>
      <div className="w-full block md:hidden animate-fade-in-down relative z-20">
        <MobileHeader />
      </div>

      {/* 3. Main Content Container */}
      <main className="content-container">
        {/* Hero Section */}
        <section className="w-full flex flex-col items-center text-center gap-3 pt-6 pb-2 animate-fade-in-up animation-delay-100">
          <h1 className="text-3xl md:text-4xl font-bold text-white font-display">
            دليل المعرفة والمنح الدولية
          </h1>
          <p className="max-w-2xl text-slate-400 text-sm md:text-base font-body">
            البوابة الموحدة لاستكشاف أرقى الفرص التعليمية والمسارات الأكاديمية والمنح الممولة حول العالم.
          </p>
          
          {/* Smart Search Bar */}
          <div className="w-full flex-center mt-4">
            <SmartSearchBox 
              variant="desktop" 
              onSearch={(query) => setSearchQuery(query)} 
            />
          </div>
        </section>

        {/* Catalog Main Layout (Sidebar + Results Grid) */}
        <div className="w-full flex flex-col lg:flex-row items-start gap-8 animate-fade-in-up animation-delay-200">
          {/* Left / Main Results Pane */}
          <div className="flex-1 w-full flex flex-col gap-6">
            {/* Toolbar Row */}
            <div className="w-full flex-between pb-2 border-b border-navy-600/40 text-sm text-slate-400">
              <span>تم العثور على {mockCourses.length + mockScholarships.length} نتيجة</span>
              <div className="flex items-center gap-2">
                <span>ترتيب حسب:</span>
                <button className="btn-pill-subtle py-1 px-3 text-xs">الأحدث ▼</button>
              </div>
            </div>

            {/* Results Grid (reusing CourseCard & ScholarshipCard) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {mockCourses.slice(0, 2).map(c => (
                <CourseCard key={c.id} course={c} layout="desktop" />
              ))}
              {mockScholarships.slice(0, 2).map(s => (
                <ScholarshipCard key={s.id} scholarship={s} layout="desktop" />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="w-full flex-center gap-2 pt-4">
              <button className="btn-icon-box">‹</button>
              <button className="btn-gold w-8 h-8 p-0 text-xs">1</button>
              <button className="btn-pill-subtle w-8 h-8 p-0 text-xs">2</button>
              <button className="btn-pill-subtle w-8 h-8 p-0 text-xs">3</button>
              <button className="btn-icon-box">›</button>
            </div>
          </div>

          {/* Right Filter Sidebar (Desktop) */}
          <div className="hidden lg:block shrink-0">
            <CatalogFilterSidebar 
              activeDomain={activeDomain}
              onSelectDomain={setActiveDomain}
              onReset={() => setActiveDomain('all')}
            />
          </div>
        </div>
      </main>

      {/* 4. Global Footer & Mobile Bottom Navigation */}
      <Footer />
      <MobileBottomBar activeTab={activeNavTab} onSelectTab={setActiveNavTab} />
    </div>
  );
};
```

---

### Step 6: Route Registration & Verification
1. Open `src/app/router.tsx` or `src/App.tsx`.
2. Add the route:
```tsx
<Route path="/catalog" element={<CatalogPage />} />
```
3. Run verification command:
```bash
npm run build
```
Ensure 0 TypeScript errors and 0 build warnings.

---

## 2. Concrete Case Study: Deconstructing `catalog-all-desktop.html`

Let's look at `Design Code/02-catalog/catalog-all-desktop.html` (873 lines of raw HTML):

| Prototype HTML Chunk | What it does | How we build it in Khawarizm Frontend | Code Saved |
| :--- | :--- | :--- | :--- |
| Lines 5–133 | Desktop Top Navigation | `<DesktopNavbar activeTab="catalog" />` | **128 lines of HTML eliminated** |
| Lines 134–142 | Hero Title + Subtitle | Semantic header with `.flex-col-center` | **8 lines simplified** |
| Lines 143–183 | Smart Search Input + Toggle Chips | `<SmartSearchBox variant="desktop" />` | **40 lines eliminated** |
| Lines 209–282 | Course Card 1 | `<CourseCard course={c1} layout="desktop" />` | **73 lines eliminated** |
| Lines 283–339 | Scholarship Card 1 | `<ScholarshipCard scholarship={s1} layout="desktop" />` | **56 lines eliminated** |
| Lines 340–415 | Course Card 2 | `<CourseCard course={c2} layout="desktop" />` | **75 lines eliminated** |
| Lines 589–624 | Pagination | `.flex-center` row with `.btn-icon-box` and `.btn-gold` | **35 lines simplified** |
| Lines 626–750 | Filter Sidebar | `<CatalogFilterSidebar />` using `.btn-pill-subtle` | **124 lines simplified** |

**Conclusion:** Over **85% of the page** is built instantly simply by calling existing components! No styling needed from scratch!
