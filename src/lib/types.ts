export type Profile = {
  id: string;
  name: string;
  city: string;
  bio: string;
  visibility?: "public" | "private";
  pace: string;
};
export type Group = {
  id: string;
  owner_id: string;
  name: string;
  city: string;
  description: string;
  color: string;
  rules?: string;
  contact?: string;
};
export type Membership = { group_id: string; user_id: string };
export type Run = {
  id: string;
  group_id: string;
  creator_id: string;
  title: string;
  starts_at: string;
  start_point: string;
  end_point: string;
  distance: number;
  pace: string;
  description: string;
  neighborhood?: string;
  beginner_friendly?: boolean;
  no_one_left_behind?: boolean;
  duration_minutes?: number;
  status?: "scheduled" | "cancelled";
  cancellation_reason?: string;
};
export type Participant = { run_id: string; user_id: string };
export type Post = {
  id: string;
  user_id: string;
  group_id: string;
  run_id: string | null;
  body: string;
  photo_path: string | null;
  created_at: string;
};
export type Like = { post_id: string; user_id: string };
export type Product = {
  id: string;
  group_id: string;
  name: string;
  description: string;
  price_cents: number;
  category: string;
  active: boolean;
};
export type Order = {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  size: string;
  total_cents: number;
  status: string;
  created_at: string;
};
export type Notice = {
  id: string;
  user_id: string;
  run_id: string;
  title: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
export type Report = {
  id: string;
  reporter_id: string;
  group_id: string;
  post_id: string | null;
  reason: string;
  status: "open" | "resolved";
  created_at: string;
};
export type Data = {
  notifications: Notice[];
  reports: Report[];
  profiles: Profile[];
  groups: Group[];
  memberships: Membership[];
  runs: Run[];
  participants: Participant[];
  posts: Post[];
  likes: Like[];
  products: Product[];
  orders: Order[];
};
export type Tab = "feed" | "runs" | "groups" | "album" | "shop" | "profile";
