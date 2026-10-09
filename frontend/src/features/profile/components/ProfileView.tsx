import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Camera,
  CheckCircle2,
  Sparkles,
  Bell,
  Globe,
  Clock,
  Check,
  Award,
  Loader2,
  Save,
  RotateCcw,
} from 'lucide-react';
import {
  INITIAL_USER_PROFILE,
  AVAILABLE_INTERESTS,
  type UserProfileData,
  type LearningLevel,
  type InterfaceLanguage,
} from '../types';
import { SettingsCard } from './SettingsCard';
import { ToggleSwitch } from './ToggleSwitch';
import { FieldText } from './FieldText';
import { Dropdown } from '../../../shared/components/Form/Dropdown';
import { SlidingSegmentedControl } from '../../../shared/components/Controls/SlidingSegmentedControl';

interface ProfileViewProps {
  onBackToDashboard?: () => void;
}

/** Skill levels for the sliding academic-level switcher. */
const LEARNING_LEVELS = [
  { id: 'beginner', label: 'مبتدئ' },
  { id: 'intermediate', label: 'متوسط' },
  { id: 'advanced', label: 'متقدم' },
] as const;

export const ProfileView: React.FC<ProfileViewProps> = () => {
  const [profile, setProfile] = useState<UserProfileData>(INITIAL_USER_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleInterest = (interest: string) => {
    setProfile((prev) => {
      const exists = prev.interests.includes(interest);
      const updated = exists
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: updated };
    });
  };

  const toggleNotification = (key: keyof UserProfileData['notifications']) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatarUrl: imageUrl }));
    }
  };

  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }, 700);
  };

  const handleReset = () => {
    setProfile(INITIAL_USER_PROFILE);
  };

  const currentLevelLabel = LEARNING_LEVELS.find((lvl) => lvl.id === profile.learningLevel)?.label;
  const activeReminders = Object.values(profile.notifications).filter(Boolean).length;

  return (
    <div dir="rtl" className="profile-root">
      {/* Identity hero */}
      <section className="profile-hero group animate-pop-in">
        <div className="profile-wash-blue" />
        <div className="profile-wash-gold" />

        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <div className="profile-avatar-ring">
            <span className="profile-avatar-orbit" aria-hidden="true" />
            <div className="profile-avatar">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gold-400 text-xl sm:text-2xl font-bold font-display">
                  {profile.avatarInitials}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="تغيير الصورة الشخصية"
              className="profile-avatar-edit"
            >
              <Camera size={13} />
            </button>
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="profile-name">{profile.fullName}</h1>
              <span className="profile-badge">
                <Award size={12} />
                طالب متميز
              </span>
            </div>

            <p className="profile-meta">{profile.membershipStatus}</p>
          </div>
        </div>

        <div className="self-end sm:self-center z-10">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleAvatarChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-outline-blue text-xs sm:text-sm"
          >
            <Camera size={15} />
            <span>تعديل الصورة</span>
          </button>
        </div>
      </section>

      {/* Settings form */}
      <form onSubmit={handleSaveChanges} className="w-full flex flex-col gap-6 md:gap-8">
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Primary column */}
          <div className="flex-1 w-full flex flex-col gap-6 md:gap-8">
            <SettingsCard icon={User} title="المعلومات الشخصية" index={0}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FieldText
                  id="fullName"
                  label="الاسم الكامل"
                  icon={User}
                  value={profile.fullName}
                  onChange={(v) => setProfile({ ...profile, fullName: v })}
                  required
                  placeholder="أدخل اسمك الكامل"
                />
                <FieldText
                  id="email"
                  label={
                    <span className="flex items-center justify-between w-full">
                      <span>البريد الإلكتروني</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <CheckCircle2 size={12} />
                        مؤكد
                      </span>
                    </span>
                  }
                  icon={Mail}
                  type="email"
                  value={profile.email}
                  onChange={(v) => setProfile({ ...profile, email: v })}
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
                onChange={(v) => setProfile({ ...profile, phone: v })}
                textLeft
                iconPosition="right"
                placeholder="+966 5X XXX XXXX"
              />
            </SettingsCard>

            <SettingsCard icon={Sparkles} title="تفضيلات التعلّم" iconClassName="text-gold-400" index={1}>
              <div className="flex flex-col gap-2.5">
                <label className="profile-label">المستوى الأكاديمي والمهاري</label>
                <SlidingSegmentedControl
                  options={LEARNING_LEVELS.map((lvl) => ({ id: lvl.id, label: lvl.label }))}
                  value={profile.learningLevel}
                  onChange={(v) => setProfile({ ...profile, learningLevel: v as LearningLevel })}
                  tone="blue"
                  aria-label="المستوى الأكاديمي والمهاري"
                  className="w-full"
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="profile-label">الاهتمامات والمسارات التقنية</label>
                  <span className="text-[11px] text-slate-500">اختر ما يناسب شغفك</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1.5">
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
          </div>

          {/* Secondary column */}
          <div className="w-full lg:w-80 flex flex-col gap-6 md:gap-8 shrink-0">
            <SettingsCard icon={Bell} title="الإشعارات والتذكيرات" index={2}>
              <div className="flex flex-col gap-4">
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
                onChange={(v) => setProfile({ ...profile, language: v as InterfaceLanguage })}
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
                onChange={(v) => setProfile({ ...profile, timezone: v })}
                options={[
                  { value: 'الرياض (GMT+3)', label: 'الرياض (GMT+3)' },
                  { value: 'مكة المكرمة (GMT+3)', label: 'مكة المكرمة (GMT+3)' },
                  { value: 'دبي (GMT+4)', label: 'دبي (GMT+4)' },
                  { value: 'القاهرة (GMT+2)', label: 'القاهرة (GMT+2)' },
                ]}
              />
            </SettingsCard>

            <SettingsCard icon={Award} title="ملخص الحساب" iconClassName="text-gold-400" index={4}>
              <div className="flex flex-col gap-3">
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

        {/* Save row */}
        <div className="profile-actions">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-gold btn-attention w-full sm:w-auto px-8 py-3.5 text-sm sm:text-base disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="btn-pill-subtle w-full sm:w-auto text-xs sm:text-sm"
          >
            <RotateCcw size={15} />
            <span>استعادة الافتراضي</span>
          </button>
        </div>
      </form>

      {/* Success toast */}
      {showToast && (
        <div className="profile-toast animate-pop-in">
          <div className="size-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check size={14} className="text-emerald-400" />
          </div>
          <span className="text-sm font-bold font-display">تم حفظ تغييرات الملف الشخصي بنجاح!</span>
        </div>
      )}
    </div>
  );
};
