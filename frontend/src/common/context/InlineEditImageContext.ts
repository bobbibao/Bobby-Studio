import { createContext, useContext } from 'react';

export type InlineEditImagePayload = {
  imageUrl: string;
  imageKey: string;
  dimensions?: string | null;
};

export type InlineEditImageHandler = (payload: InlineEditImagePayload) => boolean;

const InlineEditImageContext = createContext<InlineEditImageHandler | null>(null);

export const InlineEditImageProvider = InlineEditImageContext.Provider;

export const useInlineEditImage = () => {
  return useContext(InlineEditImageContext);
};

