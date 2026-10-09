export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

interface SlidingSegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Gold for progress toggles, blue for filters. */
  tone?: 'blue' | 'gold';
  className?: string;
  'aria-label'?: string;
}

/** Highlight puck styling per tone. */
const PUCK_TONE: Record<'blue' | 'gold', string> = {
  blue: 'seg-puck-blue',
  gold: 'seg-puck-gold',
};

/** Active label styling per tone. */
const ACTIVE_TONE: Record<'blue' | 'gold', string> = {
  blue: 'seg-option-on-blue',
  gold: 'seg-option-on-gold',
};

/**
 * Physical sliding-highlight switcher shared by every side-by-side toggle
 * (the same spring-glide puck as the home smart-search bar).
 * Equal-width segments, N options, RTL anchored.
 */
export function SlidingSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'blue',
  className = '',
  'aria-label': ariaLabel,
}: SlidingSegmentedControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value)
  );

  return (
    <div dir="rtl" role="tablist" aria-label={ariaLabel} className={`seg-control ${className}`}>
      {/* Sliding highlight layer */}
      <div className="seg-track" aria-hidden="true">
        <div
          className={`seg-puck ${PUCK_TONE[tone]}`}
          style={{
            width: `${100 / options.length}%`,
            transform: `translateX(-${activeIndex * 100}%)`,
          }}
        />
      </div>

      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.id)}
            className={`seg-option ${isActive ? ACTIVE_TONE[tone] : 'seg-option-idle'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
