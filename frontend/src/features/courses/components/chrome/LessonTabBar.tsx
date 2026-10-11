import React from 'react';
import { Award, ClipboardCheck, PlayCircle, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCoursePlayer } from '@/features/courses/context/coursePlayerContext';
import { courseCopy } from '@/features/courses/data/courseCopy';
import type { CourseTab } from '@/features/courses/types';

/** Feature-local icons so tab identity never leaks into shared navigation config. */
const TAB_ICON: Record<CourseTab, LucideIcon> = {
  lesson: PlayCircle,
  problems: ClipboardCheck,
  live: Radio,
  exam: Award,
};

/** One horizontal tab row, labels from JSON, icons from the lookup above. */
export const LessonTabBar: React.FC = () => {
  const { activeTab, selectTab } = useCoursePlayer();

  const tabs = (Object.keys(courseCopy.player.tabs) as CourseTab[]).map((key) => ({
    key,
    label: courseCopy.player.tabs[key],
    icon: TAB_ICON[key],
  }));

  return (
    <div className="player-tabs" role="tablist">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={activeTab === key}
          onClick={() => selectTab(key)}
          className={activeTab === key ? 'player-tab player-tab-active' : 'player-tab player-tab-idle'}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </div>
  );
};