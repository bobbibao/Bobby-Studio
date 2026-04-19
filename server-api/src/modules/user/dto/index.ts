import { ProfileType } from '../types';
import { IsString, IsOptional } from 'class-validator';

export class PersonalProfileDTO {
  @IsOptional()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  jobTitle: string;

  @IsOptional()
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  pictureProfile: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;


  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;
}



export class CompanyProfileDTO {
  name: string;
  type: string;
  size: number;
  email: string;
  website: string;
  country: string;
  postalCode: string;
  city: string;
  state: string;
  streetAddress: string;
  pictureProfile: string;
  vatNumber: string;
  businessRegistrationNumber: string;
  companyDescription: string;
  billingContactName: string;
  billingEmailAddress: string;
  billingAddress: string;
}

export class CreateUserDTO {
  email: string;
  password: string;
  freeCreditRenewalAt?: Date;

  constructor() {
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);
    this.freeCreditRenewalAt = renewalDate;
  }
}

export class CreateNewUserDTO extends CreateUserDTO {
  id: string;
  role: string;
  emailVerified?: boolean;
}

export class UserProfileDTO<P> {
  userId: string;
  profileType: ProfileType;
  profile: P
}

export class Survey<S> {
  step: S[]
}

export class Step {
  question: string;
  answers: string[];
  selectedAnswers: string[];
  correctAnswers?: string[]
}
