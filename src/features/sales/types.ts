export interface SalesFiltersCardProps {
  searchTerm: string;
  gateway: string;
  status?: string;
  onSearchTermChange: (value: string) => void;
  onGatewayChange: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onClearFilters: () => void;
  compact?: boolean;
  showStatusFilter?: boolean;
}
