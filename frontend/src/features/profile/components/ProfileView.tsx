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

interface ProfileViewProps {
  onBackToDashboard?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = () => {
  const [profile, setProfile] = useState<UserProfileData>(INITIAL_USER_PROFILE);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toggle single interest in the multi-select set
  const toggleInterest = (interest: string) => {
    setProfile((prev) => {
      const exists = prev.interests.includes(interest);
      const updated = exists
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests: updated };
    });
  };

  // Toggle notification preference
  const toggleNotification = (key: keyof UserProfileData['notifications']) => {
    setProfile((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  // Handle local avatar file upload
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatarUrl: imageUrl }));
    }
  };

  // Handle save changes with realistic feedback
  const handleSaveChanges = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3500);
    }, 700);
  };

  // Reset form to defaults
  const handleReset = () => {
    setProfile(INITIAL_USER_PROFILE);
  };

  return (
    <div dir="rtl" className="w-full max-w-[1100px] mx-auto flex flex-col gap-6 md:gap-8 pb-12">
      {/* ========================================================================= */}
      {/* 1. IDENTITY SUMMARY HEADER CARD                                           */}
      {/* ========================================================================= */}
      <div

        className="IdentitySummary w-full p-5 sm:p-6 bg-slate-900 rounded-2xl outline outline-1 outline-offset-[-1px] outline-blue-900 shadow-md backdrop-blur-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative overflow-hidden"
      >
        {/* Ambient celestial backdrop glow */}
        <div className="absolute -top-12 -right-12 size-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 size-48 bg-[#E5B65C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Right in RTL: Avatar + Name + Membership details */}
        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <div className="relative group shrink-0">
            {/* Circular Avatar */}
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

            {/* Quick camera trigger icon */}
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

        {/* Left in RTL: Edit Picture Pill Button */}
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
            className="px-4 py-2 rounded-full outline outline-1 outline-offset-[-1px] outline-sky-400 hover:bg-sky-400/10 text-sky-400 text-xs sm:text-sm font-semibold font-['Tajawal'] inline-flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Camera size={15} />
            <span>تعديل الصورة</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN FORM & SETTINGS COLUMNS                                           */}
      {/* ========================================================================= */}
      <form onSubmit={handleSaveChanges} className="w-full flex flex-col gap-6 md:gap-8">
        <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
          {/* ===================================================================== */}
          {/* PRIMARY COLUMN (Right in RTL, flex-1)                                 */}
          {/* Contains: 1. Personal Info, 2. Learning Preferences                  */}
          {/* ===================================================================== */}
          <div className="flex-1 w-full flex flex-col gap-6 order-1 lg:order-1">
            {/* ------------------------------------------------------------------- */}
            {/* CARD 1: المعلومات الشخصية (Personal Information)                     */}
            {/* ------------------------------------------------------------------- */}
            <div

              className="p-5 sm:p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.08)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col gap-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-900/40">
                <User size={18} className="text-sky-400 shrink-0" />
                <h2 className="text-white text-base sm:text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                  المعلومات الشخصية
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="fullName" className="text-slate-300 text-xs font-medium font-['Tajawal']">
                    الاسم الكامل
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      type="text"
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 pl-10 bg-slate-950/80 rounded-xl outline outline-1 outline-blue-900/80 focus:outline-sky-400 text-slate-100 text-sm font-normal font-['Tajawal'] transition-all"
                      placeholder="أدخل اسمك الكامل"
                    />
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Email with Verified Badge */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="email" className="text-slate-300 text-xs font-medium font-['Tajawal']">
                      البريد الإلكتروني
                    </label>
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle2 size={12} />
                      مؤكد
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 pl-10 bg-slate-950/80 rounded-xl outline outline-1 outline-blue-900/80 focus:outline-sky-400 text-slate-100 text-sm font-normal font-['Tajawal'] transition-all text-left"
                      placeholder="name@example.com"
                    />
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-2">
                <label htmlFor="phone" className="text-slate-300 text-xs font-medium font-['Tajawal']">
                  رقم الجوال
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 rounded-xl outline outline-1 outline-blue-900/80 focus:outline-sky-400 text-slate-100 text-sm font-normal font-['Tajawal'] transition-all text-left"
                    placeholder="+966 5X XXX XXXX"
                  />
                  <Phone size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* CARD 2: تفضيلات التعلّم (Learning Preferences)                       */}
            {/* ------------------------------------------------------------------- */}
            <div

              className="p-5 sm:p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.08)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col gap-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-900/40">
                <Sparkles size={18} className="text-[#E5B65C] shrink-0" />
                <h2 className="text-white text-base sm:text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                  تفضيلات التعلّم
                </h2>
              </div>

              {/* Learning Level Segmented Selector */}
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

              {/* Learning Interests Multi-select Chips */}
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 text-xs font-medium font-['Tajawal']">
                    الاهتمامات والمسارات التقنية
                  </label>
                  <span className="text-[11px] text-slate-500 font-['Tajawal']">
                    اختر ما يناسب شغفك
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_INTERESTS.map((interest) => {
                    const isSelected = profile.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => toggleInterest(interest)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-['Tajawal'] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
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
            </div>
          </div>

          {/* ===================================================================== */}
          {/* SECONDARY COLUMN (Left in RTL, w-80 on desktop, stacked on mobile)     */}
          {/* Contains: 3. Notifications, 4. Language & Account                    */}
          {/* ===================================================================== */}
          <div className="w-full lg:w-80 flex flex-col gap-6 order-2 lg:order-2 shrink-0">
            {/* ------------------------------------------------------------------- */}
            {/* CARD 3: الإشعارات والتذكيرات (Notifications & Reminders)             */}
            {/* ------------------------------------------------------------------- */}
            <div

              className="p-5 sm:p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.08)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col gap-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-900/40">
                <Bell size={18} className="text-sky-400 shrink-0" />
                <h2 className="text-white text-base sm:text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                  الإشعارات والتذكيرات
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {/* Switch 1: Live Sessions */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-200 text-xs sm:text-sm font-normal font-['Tajawal'] select-none">
                    تذكير قبل الجلسات المباشرة
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.notifications.liveSessionReminders}
                    onClick={() => toggleNotification('liveSessionReminders')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 outline-none focus:ring-2 focus:ring-sky-400/40 ${
                      profile.notifications.liveSessionReminders ? 'bg-[#29A9FF]' : 'bg-[#1B3F80]'
                    }`}
                  >
                    <span
                      className={`block size-5 bg-white rounded-full shadow-md transition-transform ${
                        profile.notifications.liveSessionReminders ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Weekly Progress */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-200 text-xs sm:text-sm font-normal font-['Tajawal'] select-none">
                    ملخص التقدم الأسبوعي
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.notifications.weeklyProgressSummary}
                    onClick={() => toggleNotification('weeklyProgressSummary')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 outline-none focus:ring-2 focus:ring-sky-400/40 ${
                      profile.notifications.weeklyProgressSummary ? 'bg-[#29A9FF]' : 'bg-[#1B3F80]'
                    }`}
                  >
                    <span
                      className={`block size-5 bg-white rounded-full shadow-md transition-transform ${
                        profile.notifications.weeklyProgressSummary ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 3: Suggested Opportunities */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-200 text-xs sm:text-sm font-normal font-['Tajawal'] select-none">
                    فرص تعليمية مقترحة
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.notifications.recommendedOpportunities}
                    onClick={() => toggleNotification('recommendedOpportunities')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 outline-none focus:ring-2 focus:ring-sky-400/40 ${
                      profile.notifications.recommendedOpportunities ? 'bg-[#29A9FF]' : 'bg-[#1B3F80]'
                    }`}
                  >
                    <span
                      className={`block size-5 bg-white rounded-full shadow-md transition-transform ${
                        profile.notifications.recommendedOpportunities ? '-translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* CARD 4: اللغة والحساب (Language & Account)                           */}
            {/* ------------------------------------------------------------------- */}
            <div

              className="p-5 sm:p-6 bg-slate-900 rounded-2xl shadow-[0px_8px_24px_0px_rgba(41,169,255,0.08)] outline outline-1 outline-offset-[-1px] outline-blue-900 flex flex-col gap-5"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-900/40">
                <Globe size={18} className="text-sky-400 shrink-0" />
                <h2 className="text-white text-base sm:text-lg font-bold font-['IBM_Plex_Sans_Arabic']">
                  اللغة والحساب
                </h2>
              </div>

              {/* Interface Language */}
              <div className="flex flex-col gap-2">
                <label htmlFor="language" className="text-slate-300 text-xs font-medium font-['Tajawal']">
                  لغة الواجهة
                </label>
                <div className="relative">
                  <select
                    id="language"
                    value={profile.language}
                    onChange={(e) => setProfile({ ...profile, language: e.target.value as InterfaceLanguage })}
                    className="w-full px-3.5 py-2.5 pl-10 bg-slate-950/80 rounded-xl outline outline-1 outline-blue-900/80 focus:outline-sky-400 text-slate-100 text-sm font-normal font-['Tajawal'] transition-all appearance-none cursor-pointer"
                  >
                    <option value="ar">العربية (Arabic)</option>
                    <option value="en">English (الإنجليزية)</option>
                  </select>
                  <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Timezone */}
              <div className="flex flex-col gap-2">
                <label htmlFor="timezone" className="text-slate-300 text-xs font-medium font-['Tajawal']">
                  المنطقة الزمنية
                </label>
                <div className="relative">
                  <select
                    id="timezone"
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-3.5 py-2.5 pl-10 bg-slate-950/80 rounded-xl outline outline-1 outline-blue-900/80 focus:outline-sky-400 text-slate-100 text-sm font-normal font-['Tajawal'] transition-all appearance-none cursor-pointer"
                  >
                    <option value="الرياض (GMT+3)">الرياض (GMT+3)</option>
                    <option value="مكة المكرمة (GMT+3)">مكة المكرمة (GMT+3)</option>
                    <option value="دبي (GMT+4)">دبي (GMT+4)</option>
                    <option value="القاهرة (GMT+2)">القاهرة (GMT+2)</option>
                  </select>
                  <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SAVE ACTION BUTTON ROW                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-300 hover:bg-orange-400 text-slate-900 rounded-full font-bold font-['IBM_Plex_Sans_Arabic'] text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(229,182,92,0.3)] hover:shadow-[0_4px_24px_rgba(229,182,92,0.5)] active:scale-95 transition-all disabled:opacity-70"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin text-slate-900" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Save size={18} className="text-slate-900" />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-6 py-3 bg-transparent outline outline-1 outline-slate-700 hover:outline-slate-500 text-slate-400 hover:text-slate-200 rounded-full font-medium font-['Tajawal'] text-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RotateCcw size={15} />
            <span>استعادة الافتراضي</span>
          </button>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* 4. SUCCESS CELESTIAL TOAST NOTIFICATION                                   */}
      {/* ========================================================================= */}
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
