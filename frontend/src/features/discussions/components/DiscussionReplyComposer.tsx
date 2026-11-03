import React, { useState } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { MarkdownEditor } from '@/shared/components/Editor/MarkdownEditor';
import type { DiscussionPost, DiscussionReplyInput } from '@/features/discussions/types';

export const DiscussionReplyComposer: React.FC<{
  onSubmit: (input: DiscussionReplyInput) => Promise<DiscussionPost>;
  submitLabel?: string;
}> = ({ onSubmit, submitLabel = 'إضافة الرد' }) => {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError('اكتب نص الرد أولًا.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({ body: body.trim() });
      setBody('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'تعذّر نشر الرد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="discussion-reply-composer" onSubmit={submit}>
      <MarkdownEditor value={body} onChange={setBody} maxLength={20000} label="ردّك · Markdown" placeholder="أضف توضيحًا أو إجابة…" id="discussion-reply-body" />
      {error && <p className="discussion-error" role="alert">{error}</p>}
      <button className="discussion-button discussion-button-muted" type="submit" disabled={busy}><CornerDownLeft size={15} />{busy ? 'جارٍ الإرسال…' : submitLabel}</button>
    </form>
  );
};
