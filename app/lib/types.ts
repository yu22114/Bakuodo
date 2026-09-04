export type GenreKey =
  | "Breaking"
  | "Popping"
  | "Locking"
  | "Waacking"
  | "House"
  | "Krump"
  | "Hip-Hop"
  | "All Style"
  // LESSON・EVENT・NUMBERの投稿・絞り込みだけで使う（CYPHERには出さない）
  | "Girls"
  | "Jazz"
  | "Freestyle";

// EVENTだけが持つJUDGE・DJ・MC。フォロー中のアカウントから選んだ場合はprofile_idが入り、
// アプリ未登録の人をInstagramで手入力した場合はinstagramだけが入る
export type StaffRole = "judge" | "dj" | "mc";
export interface EventStaffMember {
  id: string;
  role: StaffRole;
  profile_id: string | null;
  dancer_name: string | null;
  avatar_url: string | null;
  instagram: string | null;
}

export interface Cypher {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  genres: GenreKey[];
  organizer: { id: string; dancer_name: string; avatar: string; avatar_url: string | null; instagram: string | null };
  participant_count: number;
  max_members: number | null;
  status: string;
  description: string;
  hot: boolean;
  visibility: "public" | "private";
  requires_approval: boolean;
  studio_fee: number | null;
}

// NUMBER（振付作品）。CYPHERとほぼ同じ形だが、限定公開・参加承認制は持たない
export interface DanceNumber {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  genres: GenreKey[];
  organizer: { id: string; dancer_name: string; avatar: string; avatar_url: string | null; instagram: string | null };
  participant_count: number;
  max_members: number | null;
  description: string;
  hot: boolean;
  studio_fee: number | null;
  // 本番当日。連続していなくてもよい複数の日付（"YYYY-MM-DD"）を古い順に持つ
  performance_dates: string[];
  image_url: string | null;
  // 添付画像（複数枚）。1枚目がimage_url（カード表紙のサムネイル）と同じ画像になる
  image_urls: string[];
  // 募集期限（"YYYY-MM-DD"）。想定練習期間の終了とは別に、参加受付だけを先に締め切れる
  recruitment_deadline: string | null;
}

export interface PrivateLesson {
  id: string;
  // レッスンとイベントは同じテーブル・同じ参加まわりを使い、この列だけで見分ける
  kind: "lesson" | "event";
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  genres: GenreKey[];
  organizer: { id: string; dancer_name: string; avatar: string; avatar_url: string | null; instagram: string | null };
  participant_count: number;
  max_members: number | null;
  description: string;
  price: number | null;
  target_level: "all" | "beginner" | "intermediate" | "advanced";
  visibility: "public" | "private";
  requires_approval: boolean;
  image_url: string | null;
  // 添付画像（複数枚）。1枚目がimage_url（カード表紙のサムネイル）と同じ画像になる
  image_urls: string[];
  // JUDGE・DJ・MC（EVENTだけが持つ。LESSONは常に空配列）
  staff: EventStaffMember[];
}

export interface FormState {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  station: string;
  studio: string;
  genres: GenreKey[];
  description: string;
  max_members: string;
  payment: string[];
  studio_fee: string;
}

export interface ProfileState {
  dancer_name: string;
  genres: GenreKey[];
  instagram: string;
  dance_years: string;
  age_group: string;
  birth_year: string;
  gender: string;
  bio: string;
  playlist_url: string;
  team: string;
  account_type: "individual" | "organization";
  // プロフィールのアクセントカラー（自分で選んだテーマカラー）。空文字なら未設定＝得意ジャンルの色に自動フォールバック
  theme_color: string;
}

export interface ParticipantProfile {
  profile_id: string;
  dancer_name: string;
  avatar_url: string | null;
  genres: GenreKey[];
  instagram: string | null;
  dance_years: number | null;
  age_group: string | null;
  gender: string | null;
}
