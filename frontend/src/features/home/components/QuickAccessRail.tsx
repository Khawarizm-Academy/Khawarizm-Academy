import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { NAV_TARGETS, resolveIcon } from '../../../shared/lib/navigation';
import type { QuickLink } from '../../../mocks/homepage';

interface QuickAccessRailProps {
  links: QuickLink[];
  onNavigate: (path: string) => void;
}

const LINK_TONE: Record<QuickLink['tone'], string> = {
  blue: 'quick-link-blue',
  gold: 'quick-link-gold',
};

const ICON_TONE: Record<QuickLink['tone'], string> = {
  blue: 'quick-link-icon-blue',
  gold: 'quick-link-icon-gold',
};

/**
 * Fast-lane shortcuts under the hero: dashboard, courses, scholarships,
 * competitions. Cards cascade in and lift with the icon on hover.
 */
export const QuickAccessRail: React.FC<QuickAccessRailProps> = ({ links, onNavigate }) => {
  return (
    <div className="quick-rail">
      {links.map((link, idx) => {
        const Icon = resolveIcon(link.icon);
        return (
          <button
            key={link.id}
            type="button"
            onClick={() => onNavigate(NAV_TARGETS[link.target])}
            className={`quick-link group ${LINK_TONE[link.tone]} animate-pop-in`}
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <span className={`quick-link-icon ${ICON_TONE[link.tone]}`}>
              <Icon size={20} strokeWidth={2} />
            </span>

            <span className="quick-link-text">
              <span className="quick-link-title">{link.label}</span>
              <span className="quick-link-sub">{link.subtitle}</span>
            </span>

            <ArrowLeft size={16} className="quick-link-arrow" />
          </button>
        );
      })}
    </div>
  );
};
