import { requireSupabase } from '../lib/supabase';
import type { UserRole } from '../types/database';

export async function recordAuditLog(params: {
  actorProfileId: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('audit_logs').insert({
    actor_profile_id: params.actorProfileId,
    actor_role: params.actorRole,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId ?? null,
    old_values: params.oldValues ?? null,
    new_values: params.newValues ?? null,
  });
  if (error) {
    // Audit logging should not silently mask primary failures, but surface in console for monitoring
    console.warn('Audit log insert warning:', error.message);
  }
}

export async function createNotification(params: {
  recipientProfileId: string;
  category: string;
  title: string;
  message: string;
  linkPath?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('notifications').insert({
    recipient_profile_id: params.recipientProfileId,
    category: params.category,
    title: params.title,
    message: params.message,
    link_path: params.linkPath ?? null,
    related_entity_type: params.relatedEntityType ?? null,
    related_entity_id: params.relatedEntityId ?? null,
  });
  if (error) {
    console.warn('Notification insert warning:', error.message);
  }
}

