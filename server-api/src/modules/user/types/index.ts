export enum ProfileType {
    PERSONAL = 'PERSONAL',
    COMPANY = 'COMPANY'
  }
  
  // export interface BaseProfile {
  //   id: string;
  //   email: string;
  //   password: string;
  //   profileType: ProfileType;
  //   isVerified: boolean;
  //   createdAt: Date;
  //   updatedAt: Date;
  // }
  
  // export interface PersonalProfile extends BaseProfile {
  //   name: string;
  //   gender: string;
  //   phoneNumber: string;
  //   address: string;
  //   country: string;
  //   avatar?: Buffer;
  // }
  
  // export interface CompanyProfile extends BaseProfile {
  //   companyName: string;
  //   businessType: string;
  //   registrationNumber: string;
  //   taxId: string;
  //   companyAddress: string;
  //   companyPhone: string;
  //   companyEmail: string;
  //   website?: string;
  //   logo?: Buffer;
  // }
  

  export interface UserWithPermissions {
  id: string;
  roles: {
    permissions: {
      name: string;
    }[];
  }[];
  permissions: {
    name: string;
  }[];
}
