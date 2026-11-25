"use client";

import Carousel from "@/components/ui/carousel";
import CategoryLink from "./CategoryLink";
import { useCategories } from "@/hook/useCategories";

export default function CategoryNav() {
  const { categories, loading, error } = useCategories();

  if (loading) return null;
  if (error) return <span>{error}</span>;

  return (
    <Carousel variant="categories">
      {categories.map((category, index) => (
        <CategoryLink
          key={category.id_gruposespecies}
          category={category}
          isFirst={index === 0}
        />
      ))}
    </Carousel>
  );
}
