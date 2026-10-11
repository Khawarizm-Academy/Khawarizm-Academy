import React from 'react';
import {
  User,
  Mail,
  Phone,
  CheckCircle2,
  Sparkles,
  Bell,
  Globe,
  Clock,
  Check,
  Award,
} from 'lucide-react';
import { AVAILABLE_INTERESTS } from '../types';
import type { LearningLevel, InterfaceLanguage } from '../types';
import { useProfile } from '../context/profileContext';
import { SettingsCard } from './SettingsCard';
import { ToggleSwitch } from './ToggleSwitch';
import { FieldText } from './FieldText';
import { Dropdown } from '../../../shared/components/Form/Dropdown';
import { SlidingSegmentedControl } from '../../../shared/components/Controls/SlidingSegmentedControl';
import { ProfileHero } from './ProfileHero';
import { ProfileSaveActions } from './ProfileSaveActions';
import { ProfileToast } from './ProfileToast';

/** Skill levels for the sliding academic-level switcher. */
const LEARNING_LEVELS = [
  { id: 'beginner', label: 'مبتدئ' },
  { id: 'intermediate', label: 'متوسط' },
  { id: 'advanced', label: 'متقدم' },
] as const;

/** Editable profile: hero, preferences form, and per-surface save rows. */
export const ProfileContent: React.FC = () => {
  const { profile, changeField, toggleInterest, toggleNotification, saveChanges } = useProfile();

  const currentLevelLabel = LEARNING_LEVELS.find((lvl) => lvl.id === profile.learningLevel)?.label;
  const activeReminders = Object.values(profile.notifications).filter(Boolean).length;

  return (
    <div dir="rtl" className="profile-root">
      <ProfileHero />

      {/* Settings form */}
      <form onSubmit={saveChanges} className="profile-form">
        <div className="profile-columns">
          {/* Primary column */}
          <div className="profile-column-primary">
            <SettingsCard icon={User} title="المعلومات الشخصية" index={0}>
              <div className="profile-fields-grid">
                <FieldText
                  id="fullName"
                  label="الاسم الكامل"
                  icon={User}
                  value={profile.fullName}
                  onChange={(v) => changeField('fullName', v)}
                  required
                  placeholder="أدخل اسمك الكامل"
                />
                <FieldText
                  id="email"
                  label={
                    <span className="profile-field-label-row">
                      <span>البريد الإلكتروني</span>
                      <span className="profile-verified">
                        <CheckCircle2 size={12} />
                        مؤكد
                      </span>
                    </span>
                  }
                  icon={Mail}
                  type="email"
                  value={profile.email}
                  onChange={(v) => changeField('email', v)}
                  required
                  textLeft
                  placeholder="name@example.com"
                />
              </div>

              <FieldText
                id="phone"
                label="رقم الجوال"
                icon={Phone}
                type="tel"
                dir="ltr"
                value={profile.phone}
                onChange={(v) => changeField('phone', v)}
                textLeft
                iconPosition="right"
                placeholder="+966 5X XXX XXXX"
              />
            </SettingsCard>

            <SettingsCard icon={Sparkles} title="تفضيلات التعلّم" iconClassName="text-gold-400" index={1}>
              <div className="profile-block">
                <label className="profile-label">المستوى الأكاديمي والمهاري</label>
                <SlidingSegmentedControl
                  options={LEARNING_LEVELS.map((lvl) => ({ id: lvl.id, label: lvl.label }))}
                  value={profile.learningLevel}
                  onChange={(v) => changeField('learningLevel', v as LearningLevel)}
                  tone="blue"
                  aria-label="المستوى الأكاديمي والمهاري"
                  className="w-full"
                />
              </div>

              <div className="profile-block">
                <div className="profile-interests-head">
                  <label className="profile-label">الاهتمامات والمسارات التقنية</label>
                  <span className="profile-hint">اختر ما يناسب شغفك</span>
                </div>

                <div className="profile-interests">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = profile.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`profile-interest ${
                          isSelected ? 'profile-interest-on' : 'profile-interest-off'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SettingsCard>

            {/* Desktop save row anchors to the primary column so the summary
                card in the secondary column never pushes the buttons down */}
            <ProfileSaveActions placement="desktop" />
          </div>

          {/* Secondary column */}
          <div className="profile-column-secondary">
            <SettingsCard icon={Bell} title="الإشعارات والتذكيرات" index={2}>
              <div className="profile-stack">
                <ToggleSwitch
                  label="تذكير قبل الجلسات المباشرة"
                  checked={profile.notifications.liveSessionReminders}
                  onChange={() => toggleNotification('liveSessionReminders')}
                />
                <ToggleSwitch
                  label="ملخص التقدم الأسبوعي"
                  checked={profile.notifications.weeklyProgressSummary}
                  onChange={() => toggleNotification('weeklyProgressSummary')}
                />
                <ToggleSwitch
                  label="فرص تعليمية مقترحة"
                  checked={profile.notifications.recommendedOpportunities}
                  onChange={() => toggleNotification('recommendedOpportunities')}
                />
              </div>
            </SettingsCard>

            <SettingsCard icon={Globe} title="اللغة والحساب" index={3}>
              <Dropdown
                id="language"
                label="لغة الواجهة"
                icon={Globe}
                value={profile.language}
                onChange={(v) => changeField('language', v as InterfaceLanguage)}
                options={[
                  { value: 'ar', label: 'العربية (Arabic)' },
                  { value: 'en', label: 'English (الإنجليزية)' },
                ]}
              />

              <Dropdown
                id="timezone"
                label="المنطقة الزمنية"
                icon={Clock}
                value={profile.timezone}
                onChange={(v) => changeField('timezone', v)}
                options={[
                  { value: 'الرياض (GMT+3)', label: 'الرياض (GMT+3)' },
                  { value: 'مكة المكرمة (GMT+3)', label: 'مكة المكرمة (GMT+3)' },
                  { value: 'دبي (GMT+4)', label: 'دبي (GMT+4)' },
                  { value: 'القاهرة (GMT+2)', label: 'القاهرة (GMT+2)' },
                ]}
              />
            </SettingsCard>

            <SettingsCard icon={Award} title="ملخص الحساب" iconClassName="text-gold-400" index={4}>
              <div className="profile-stack gap-3">
                <div className="profile-stat">
                  <span className="profile-stat-label">المستوى الأكاديمي</span>
                  <span className="profile-stat-value">{currentLevelLabel}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">المسارات المختارة</span>
                  <span className="profile-stat-value">{profile.interests.length}</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-label">التنبيهات المفعّلة</span>
                  <span className="profile-stat-value">{activeReminders}</span>
                </div>
              </div>
            </SettingsCard>
          </div>
        </div>

        {/* Mobile-only save row: full-width form footer on small screens */}
        <ProfileSaveActions placement="mobile" />
      </form>

      <ProfileToast />
    </div>
  );
};