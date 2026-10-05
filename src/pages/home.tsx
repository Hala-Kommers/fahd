import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, SlidersHorizontal, ChevronDown, X, Headphones, Watch, Gem, Briefcase, Camera, Gamepad2, Lightbulb, LayoutGrid, Sparkles, Leaf, Gift, Paintbrush } from "lucide-react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@shared/schema";

const iconMap: Record<string, any> = {
  Sparkles,
  Leaf,
  Gift,
  Paintbrush,
  Headphones,
  Watch,
  Gem,
  Briefcase,
  Camera,
  Gamepad2,
  Lightbulb,
};

type SortOption = "price_asc" | "price_desc" | "title_asc" | "updated_desc";

const sortLabels: Record<SortOption, string> = {
  price_asc: "السعر: من الأقل",
  price_desc: "السعر: من الأعلى",
  title_asc: "الاسم: أ-ي",
  updated_desc: "الأحدث تحديثاً",
};

type UiCategory = Category & { slug?: string; filterValue: string };

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("الكل");
  const [sortBy, setSortBy] = useState<SortOption>("updated_desc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [, navigate] = useLocation();

  const queryParams = new URLSearchParams();
  if (activeCategory !== "الكل") queryParams.set("category", activeCategory);
  if (sortBy) queryParams.set("sort", sortBy);
  if (searchQuery) queryParams.set("search", searchQuery);
  if (priceRange[0] > 0) queryParams.set("minPrice", String(priceRange[0]));
  if (priceRange[1] < 2000) queryParams.set("maxPrice", String(priceRange[1]));

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/products?${queryParams.toString()}`],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const allCategories: UiCategory[] = [
    { id: "all", slug: "all", name: "الكل", icon: "LayoutGrid", count: 0, filterValue: "الكل" },
    ...categories.map((cat) => ({
      ...cat,
      filterValue: cat.slug || cat.id,
    })),
  ];
  const activeCategoryLabel = allCategories.find((cat) => cat.filterValue === activeCategory)?.name || activeCategory;

  const clearFilters = () => {
    setActiveCategory("الكل");
    setSortBy("updated_desc");
    setPriceRange([0, 2000]);
    setSearchQuery("");
  };

  const hasActiveFilters = activeCategory !== "الكل" || sortBy !== "updated_desc" || priceRange[0] > 0 || priceRange[1] < 2000;

  return (
    <div className="min-h-screen bg-background">
      <Header onSearch={setSearchQuery} showSearch />

      <main className="max-w-7xl mx-auto px-4 pb-24">
        <div className="py-6">
          <Card className="animate-fade-in-up overflow-hidden rounded-[24px] border-0 relative bg-gradient-to-bl from-[#e8f5d4] via-[#f0f9e8] to-[#dff0d0] dark:from-[#1a2e10] dark:via-[#1e3315] dark:to-[#152a0c] p-6 md:p-8">
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#CDEB63] to-[#a8d94a] flex items-center justify-center mb-4 shadow-lg">
                <span className="text-2xl font-bold text-[#1a2e05]">ف</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 leading-tight">
                يالله نبدأ..
                <br />
                وش تبي تشتري؟ 🛒
              </h1>
              <p className="text-muted-foreground text-sm md:text-base mb-5 max-w-md">
                تسوّق براحتك وفهد معك خطوة بخطوة — من الاختيار للتوصيل لين باب بيتك!
              </p>
              <Button
                className="rounded-xl bg-[#CDEB63] text-[#1a2e05] border-[#b8d44e] font-semibold px-6 min-h-[44px]"
                onClick={() => {
                  const el = document.getElementById("products-grid");
                  el?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid="button-start-shopping"
              >
                يالله نتسوق
              </Button>
            </div>
            <div className="absolute left-0 bottom-0 w-40 h-40 bg-[#CDEB63]/10 rounded-full blur-3xl animate-float" />
            <div className="absolute right-10 top-0 w-24 h-24 bg-[#CDEB63]/15 rounded-full blur-2xl animate-float" style={{ animationDelay: "1.5s" }} />
          </Card>
        </div>

        <div className="mb-4 overflow-x-auto scrollbar-hide -mx-4 px-4 animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="flex gap-2 min-w-max">
            {allCategories.map((cat, idx) => {
              const IconComp = cat.icon === "LayoutGrid" ? LayoutGrid : iconMap[cat.icon] || LayoutGrid;
              const isActive = activeCategory === cat.filterValue;
              return (
                <button
                  key={cat.filterValue}
                  onClick={() => setActiveCategory(cat.filterValue)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap min-h-[44px] active:scale-95 ${isActive
                      ? "bg-[#CDEB63] text-[#1a2e05]"
                      : "bg-card border border-card-border text-foreground"
                    }`}
                  style={{ animationDelay: `${idx * 0.04}s` }}
                  data-testid={`category-${cat.filterValue}`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{cat.name}</span>
                  {cat.count > 0 && (
                    <span className={`text-[10px] ${isActive ? "text-[#1a2e05]/60" : "text-muted-foreground"}`}>
                      ({cat.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div id="products-grid">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <h2 className="text-lg font-bold text-foreground">
              {searchQuery ? `نتائج البحث "${searchQuery}"` : activeCategory !== "الكل" ? activeCategoryLabel : "المنتجات"}
              {!isLoading && (
                <span className="text-sm font-normal text-muted-foreground mr-2">
                  ({products.length})
                </span>
              )}
            </h2>

            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground gap-1 min-h-[44px]"
                  data-testid="button-clear-filters"
                >
                  <X className="w-3 h-3" />
                  مسح الفلاتر
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowFilters(false); }}
                  className="text-xs gap-1 min-h-[44px]"
                  data-testid="button-sort"
                >
                  <ChevronDown className="w-3 h-3" />
                  {sortLabels[sortBy]}
                </Button>
                {showSortMenu && (
                  <div className="absolute top-full right-0 mt-1 z-30 bg-card border border-card-border rounded-xl shadow-lg p-1 min-w-[160px] animate-scale-in origin-top-right">
                    {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                        className={`w-full text-right text-sm px-3 py-2 rounded-lg hover-elevate min-h-[44px] ${sortBy === key ? "bg-[#CDEB63]/15 font-semibold" : ""
                          }`}
                        data-testid={`sort-${key}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowFilters(!showFilters); setShowSortMenu(false); }}
                className="text-xs gap-1 min-h-[44px]"
                data-testid="button-filter"
              >
                <SlidersHorizontal className="w-3 h-3" />
                فلترة
              </Button>
            </div>
          </div>

          {showFilters && (
            <Card className="rounded-xl p-4 mb-4 border-card-border animate-fade-in-up">
              <h3 className="text-sm font-semibold mb-3">نطاق السعر (ر.س)</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">من</label>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[44px]"
                    min={0}
                    max={priceRange[1]}
                    data-testid="input-price-min"
                  />
                </div>
                <span className="text-muted-foreground mt-5">-</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">إلى</label>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm min-h-[44px]"
                    min={priceRange[0]}
                    data-testid="input-price-max"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {[
                  { label: "أقل من 200", range: [0, 200] as [number, number] },
                  { label: "200 - 500", range: [200, 500] as [number, number] },
                  { label: "500 - 1000", range: [500, 1000] as [number, number] },
                  { label: "أكثر من 1000", range: [1000, 2000] as [number, number] },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPriceRange(preset.range)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all min-h-[44px] active:scale-95 ${priceRange[0] === preset.range[0] && priceRange[1] === preset.range[1]
                        ? "bg-[#CDEB63]/15 border-[#CDEB63]/40 font-semibold"
                        : "border-border"
                      }`}
                    data-testid={`price-preset-${preset.label}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="rounded-[20px] p-0 overflow-hidden">
                  <Skeleton className="aspect-square w-full" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <p className="text-muted-foreground mb-3">ما لقينا شي يطابق بحثك 😅 جرّب كلمة ثانية!</p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="text-sm min-h-[44px]" data-testid="button-clear-empty">
                  امسح الفلاتر وورّني الكل
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product, idx) => (
                <div
                  key={product.id}
                  style={{ animationDelay: `${idx * 0.06}s` }}
                  className="animate-fade-in-up"
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showSortMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />
      )}

      <button
        onClick={() => navigate("/chat")}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-[#CDEB63] text-[#1a2e05] px-5 py-3 rounded-full font-semibold text-sm animate-pulse-soft min-h-[44px]"
        data-testid="button-chat-float"
      >
        <MessageCircle className="w-5 h-5" />
        <span>كلّم فهد</span>
      </button>
    </div>
  );
}
