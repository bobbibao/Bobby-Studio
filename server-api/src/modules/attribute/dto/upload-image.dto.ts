export class UploadImageDto {
  userId: string;
  images: Express.Multer.File[]; // Array of images
} 