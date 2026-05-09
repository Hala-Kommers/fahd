import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search, X, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/mockData";
import type { Product } from "@shared/schema";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const trendingSearches = ["سماعات", "ساعة ذكية", "شاحن", "باور بانك", "قيمنق"];

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const searchTerm = query.trim();
  const { data: results = [] } = useQuery<Product[]>({
    queryKey: [`/api/products?search=${encodeURIComponent(searchTerm)}`],
    enabled: searchTerm.length > 0,
  });

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
    }
  }, [open]);

  if (!open) return null;

  const handleSelect = (productId: number) => {
    navigate(`/product/${productId}`);
    onClose();
  };

  const handleTrendingClick = (term: string) => {
    setQuery(term);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-3 mb-4 animate-fade-in-up">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="وش تدوّر عليه؟ 🔍"
              className="pl-10 rounded-full bg-card border-card-border text-base min-h-[44px]"
              data-testid="input-search-overlay"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
            data-testid="button-search-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!query.trim() && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">الناس تدوّر على</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {trendingSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => handleTrendingClick(term)}
                  className="px-3 py-1.5 rounded-full bg-card border border-card-border text-sm hover-elevate min-h-[44px] active:scale-95 transition-transform"
                  data-testid={`trending-${term}`}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {query.trim() && (
          <div className="space-y-2 animate-fade-in">
            {results.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm" data-testid="text-search-empty">ما لقينا شي بـ "{query}" 😕 جرّب كلمة ثانية</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-3" data-testid="text-search-count">{results.length} نتيجة</p>
                {results.map((product, idx) => {
                  const p = product as any;
                  const displayImage = p.images?.find((img: any) => img?.isPrimary)?.url || p.images?.[0]?.url || p.image || "";
                  const displayPrice = p.pricing?.price ?? p.price ?? 0;
                  const displayOldPrice = p.pricing?.compareAt ?? p.oldPrice ?? null;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelect(product.id as any)}
                      className="w-full text-right animate-fade-in-up"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                      data-testid={`search-result-${product.id}`}
                    >
                      <Card className="rounded-xl p-3 border-card-border hover-elevate">
                        <div className="flex gap-3">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={product.title}
                              className="w-16 h-16 rounded-lg object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-2xl">📦</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold line-clamp-1">{product.title}</h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{product.descriptionShort || product.descriptionLong || ""}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="font-bold text-sm">{formatPrice(displayPrice)}</span>
                              {displayOldPrice && (
                                <span className="text-xs text-muted-foreground line-through">
                                  {formatPrice(displayOldPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
