export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  persona: "doctor" | "rafiq";
  createdAt: Date;
  updatedAt: Date;
}

export type Theme = "night" | "day";
export type FontSize = "small" | "medium" | "large";
