import {
  BookMarked,
  CalendarClock,
  Coins,
  FileText,
  Globe,
  Hash,
  ImageIcon,
  Languages,
  Link,
  Mail,
  MapPin,
  NotebookPen,
  Phone,
  Quote,
  ShieldCheck,
  SlidersHorizontal,
  Tag,
  Type,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import type { AdminField, AdminFieldKind } from '@/features/admin/types';

/** One icon per known field name; the kind fallback covers the rest of the schema. */
const NAME_ICONS: Record<string, LucideIcon> = {
  slug: Hash,
  title: Type,
  subtitle: BookMarked,
  description: NotebookPen,
  excerpt: Quote,
  key: Tag,
  name: UserRound,
  fullName: UserRound,
  email: Mail,
  phone: Phone,
  url: Link,
  link: Link,
  image: ImageIcon,
  imageUrl: Link,
  price: Coins,
  level: SlidersHorizontal,
  isActive: ShieldCheck,
  language: Languages,
  timezone: Globe,
  address: MapPin,
  startDate: CalendarClock,
  deadline: CalendarClock,
};

const KIND_ICONS: Record<AdminFieldKind, LucideIcon> = {
  text: Type,
  textarea: NotebookPen,
  url: Link,
  number: Hash,
  decimal: Coins,
  bool: ShieldCheck,
  select: SlidersHorizontal,
  json: FileText,
};

/** Inputs carry the icon inside; an unknown name falls back to its kind. */
export const fieldIcon = (field: AdminField): LucideIcon =>
  NAME_ICONS[field.name] ?? KIND_ICONS[field.kind];
