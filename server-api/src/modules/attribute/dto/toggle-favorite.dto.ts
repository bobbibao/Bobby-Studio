export class ToggleFavoriteDto {
  attributeId: string;
  version: string;
}

export function isToggleFavoriteDto(obj: any): obj is ToggleFavoriteDto {
  return (
    typeof obj?.attributeId === "string" &&
    typeof obj?.version === "string"
  );
}