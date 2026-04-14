const baseURL = import.meta.env.VITE_BOBBY_BE_API;

const imageUtils = {
  getImageUrl(key: string, thumbnail: boolean, format: string): string {
    return `${baseURL}/images/${key}?thumbnail=${thumbnail}&format=${format}`;
  },
};

export default imageUtils;

