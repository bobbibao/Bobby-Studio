export interface PrivacySettingsDto {
  dataProcessing: boolean;
  newsletter: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface PrivacySettingsResponseDto extends PrivacySettingsDto {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

