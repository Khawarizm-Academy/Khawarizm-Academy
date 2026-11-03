import React, { useEffect, useState } from 'react';
import { Inbox, MessageSquareReply } from 'lucide-react';
import { DiscussionMarkdown } from '@/features/discussions/components/DiscussionMarkdown';
import { DiscussionReplyComposer } from '@/features/discussions/components/DiscussionReplyComposer';
import { createDiscussionReply, fetchStudioDiscussionInbox } from '@/features/discussions/data/discussionFetchers';
import type { DiscussionThread } from '@/features/discussions/types';
import './discussion.css';

export const StudioDiscussionInbox: React.FC = () => {
  const [items, setItems] = useState<DiscussionThread[]>([]);
  const [selected, setSelected] = useState<DiscussionThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void fetchStudioDiscussionInbox().then((result) => { if (active) setItems(result.items); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'تعذّر تحميل صندوق النقاشات.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <section className="discussion-feature discussion-inbox" aria-labelledby="discussion-inbox-title"><header className="discussion-tab-head"><div><span className="discussion-kicker">استوديو المدرّب</span><h2 id="discussion-inbox-title">صندوق أسئلة المتعلمين</h2></div><Inbox size={22} aria-hidden="true" /></header>{error && <p className="discussion-error" role="alert">{error}</p>}{loading ? <p className="discussion-state">جارٍ التحميل…</p> : items.length === 0 ? <p className="discussion-state">لا توجد أسئلة تنتظر الرد.</p> : <div className="discussion-inbox-list">{items.map((thread) => <article className="discussion-inbox-row" key={thread.id}><div><span className="discussion-inbox-course">{thread.courseTitle || thread.courseSlug}</span><h3>{thread.title}</h3><p className="discussion-inbox-meta">{thread.author.name} · {thread.lessonTitle || 'نقاش عام'} · {new Date(thread.createdAt).toLocaleDateString('ar')}</p><DiscussionMarkdown value={thread.body} /></div><button type="button" className="discussion-button discussion-button-muted" onClick={() => setSelected(thread)}><MessageSquareReply size={15} />رد سريع</button></article>)}</div>}{selected && <aside className="discussion-reply-drawer" aria-label="الرد على السؤال"><div className="discussion-composer-head"><div><span className="discussion-kicker">رد سريع</span><h3>{selected.title}</h3></div><button type="button" className="discussion-text-button" onClick={() => setSelected(null)}>إغلاق</button></div><DiscussionReplyComposer onSubmit={(input) => createDiscussionReply(selected.courseSlug || '', selected.id, input)} submitLabel="إرسال الرد" /></aside>}</section>;
};
