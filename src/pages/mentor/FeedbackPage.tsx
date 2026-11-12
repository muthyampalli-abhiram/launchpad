import React, { useEffect, useState } from 'react';
import { Lock, MessageSquare, Plus, Send } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import {
  fetchConversationMessages,
  saveFeedbackRecord,
  sendMentorMessage,
} from '../../services/projectAndCertService';
import type { FeedbackCategory, FeedbackRecord, MentorInternMessage } from '../../types/database';

const CATEGORIES: FeedbackCategory[] = [
  'Technical',
  'Task',
  'Project',
  'Monthly KPI',
  'Stage Evaluation',
  'Communication',
  'Professional Development',
  'Improvement Suggestions',
  'General',
];

export const FeedbackPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [tab, setTab] = useState<'feedback' | 'messages'>('feedback');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeedbackRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Feedback form
  const [internId, setInternId] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>('Technical');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  // Direct messaging
  const [chatInternId, setChatInternId] = useState('');
  const [messages, setMessages] = useState<MentorInternMessage[]>([]);
  const [msgText, setMsgText] = useState('');
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const activeChatInternId = chatInternId || bundle?.interns[0]?.intern.id || '';

  useEffect(() => {
    if (!bundle || !activeChatInternId || tab !== 'messages') return;
    setLoadingMsgs(true);
    fetchConversationMessages(bundle.mentor.id, activeChatInternId)
      .then(setMessages)
      .catch((err) => showToast('error', 'Failed to load messages', formatAppError(err)))
      .finally(() => setLoadingMsgs(false));
  }, [bundle, activeChatInternId, tab, showToast]);

  if (loading) return <LoadingPage message="Loading feedback & communication..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load feedback.'} onRetry={refresh} />;

  const openNew = () => {
    setEditing(null);
    setInternId(bundle.interns[0]?.intern.id ?? '');
    setCategory('Technical');
    setTitle('');
    setContent('');
    setIsPrivateNote(false);
    setIsImportant(false);
    setModalOpen(true);
  };

  const openEdit = (fb: FeedbackRecord) => {
    setEditing(fb);
    setInternId(fb.intern_id);
    setCategory(fb.category);
    setTitle(fb.title);
    setContent(fb.content);
    setIsPrivateNote(fb.is_private_note);
    setIsImportant(fb.is_important);
    setModalOpen(true);
  };

  const handleSaveFeedback = async (publish: boolean) => {
    if (!profile) return;
    const internObj = bundle.interns.find((i) => i.intern.id === internId);
    setSaving(true);
    try {
      await saveFeedbackRecord({
        id: editing?.id,
        internId,
        internProfileId: internObj?.intern.profile_id,
        mentorId: bundle.mentor.id,
        category,
        title,
        content,
        isPrivateNote,
        isPublished: isPrivateNote ? false : publish,
        isImportant,
        actorProfileId: profile.id,
      });
      showToast(
        'success',
        isPrivateNote ? 'Private mentor note saved' : publish ? 'Feedback published to intern' : 'Draft saved'
      );
      setModalOpen(false);
      await refresh();
    } catch (err) {
      showToast('error', 'Failed to save feedback', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !activeChatInternId || !msgText.trim()) return;
    setSaving(true);
    try {
      const sent = await sendMentorMessage({
        mentorId: bundle.mentor.id,
        internId: activeChatInternId,
        senderProfileId: profile.id,
        messageBody: msgText,
      });
      setMessages((prev) => [...prev, sent]);
      setMsgText('');
    } catch (err) {
      showToast('error', 'Message failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Feedback & Communication</h1>
          <p className="text-sm text-[#64748B]">
            Publish structured feedback to assigned interns or keep private internal mentor notes hidden from interns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={tab === 'feedback' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setTab('feedback')}
          >
            Structured Feedback
          </Button>
          <Button
            variant={tab === 'messages' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setTab('messages')}
          >
            Direct Messages
          </Button>
          {tab === 'feedback' && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={openNew}
              disabled={bundle.interns.length === 0}
            >
              Create Feedback
            </Button>
          )}
        </div>
      </div>

      {tab === 'feedback' ? (
        bundle.feedbackRecords.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="w-6 h-6" />}
            title="No feedback records yet"
            description="Create structured feedback for your assigned interns or save private observation notes."
          />
        ) : (
          <div className="space-y-3">
            {bundle.feedbackRecords.map((fb) => (
              <Card key={fb.id}>
                <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3 text-xs">
                  <div className="space-y-1 flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-[#172B4D]">{fb.title}</span>
                      <Badge tone="blue">{fb.category}</Badge>
                      {fb.is_important && <Badge tone="red">Important</Badge>}
                      {fb.is_private_note ? (
                        <Badge tone="amber">
                          <Lock className="w-3 h-3 mr-1" /> Private Note (Hidden from Intern)
                        </Badge>
                      ) : fb.is_published ? (
                        <Badge tone="green">Published</Badge>
                      ) : (
                        <Badge tone="slate">Draft</Badge>
                      )}
                      {fb.viewed_by_intern_at && (
                        <Badge tone="blue">Viewed {new Date(fb.viewed_by_intern_at).toLocaleDateString()}</Badge>
                      )}
                    </div>
                    <p className="text-[#64748B]">
                      Intern: <strong className="text-[#172B4D]">{fb.intern?.profile?.full_name}</strong> ·{' '}
                      {new Date(fb.created_at).toLocaleString()}
                    </p>
                    <p className="text-[#172B4D] pt-1 whitespace-pre-wrap">{fb.content}</p>
                  </div>
                  {!fb.is_published && (
                    <Button size="sm" variant="outline" onClick={() => openEdit(fb)}>
                      Edit Draft
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <Card>
          <CardHeader
            title="Authorized Mentor-Intern Conversation"
            subtitle="Strictly scoped by RLS to your assigned mentor-intern relationship"
            action={
              <div className="w-60">
                <Select value={activeChatInternId} onChange={(e) => setChatInternId(e.target.value)}>
                  {bundle.interns.map((i) => (
                    <option key={i.intern.id} value={i.intern.id}>
                      {i.intern.profile?.full_name}
                    </option>
                  ))}
                </Select>
              </div>
            }
          />
          <CardContent className="space-y-4">
            <div className="h-80 overflow-y-auto p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              {loadingMsgs ? (
                <p className="text-xs text-[#64748B]">Loading conversation...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-12">
                  No messages with this intern yet. Start the conversation below.
                </p>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_profile_id === profile?.id;
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-xl px-3.5 py-2.5 text-xs ${
                          isMine
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-white border border-slate-200 text-[#172B4D]'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.message_body}</p>
                        <p className={`text-[10px] mt-1 ${isMine ? 'text-blue-100' : 'text-[#64748B]'}`}>
                          {new Date(m.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                placeholder="Write a message to your assigned intern..."
                disabled={!activeChatInternId || saving}
              />
              <Button type="submit" icon={<Send className="w-4 h-4" />} loading={saving} disabled={!activeChatInternId}>
                Send
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Feedback Draft' : 'Create Structured Feedback'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="secondary" onClick={() => handleSaveFeedback(false)} loading={saving}>
              {isPrivateNote ? 'Save Private Note' : 'Save Draft'}
            </Button>
            {!isPrivateNote && (
              <Button variant="primary" onClick={() => handleSaveFeedback(true)} loading={saving}>
                Publish to Intern
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Assigned Intern" required>
              <Select value={internId} disabled={Boolean(editing)} onChange={(e) => setInternId(e.target.value)}>
                {bundle.interns.map((i) => (
                  <option key={i.intern.id} value={i.intern.id}>{i.intern.profile?.full_name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Feedback Category" required>
              <Select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Stage 2 Code Architecture Feedback" />
          </FormField>
          <FormField label="Feedback Details" required>
            <Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} />
          </FormField>
          <div className="flex flex-wrap gap-6 text-xs text-[#172B4D]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivateNote}
                onChange={(e) => setIsPrivateNote(e.target.checked)}
              />
              <span>Private internal mentor note (never shown to intern)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isImportant}
                onChange={(e) => setIsImportant(e.target.checked)}
              />
              <span>Mark as Important</span>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

