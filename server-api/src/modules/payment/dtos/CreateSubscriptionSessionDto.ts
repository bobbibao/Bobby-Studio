import { IsString, IsNotEmpty } from 'class-validator';

export class CreateSubscriptionSessionDto {
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
