export const services = [
  'puncture',
  'change',
  'balance',
  'alignment',
  'sales',
  'roadside',
] as const;
export type Service = (typeof services)[number];
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
