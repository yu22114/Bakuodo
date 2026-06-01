export type GenreKey =
  | "Breaking"
  | "Popping"
  | "Locking"
  | "Waacking"
  | "House"
  | "Krump"
  | "Hip-Hop"
  | "All Style";

export interface Cypher {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  genres: GenreKey[];
  organizer: { id: string; dancer_name: string; avatar: string; avatar_url: string | null };
  participant_count: number;
  max_members: number | null;
  status: string;
  description: string;
  hot: boolean;
  visibility: "public" | "private";
  requires_approval: boolean;
}

export interface PrivateLesson {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string;
  genres: GenreKey[];
  organizer: { id: string; dancer_name: string; avatar: string; avatar_url: string | null };
  participant_count: number;
  max_members: number | null;
  description: string;
  price: number | null;
  target_level: "all" | "beginner" | "intermediate" | "advanced";
  visibility: "public" | "private";
  requires_approval: boolean;
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
}

export interface ProfileState {
  dancer_name: string;
  genres: GenreKey[];
  instagram: string;
  dance_years: string;
  age_group: string;
  gender: string;
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
