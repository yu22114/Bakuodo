export type GenreKey = "Breaking" | "Popping" | "Locking" | "Waacking" | "Voguing" | "House" | "Krump" | "Hip-Hop";

export interface Cypher {
  id: string;
  title: string;
  starts_at: string;
  location: string;
  genres: GenreKey[];
  organizer: { dancer_name: string; avatar: string };
  participant_count: number;
  max_members: number | null;
  status: string;
  description: string;
  hot: boolean;
}

export interface FormState {
  title: string;
  date: string;
  time: string;
  location: string;
  genres: GenreKey[];
  description: string;
  max_members: string;
}

export interface ProfileState {
  dancer_name: string;
  genres: GenreKey[];
}
