import React, { useRef } from 'react';
import { Award, Camera } from 'lucide-react';
import { useProfile } from '../context/profileContext';

/** Identity hero: avatar with edit control, name, badge, and membership meta. */
export const ProfileHero: React.FC = () => {
  const { profile, changeAvatar } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickPhoto = () => fileInputRef.current?.click();

  return (
    <section className="profile-hero group animate-pop-in">
      <div className="profile-wash-blue" />
      <div className="profile-wash-gold" />

      <div className="profile-hero-row">
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
              <span className="profile-avatar-initials">{profile.avatarInitials}</span>
            )}
          </div>

          <button
            type="button"
            onClick={pickPhoto}
            title="تغيير الصورة الشخصية"
            className="profile-avatar-edit"
          >
            <Camera size={13} />
          </button>
        </div>

        <div className="profile-hero-id">
          <div className="profile-name-row">
            <h1 className="profile-name">{profile.fullName}</h1>
            <span className="profile-badge">
              <Award size={12} />
              طالب متميز
            </span>
          </div>

          <p className="profile-meta">{profile.membershipStatus}</p>
        </div>
      </div>

      <div className="profile-hero-action">
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) changeAvatar(file);
          }}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={pickPhoto}
          className="btn-outline-blue text-xs sm:text-sm"
        >
          <Camera size={15} />
          <span>تعديل الصورة</span>
        </button>
      </div>
    </section>
  );
};