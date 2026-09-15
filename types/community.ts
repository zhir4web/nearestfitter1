export type CommunityStatus = 'open' | 'resolved' | 'hidden';
export type CommunityReply = {
  id: string;
  post_id: string;
  fitter_id: string;
  fitter_name: string;
  fitter_type: 'fixed' | 'mobile' | string;
  body: string;
  created_at: string;
};
export type CommunityPost = {
  id: string;
  author_name: string;
  title: string;
  car_model: string;
  neighborhood: string;
  body: string;
  status: CommunityStatus;
  created_at: string;
  replies: CommunityReply[];
};
