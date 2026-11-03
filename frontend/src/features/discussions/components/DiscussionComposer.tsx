import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { MarkdownEditor } from '@/shared/components/Editor/MarkdownEditor';
import type { DiscussionInput, DiscussionThread } from '@/features/discussions/types';

export const DiscussionComposer: React.FC<{
  lessonId: string;
  onSubmit: (input: DiscussionInput) => Promise<DiscussionThread>;
  onCancel?: () => void;
}> = ({ lessonId, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('اكتب عنوان السؤال ومحتواه أولًا.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ title: title.trim(), body: body.trim(), lessonId });
      setTitle('');
      setBody('');
      onCancel?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذّر نشر السؤال.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="discussion-composer" onSubmit={submit}>
      <div className="discussion-composer-head">
        <div>
          <span className="discussion-kicker">سؤال جديد</span>
          <h3>اسأل سؤالًا</h3>
        </div>
        {onCancel && <button type="button" className="discussion-icon-button" onClick={onCancel} aria-label="إلغاء"><X size={16} /></button>}
      </div>
      <label className="discussion-field">
        <span>عنوان السؤال</span>
        <input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} placeholder="ما الذي تريد توضيحه؟" />
      </label>
      <MarkdownEditor
        id="discussion-question-body"
        value={body}
        onChange={setBody}
        maxLength={20000}
        label="المحتوى · Markdown"
        placeholder="اكتب تفاصيل سؤالك…"
      />
      {error && <p className="discussion-error" role="alert">{error}</p>}
      <div className="discussion-form-actions">
        <span className="discussion-no-attachments">النص والروابط الآمنة فقط — لا توجد مرفقات أو رسائل بريدية</span>
        <button className="discussion-button discussion-button-gold" type="submit" disabled={busy}><Send size={15} />{busy ? 'جارٍ النشر…' : 'نشر السؤال'}</button>
      </div>
    </form>
  );
};
