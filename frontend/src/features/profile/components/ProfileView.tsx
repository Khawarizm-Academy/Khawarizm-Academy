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

interface ProfileViewProps {
  onBackToDashboard?: () => void;
}

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

  return (
    <div dir="rtl" className="w-full max-w-[1100px] mx-auto flex flex-col gap-6 md:gap-8 pb-12">
      {/* 1. Identity Summary Card */}
      <section className="workspace-row p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 md:gap-6 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 size-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 size-48 bg-[#E5B65C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <div className="relative group shrink-0">
            <div className="size-16 sm:size-20 bg-blue-950 rounded-full outline outline-2 outline-offset-[-2px] outline-[#E5B65C] flex justify-center items-center overflow-hidden shadow-[0_0_16px_rgba(229,182,92,0.25)] transition-transform group-hover:scale-105">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#E5B65C] text-xl sm:text-2xl font-bold font-['IBM_Plex_Sans_Arabic']">
                  {profile.avatarInitials}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="تغيير الصورة الشخصية"
              className="absolute -bottom-1 -left-1 size-7 bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white rounded-full border border-blue-900 flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            >
              <Camera size={13} />
            </button>
          </div>

          <div className="flex flex-col gap-1 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-white text-xl sm:text-2xl font-bold font-['IBM_Plex_Sans_Arabic'] leading-tight">
                {profile.fullName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold font-['Tajawal']">
                <Award size={12} className="text-amber-400" />
                طالب متميز
              </span>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm font-normal font-['Tajawal']">
              {profile.membershipStatus}
            </p>
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

      {/* 2. Main Settings Form */}
      <form onSubmit={handleSaveChanges} className="w-full flex flex-col gap-6 md:gap-8">
        <div className="w-full flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Primary Column */}
          <div className="flex-1 w-full flex flex-col gap-6 md:gap-8">
            <SettingsCard icon={User} title="المعلومات الشخصية">
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

            <SettingsCard icon={Sparkles} title="تفضيلات التعلّم" iconClassName="text-[#E5B65C]">
              <div className="flex flex-col gap-2.5">
                <label className="text-slate-300 text-xs font-medium font-['Tajawal']">
                  المستوى الأكاديمي والمهاري
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-xl border border-blue-900/60">
                  {(
                    [
                      { id: 'beginner', label: 'مبتدئ' },
                      { id: 'intermediate', label: 'متوسط' },
                      { id: 'advanced', label: 'متقدم' },
                    ] as const
                  ).map((lvl) => {
                    const isSelected = profile.learningLevel === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setProfile({ ...profile, learningLevel: lvl.id as LearningLevel })}
                        className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold font-['IBM_Plex_Sans_Arabic'] transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-sky-500/20 outline outline-1 outline-sky-400 text-sky-300 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 text-xs font-medium font-['Tajawal']">
                    الاهتمامات والمسارات التقنية
                  </label>
                  <span className="text-[11px] text-slate-500 font-['Tajawal']">
                    اختر ما يناسب شغفك
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1.5">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = profile.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-['Tajawal'] transition-all flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                          isSelected
                            ? 'bg-[#E5B65C]/15 outline outline-1 outline-[#E5B65C] text-[#E5B65C] shadow-sm'
                            : 'bg-slate-950/80 outline outline-1 outline-blue-900/80 text-slate-400 hover:text-slate-200 hover:outline-sky-400/50'
                        }`}
                      >
                        {isSelected && <Check size={12} className="text-[#E5B65C]" />}
                        <span>{interest}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </SettingsCard>
          </div>

          {/* Secondary Column */}
          <div className="w-full lg:w-80 flex flex-col gap-6 md:gap-8 shrink-0">
            <SettingsCard icon={Bell} title="الإشعارات والتذكيرات">
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

            <SettingsCard icon={Globe} title="اللغة والحساب">
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
          </div>
        </div>

        {/* 3. Save Action Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-gold w-full sm:w-auto px-8 py-3.5 text-sm sm:text-base disabled:opacity-70"
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

      {/* 4. Success Toast */}
      {showToast && (
        <div className="fixed bottom-20 sm:bottom-8 right-1/2 translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3.5 bg-slate-900/95 border border-emerald-500/60 rounded-full shadow-[0_8px_32px_rgba(16,185,129,0.25)] text-emerald-300 backdrop-blur-md animate-fade-in select-none">
          <div className="size-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Check size={14} className="text-emerald-400" />
          </div>
          <span className="text-sm font-bold font-['IBM_Plex_Sans_Arabic']">
            تم حفظ تغييرات الملف الشخصي بنجاح!
          </span>
        </div>
      )}
    </div>
  );
};