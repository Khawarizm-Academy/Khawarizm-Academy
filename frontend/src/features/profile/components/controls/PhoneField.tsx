import React, { useMemo, useState } from 'react';
import { Phone } from 'lucide-react';
import { COUNTRIES, buildPhone, detectCountryIso, parsePhone } from '@/shared/lib/countries';

interface PhoneFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Phone input with a country selector covering every dialing code. The country
 * is preselected from the visitor's local timezone/locale so an Egyptian reader
 * lands on +20 by default and a Moroccan one on +212.
 */
export const PhoneField: React.FC<PhoneFieldProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
  placeholder = '5X XXX XXXX',
}) => {
  const detectedIso = useMemo(() => detectCountryIso(), []);
  // Parsed straight from the stored value; the override only covers an empty value.
  const parsed = parsePhone(value);
  const [isoOverride, setIsoOverride] = useState<string | null>(null);
  const iso = parsed?.iso ?? isoOverride ?? detectedIso;
  const national = parsed?.national ?? '';

  const handleCountry = (nextIso: string) => {
    setIsoOverride(nextIso);
    onChange(buildPhone(nextIso, national));
  };

  const handleNumber = (nextNational: string) => {
    onChange(buildPhone(iso, nextNational.replace(/\D/g, '')));
  };

  return (
    <div className="profile-field">
      <label htmlFor={`${id}-number`} className="profile-label">
        {label}
      </label>

      <div className="phone-field">
        <div className="phone-country">
          <select
            aria-label="اختر الدولة"
            className="phone-country-select"
            value={iso}
            disabled={disabled}
            onChange={(event) => handleCountry(event.target.value)}
          >
            {COUNTRIES.map((country) => (
              <option key={country.iso} value={country.iso}>
                {country.flag} {country.name}
              </option>
            ))}
          </select>
        </div>

        <div dir="ltr" className="phone-number">
          <span className="phone-dial" aria-hidden="true">
            <Phone size={14} className="phone-dial-icon" />
            {buildPhone(iso, '')}
          </span>
          <input
            id={`${id}-number`}
            type="tel"
            inputMode="numeric"
            className="phone-number-input"
            value={national}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => handleNumber(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
