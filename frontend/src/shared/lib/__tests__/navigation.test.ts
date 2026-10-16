import { describe, expect, it } from 'vitest';
import { resolveIcon } from '@/shared/lib/navigation';

describe('resolveIcon', () => {
  it('resolves the PascalCase name the JSON configs use', () => {
    expect(resolveIcon('BookOpen')).toBeDefined();
    expect(resolveIcon('LayoutDashboard')).toBeDefined();
  });

  it('resolves the kebab-case name a database row seeds, to the same component', () => {
    // `book-open` is lucide's own id; it must land on the exact component the
    // JSON config gets for `BookOpen`, otherwise the two spellings drift apart.
    expect(resolveIcon('book-open')).toBe(resolveIcon('BookOpen'));
    expect(resolveIcon('graduation-cap')).toBe(resolveIcon('GraduationCap'));
    expect(resolveIcon('layout-dashboard')).toBe(resolveIcon('LayoutDashboard'));
  });

  it('resolves a plain lowercase name', () => {
    expect(resolveIcon('award')).toBe(resolveIcon('Award'));
    expect(resolveIcon('trophy')).toBe(resolveIcon('Trophy'));
  });

  it('fails loudly on a name that is not in ICONS', () => {
    expect(() => resolveIcon('not-an-icon')).toThrow(/Unknown icon "not-an-icon"/);
  });
});
