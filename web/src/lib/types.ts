// SHARED FILE. Mirrors supabase/migrations. If the DB changes, Person A updates this in the same PR.
export type UserRole = 'student' | 'faculty' | 'society' | 'admin';
export type ApprovalMode = 'auto' | 'approval';
export type ResourceStatus = 'active' | 'out_of_service' | 'retired';
export type BookingStatus =
  | 'pending_approval' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no_show' | 'expired';

export interface Profile {
  id: string; email: string; full_name: string | null; role: UserRole;
  society: string | null; is_active: boolean;
}
export interface Category { id: string; name: string; default_approval: ApprovalMode }
export interface Resource {
  id: string; category_id: string; name: string; building: string | null; location: string | null;
  capacity: number; description: string | null; rules_text: string | null; status: ResourceStatus;
  approval_mode: ApprovalMode | null; open_time: string; close_time: string;
  min_minutes: number; max_minutes: number; slot_minutes: number; advance_days: number;
  buffer_minutes: number; allowed_roles: UserRole[];
}
export interface Booking {
  id: string; reference: string; resource_id: string; user_id: string;
  start_at: string; end_at: string; attendees: number; purpose: string | null;
  status: BookingStatus; decided_by: string | null; decision_reason: string | null; created_at: string;
}
export interface AvailabilitySlot { start_at: string; end_at: string; kind: 'booked' | 'hold' | 'blocked' }
