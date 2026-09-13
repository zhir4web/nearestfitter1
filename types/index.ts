export const services = [
  'puncture',
  'change',
  'balance',
  'alignment',
  'sales',
  'roadside',
] as const;
export type Service = string;
export type Hours = {
  closed: boolean;
  open: string;
  close: string;
  allDay: boolean;
}[];
export type Fitter = {
  id: string;
  name: string;
  type: 'fixed' | 'mobile';
  phone: string;
  phone2: string;
  whatsapp: string;
  photo_url: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  services: Service[];
  working_hours: Hours;
  status: 'approved' | 'pending';
  demo: boolean;
  created_at: string;
  rating?: number;
  review_count?: number;
  is_busy?: boolean;
};
export type Review = {
  id: string;
  fitter_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved';
  created_at: string;
};
export type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};
export type Language = 'ckb' | 'en' | 'ar';
export type DispatchStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'reassigning';
export type DispatchRequest = {
  id: string;
  fitter_id: string;
  user_lat: number;
  user_lng: number;
  user_phone: string;
  user_note: string;
  status: DispatchStatus;
  fitter_token: string;
  user_token: string;
  tried_fitters: string;
  reassign_count: number;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  completed_at?: string;
};
export type FitterDashboard = {
  id: string;
  fitter_id: string;
  code: string;
  created_at: string;
};

