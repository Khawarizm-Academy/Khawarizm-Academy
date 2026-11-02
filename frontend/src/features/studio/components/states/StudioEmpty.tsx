import React from 'react';
import { OrbitalEmblem } from '@/shared/components/Placeholder/OrbitalEmblem';
export const StudioEmpty: React.FC<{ title: string; text: string; action?: React.ReactNode }> = ({ title, text, action }) => <section className="studio-empty"><OrbitalEmblem /><h2>{title}</h2><p>{text}</p>{action}</section>;
