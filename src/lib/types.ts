import type { Category, NeedStatus } from "./format";

export type PublicNeed = {
  id: string;
  slug: string;
  category: Category;
  title: string;
  story: string;
  my_words: string;
  display_name: string;
  state: string;
  city: string | null;
  is_minor: boolean;
  cover_photo_path: string | null;
  amount_kobo: number;
  raised_kobo: number;
  remaining_kobo: number;
  status: NeedStatus;
  verified_at: string | null;
  verification_note: string | null;
  published_at: string | null;
  funded_at: string | null;
  paid_out_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  institution_type: "school" | "hospital" | null;
  institution_label: string | null;
  giver_count: number;
  payout_completed_at: string | null;
  paid_out_kobo: number;
};

export type Need = {
  id: string;
  slug: string;
  beneficiary_id: string | null;
  created_by: string | null;
  relationship: string;
  category: Category;
  title: string;
  story: string;
  my_words: string;
  display_name: string;
  state: string;
  city: string | null;
  is_minor: boolean;
  contact_phone: string | null;
  consent_at: string | null;
  cover_photo_path: string | null;
  amount_kobo: number;
  raised_kobo: number;
  institution_id: string | null;
  status: NeedStatus;
  info_request: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  funded_at: string | null;
  paid_out_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Institution = {
  id: string;
  name: string;
  type: "school" | "hospital";
  state: string | null;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  bank_code: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  paystack_recipient_code: string | null;
  account_resolved_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_by: string | null;
};

export type Profile = {
  id: string;
  user_id: string;
  role: "beneficiary" | "giver" | "admin";
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  state: string | null;
  avatar_url: string | null;
};

export type PublicUpdate = {
  id: string;
  need_id: string;
  body: string;
  milestone: string;
  photo_paths: string[];
  published_at: string;
};
