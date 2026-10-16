import { describe, expect, it } from 'vitest';
import {
  convertArToKey,
  convertKeyToAr,
  toArabic,
  toArabicNav,
  toEnglishNav,
} from '@/shared/lib/localization';

describe('localization', () => {
  describe('nav tabs', () => {
    it('converts English tab keys to their Arabic labels', () => {
      expect(toArabicNav('home')).toBe('الرئيسية');
      expect(toArabicNav('courses')).toBe('الدورات');
      expect(toArabicNav('scholarships')).toBe('المنح والفرص');
      expect(toArabicNav('dashboard')).toBe('لوحتي');
    });

    it('uses the shorter labels only where the bottom bar asks for them', () => {
      expect(toArabicNav('scholarships', true)).toBe('المنح');
      expect(toArabicNav('scholarships')).toBe('المنح والفرص');
    });

    it('normalizes Arabic labels back to English tab keys', () => {
      expect(toEnglishNav('الرئيسية')).toBe('home');
      expect(toEnglishNav('الدورات')).toBe('courses');
      expect(toEnglishNav('المنح')).toBe('scholarships');
      expect(toEnglishNav('لوحتي')).toBe('dashboard');
      expect(toEnglishNav('حسابي')).toBe('profile');
    });

    it('keeps an English key as-is', () => {
      expect(toEnglishNav('courses')).toBe('courses');
    });

    it('falls back to the home tab for a missing or unknown label', () => {
      expect(toEnglishNav(undefined)).toBe('home');
      expect(toEnglishNav(null)).toBe('home');
      expect(toEnglishNav('صفحة غير معروفة')).toBe('home');
    });
  });

  describe('toArabic', () => {
    it('labels a key inside a named category', () => {
      expect(toArabic('courseStatus', 'available')).toBe('متاح');
      expect(toArabic('courseLevels', 'advanced')).toBe('متقدم');
      expect(toArabic('degreeLevels', 'master')).toBe('ماجستير');
      expect(toArabic('coverage', 'fully_funded')).toBe('ممولة بالكامل');
      expect(toArabic('eventFormats', 'live')).toBe('بث مباشر');
    });

    it('labels the nav and search groups too', () => {
      expect(toArabic('nav', 'catalog')).toBe('الدورات والمنح');
      expect(toArabic('search', 'scholarship')).toBe('منحة');
    });
  });

  describe('convertKeyToAr', () => {
    it('resolves a key from the flat map across every category', () => {
      expect(convertKeyToAr('available')).toBe('متاح');
      expect(convertKeyToAr('upcoming')).toBe('قريباً');
      expect(convertKeyToAr('apply_now')).toBe('تقدم الآن');
    });

    it('lets a named category win over the flat map', () => {
      expect(convertKeyToAr('master', 'degreeLevels')).toBe('ماجستير');
      expect(convertKeyToAr('register', 'actions')).toBe('تسجيل');
    });

    it('passes Arabic and unknown text through untouched', () => {
      expect(convertKeyToAr('متاح')).toBe('متاح');
      expect(convertKeyToAr('نص حر')).toBe('نص حر');
    });

    it('answers empty for a missing value', () => {
      expect(convertKeyToAr(undefined)).toBe('');
      expect(convertKeyToAr(null)).toBe('');
    });
  });

  describe('convertArToKey', () => {
    it('maps an Arabic label back to its English key', () => {
      expect(convertArToKey('متاح')).toBe('available');
      expect(convertArToKey('تقدم الآن')).toBe('apply_now');
      expect(convertArToKey('ماجستير')).toBe('master');
    });

    it('passes English and unknown text through untouched', () => {
      expect(convertArToKey('available')).toBe('available');
      expect(convertArToKey('نص حر')).toBe('نص حر');
    });
  });
});
