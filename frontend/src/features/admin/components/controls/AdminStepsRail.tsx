import React from 'react';
import { Check } from 'lucide-react';

export interface AdminStepLabel {
  key: string;
  label: string;
}

/**
 * The numbered rail a multi-step editor opens with: done = check, current =
 * gold, upcoming = quiet. The generic content editor and the video upload
 * both read it so one wizard grammar serves every admin action.
 */
export const AdminStepsRail: React.FC<{ steps: AdminStepLabel[]; stepIndex: number }> = ({ steps, stepIndex }) => (
  <div className="admin-steps" role="list" aria-label="خطوات العمل">
    {steps.map((step, index) => {
      const state = index === stepIndex ? 'admin-step-active' : index < stepIndex ? 'admin-step-done' : 'admin-step-idle';
      return (
        <React.Fragment key={step.key}>
          {index > 0 && <span className="admin-step-tail" aria-hidden="true" />}
          <span className={`admin-step ${state}`} role="listitem">
            <span className="admin-step-dot">{index < stepIndex ? <Check size={14} /> : index + 1}</span>
            <span className="admin-step-name">{step.label}</span>
          </span>
        </React.Fragment>
      );
    })}
    <span className="admin-step-pos ms-auto">
      خطوة {stepIndex + 1} من {steps.length}
    </span>
  </div>
);
