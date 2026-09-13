import React from 'react';
import type { NavTabKey } from '../shared/lib/localization';
import { HomePage } from '../features/home/pages/HomePage';
import { CatalogPage } from '../features/catalog/pages/CatalogPage';

export interface RouteMeta {
  title: string;
  description?: string;
  activeTab?: NavTabKey;
}

export interface RouteDefinition {
  path: string;
  component: React.ComponentType;
  meta?: RouteMeta;
  skeletonVariant?: 'home' | 'catalog' | 'detail' | 'default';
}

/**
 * Master Route Registry for Khawarizm Academy.
 * Centralized configuration for all platform pathways.
 */
export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: HomePage,
    meta: {
      title: 'أكاديمية خوارزم — المرصد الأكاديمي والفرص الدولية',
      description: 'بوابة خوارزم للدورات التدريبية المتقدمة والمنح الدراسية العالمية الممولة بالكامل.',
      activeTab: 'home',
    },
    skeletonVariant: 'home',
  },
  {
    path: '/catalog',
    component: CatalogPage,
    meta: {
      title: 'دليل الدورات والمنح — أكاديمية خوارزم',
      description: 'استكشف مئات الدورات التدريبية المعتمدة وأرقى المنح الدراسية الدولية.',
      activeTab: 'catalog',
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/courses',
    component: CatalogPage,
    meta: {
      title: 'الدورات التدريبية — أكاديمية خوارزم',
      description: 'مسارات تعليمية وتدريبية متقدمة في علوم الحاسب والذكاء الاصطناعي.',
      activeTab: 'courses',
    },
    skeletonVariant: 'catalog',
  },
  {
    path: '/scholarships',
    component: CatalogPage,
    meta: {
      title: 'المنح والفرص الأكاديمية — أكاديمية خوارزم',
      description: 'أرقى برامج الرعاية الأكاديمية والدرجات العلمية العالمية الممولة بالكامل.',
      activeTab: 'scholarships',
    },
    skeletonVariant: 'catalog',
  },
];
