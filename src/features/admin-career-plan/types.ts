import type { UserSearchResult } from "@/services/usersApi";

export interface CareerAssignmentFormData {
  selectedUser: UserSearchResult | null;
  careerPlanId: string;
  percentage: string;
}

export interface UserSearchCardProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchResults: UserSearchResult[];
  isSearching: boolean;
  selectedUser: UserSearchResult | null;
  onSelectUser: (user: UserSearchResult) => void;
  disabled?: boolean;
  hideResultsWhenSelected?: boolean;
  selectedItemClassName?: string;
}

export interface CareerAssignmentCardProps {
  selectedUser: UserSearchResult | null;
  careerPlanId: string;
  percentage: string;
  onCareerPlanIdChange: (value: string) => void;
  onPercentageChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
  isSubmitting: boolean;
}
