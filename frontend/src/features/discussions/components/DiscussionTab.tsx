import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Pin, ShieldAlert } from 'lucide-react';
import { DiscussionComposer } from '@/features/discussions/components/DiscussionComposer';
import { DiscussionMarkdown } from '@/features/discussions/components/DiscussionMarkdown';
import { DiscussionReplyComposer } from '@/features/discussions/components/DiscussionReplyComposer';
import { acceptDiscussionAnswer, createDiscussionReply, createDiscussionThread, fetchDiscussionThreads, moderateDiscussion } from '@/features/discussions/data/discussionFetchers';
import type { DiscussionPost, DiscussionThread } from '@/features/discussions/types';
import './discussion.css';

const dateFormatter = new Intl.DateTimeFormat('ar', { dateStyle: 'medium', timeStyle: 'short' });

export const DiscussionTab: React.FC<{
  courseSlug: string;
  lessonId: string;
  canPost?: boolean;
  canReply?: boolean;
  canModerate?: boolean;
  onJumpToTimestamp?: (seconds: number) => void;
}> = ({ courseSlug, lessonId, canPost = true, canReply = false, canModerate = false, onJumpToTimestamp }) => {
  const [items, setItems] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    void fetchDiscussionThreads(courseSlug, lessonId).then((result) => setItems(result.items)).catch((reason) => setError(reason instanceof Error ? reason.message : 'تعذّر تحميل النقاشات.')).finally(() => setLoading(false));
  }, [courseSlug, lessonId]);

  const addThread = async (input: { title: string; body: string; lessonId: string }) => {
    const created = await createDiscussionThread(courseSlug, input);
    setItems((current) => [created, ...current]);
    return created;
  };

  const addReply = async (thread: DiscussionThread, input: { body: string }) => {
    const post = await createDiscussionReply(courseSlug, thread.id, input);
    setItems((current) => current.map((item) => item.id === thread.id ? { ...item, posts: [...(item.posts || []), post] } : item));
    return post;
  };

  const accept = async (thread: DiscussionThread, post: DiscussionPost) => {
    const updated = await acceptDiscussionAnswer(courseSlug, thread.id, post.id);
    setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const moderate = async (thread: DiscussionThread, input: { hidden?: boolean; pinned?: boolean }) => {
    const updated = await moderateDiscussion(courseSlug, thread.id, input);
    setItems((current) => input.hidden ? current.filter((item) => item.id !== updated.id) : current.map((item) => item.id === updated.id ? updated : item));
  };

  return (
    <section className="discussion-feature discussion-tab" aria-labelledby="discussion-tab-title">
      <header className="discussion-tab-head"><div><span className="discussion-kicker">سؤال وجواب الدرس</span><h2 id="discussion-tab-title">النقاش</h2></div>{canPost && <button type="button" className="discussion-button discussion-button-gold" onClick={() => setComposerOpen((open) => !open)}><MessageCircle size={15} />اسأل سؤالًا</button>}</header>
      {composerOpen && <DiscussionComposer lessonId={lessonId} onSubmit={addThread} onCancel={() => setComposerOpen(false)} />}
      {error && <p className="discussion-error" role="alert">{error}</p>}
      {loading ? <p className="discussion-state" role="status">جارٍ تحميل النقاشات…</p> : items.length === 0 ? <p className="discussion-state">لا توجد أسئلة لهذا الدرس بعد.</p> : <div className="discussion-thread-list">{items.map((thread) => <article className={`discussion-thread${thread.pinned ? ' is-pinned' : ''}`} key={thread.id}>
        <header className="discussion-thread-head"><div><div className="discussion-thread-meta"><span>{thread.author.name}</span><time dateTime={thread.createdAt}>{dateFormatter.format(new Date(thread.createdAt))}</time>{thread.pinned && <span className="discussion-pin-label"><Pin size={12} />مثبت</span>}</div><h3>{thread.title}</h3></div><span className={`discussion-status ${thread.status === 'answered' ? 'is-answered' : ''}`}>{thread.status === 'answered' ? <><CheckCircle2 size={13} />تمت الإجابة</> : 'مفتوح'}</span></header>
        <DiscussionMarkdown value={thread.body} onJumpToTimestamp={onJumpToTimestamp} />
        <div className="discussion-post-list">{(thread.posts || []).map((post) => <div className={`discussion-post${post.isAccepted ? ' is-accepted' : ''}`} key={post.id}><div className="discussion-post-head"><strong>{post.author.name}</strong>{post.isInstructorAnswer && <span className="discussion-instructor-badge">فريق الدورة</span>}{post.isAccepted && <span className="discussion-accepted-badge"><CheckCircle2 size={12} />الإجابة المعتمدة</span>}</div><DiscussionMarkdown value={post.body} onJumpToTimestamp={onJumpToTimestamp} />{canReply && post.isInstructorAnswer && !post.isAccepted && <button type="button" className="discussion-text-button" onClick={() => void accept(thread, post)}>اعتماد هذه الإجابة</button>}</div>)}</div>
        <div className="discussion-thread-actions">{canReply && <DiscussionReplyComposer onSubmit={(input) => addReply(thread, input)} submitLabel="الرد من فريق الدورة" />}{canModerate && <div className="discussion-moderation-actions"><button type="button" className="discussion-text-button" onClick={() => void moderate(thread, { pinned: !thread.pinned })}><Pin size={13} />{thread.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button><button type="button" className="discussion-text-button discussion-danger-button" onClick={() => void moderate(thread, { hidden: true })}><ShieldAlert size={13} />إخفاء</button></div>}</div>
      </article>)}</div>}
    </section>
  );
};
