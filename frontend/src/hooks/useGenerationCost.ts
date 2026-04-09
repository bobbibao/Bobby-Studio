import { useMemo } from 'react';
import { ModelCatalogItem } from '@/types/modelCatalog';
import { CircuitBoard } from 'lucide-react';

interface UseGenerationCostParams {
  modelCatalog: ModelCatalogItem[];
  selectedModels: string[];
  resolution: string;
  imageCount?: number;
}

export const useGenerationCost = ({
  modelCatalog,
  selectedModels,
  resolution,
  imageCount = 1,
}: UseGenerationCostParams) => {
  const totalCredits = useMemo(() => {
    if (!modelCatalog.length || !selectedModels.length) return 0;

    // Create a map of model.id -> pricing
    const pricingMap = new Map<string, Record<string, number>>();
    modelCatalog.forEach((model) => {
      if (model.pricing) {
        pricingMap.set(model.id, model.pricing as Record<string, number>);
      }
    });

    // Calculate total credits for selected models
    let credits = 0;
    selectedModels.forEach((modelId) => {
      const pricing = pricingMap.get(modelId);
      if (pricing) {
        // Try to find exact match (e.g., '1K', '2K', '4K')
        const resolutionKey = resolution.toUpperCase();
        let creditValue = pricing[resolutionKey];
        // If no exact match, fallback to first available pricing
        if (creditValue === undefined) {
          const pricingKeys = Object.keys(pricing);
          creditValue = pricingKeys.length > 0 ? pricing[pricingKeys[0]] : 0;
        }
        credits += creditValue || 0;
      }
    });

    // Multiply by image count
    return credits * imageCount;
  }, [modelCatalog, selectedModels, resolution, imageCount]);

  return {
    totalCredits,
  };
};


