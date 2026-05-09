import { Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFahd } from "@/lib/fahd-store";
import { useState } from "react";
import { useLocation } from "wouter";
import SearchOverlay from "./SearchOverlay";

interface HeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export default function Header({ onSearch, showSearch = false }: HeaderProps) {
  const { cartItems } = useFahd();
  const [searchOpen, setSearchOpen] = useState(false);
  const [, navigate] = useLocation();

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 cursor-pointer"
              data-testid="link-home"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center">
                <span className="text-sm font-bold text-[#1a2e05]">ف</span>
              </div>
              <span className="text-xl font-bold text-foreground">فهد</span>
            </button>

            <div className="flex items-center gap-1">
              {showSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchOpen(true)}
                  data-testid="button-search-toggle"
                >
                  <Search className="w-5 h-5" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate("/cart")}
                data-testid="button-cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-[10px] px-1 rounded-full"
                  >
                    {totalItems}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <SearchOverlay
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          onSearch?.("");
        }}
      />
    </>
  );
}
