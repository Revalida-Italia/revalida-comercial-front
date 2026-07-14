export interface SalesFiltersCardProps {
  searchTerm: string;
  gateway: string;
  onSearchTermChange: (value: string) => void;
  onGatewayChange: (value: string) => void;
  onClearFilters: () => void;
  compact?: boolean;
}
