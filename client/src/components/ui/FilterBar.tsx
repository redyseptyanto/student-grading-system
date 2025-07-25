import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  
  filters: Array<{
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
    icon?: ReactNode;
  }>;
  
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount?: number;
  totalCount?: number;
  itemName?: string;
}

export default function FilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  totalCount,
  itemName = "items"
}: FilterBarProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search and Filters in one row */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Field */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters */}
            {filters.map((filter) => (
              <div key={filter.id} className="flex items-center gap-2">
                {filter.icon && filter.icon}
                <Select value={filter.value} onValueChange={filter.onChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={filter.placeholder || filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    {filter.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}

            {/* Result Count */}
            {(resultCount !== undefined && totalCount !== undefined) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 ml-auto">
                <Filter className="h-4 w-4" />
                <span>
                  {resultCount} of {totalCount} {itemName}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}