import {
  Controller,
  Get,
  Param,
  Put,
  Delete,
  Body,
  UseGuards,
  Post,
  UseInterceptors,
  UploadedFiles,
  Request,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CompanyProfileDTO, PersonalProfileDTO, Survey, Step } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserProfileDTO } from './dto';
import {
  AttributeVersion,
  CompanyProfile,
  PersonalProfile,
  UserAttribute,
} from '@prisma/client';
import { ProfileType } from './types';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AttributeService } from '../attribute/attribute.service';
import {
  ActionEntity,
  AttributeEntity,
  OriginalImageAttributeEntity,
} from '../attribute/dto/common.dto';
import { AttributeTypeEnum } from '../../constant/attribute-type.enum';
import { UserAttributesDto } from '../attribute/dto/user-attribute.dto';
import { UserAttributeService } from '../attribute/user-attribute.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly attributeService: AttributeService,
    private readonly userAttributeService: UserAttributeService,
  ) {}

  @Get('/profile')
  @UseGuards(AuthGuard)
  async getUserProfileById(
    @Request() req,
  ): Promise<PersonalProfile & { language: string }> {
    const userId = req.currentUser.id;
    const { profileType } = await this.userService.getById(userId);
    const user = await this.userService.getById(userId);
    const profile = await this.userService.getPersonalProfile(userId);
    return {
      ...profile,
      language: user.language, // Thêm field language vào
    };
  }

  @Get('/company')
  @UseGuards(AuthGuard)
  async getCompanyProfileById(@Request() req): Promise<CompanyProfile> {
    const userId = req.currentUser.id;
    const { profileType } = await this.userService.getById(userId);
    const data = await this.userService.getCompanyProfile(userId);
    return data;
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Request() req,
    @Body() updateUserProfileDto: PersonalProfileDTO,
  ) {
    
    const userId = req.currentUser.id;
    const { profileType } = await this.userService.getById(userId);
    const { language, ...data } = updateUserProfileDto;
    // update user language:
    if (language) {
      await this.userService.updateUserLanguage(userId, language);
    }
    // update personal profile
    const checkExists =
      await this.userService.checkPersonalProfileExists(userId);

    const userProfile: UserProfileDTO<PersonalProfileDTO> = {
      userId: userId,
      profileType: profileType as ProfileType,
      profile: data as PersonalProfileDTO,
    };
    if (checkExists) {
      return await this.userService.updatePersonalProfile(userProfile);
    }
    return await this.userService.createPersonalProfile(userProfile);
  }

  @Delete('profile')
  @UseGuards(AuthGuard)
  @ApiResponse({ status: 200, description: 'User delete successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async deleteProfile(
    @Request() req
  ) {
      const userId = req.currentUser.id;
      await this.userService.softDeleteUser(userId);
      return {
    message: 'User deleted successfully',
  };
  }

  @Put('company')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async updateCompanyProfile(
    @Request() req,
    @Body() updateUserProfileDto: CompanyProfileDTO,
  ) {
    const userId = req.currentUser.id;
    const checkExists =
      await this.userService.checkCompanyProfileExists(userId);
    const userProfile: UserProfileDTO<CompanyProfileDTO> = {
      userId: userId,
      profileType: ProfileType.COMPANY,
      profile: updateUserProfileDto as CompanyProfileDTO,
    };
    if (checkExists) {
      return await this.userService.updateCompanyProfile(userProfile);
    }
    return await this.userService.createCompanyProfile(userProfile);
  }

  @Post('profile')
  @ApiOperation({ summary: 'Create user profile' })
  @ApiResponse({ status: 201, description: 'Profile created successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async createProfile(
    @Body()
    createUserProfileDTO: UserProfileDTO<
      PersonalProfileDTO | CompanyProfileDTO
    >,
  ) {
    const { profileType, userId, profile } = createUserProfileDTO;
    if (profileType === ProfileType.PERSONAL) {
      const userProfile: UserProfileDTO<PersonalProfileDTO> = {
        userId,
        profileType,
        profile: profile as PersonalProfileDTO,
      };
      return this.userService.createPersonalProfile(userProfile);
    }
    const userProfile: UserProfileDTO<CompanyProfileDTO> = {
      userId,
      profileType,
      profile: profile as CompanyProfileDTO,
    };
    return this.userService.createCompanyProfile(userProfile);
  }

  // @Post(':id/upload-avatar')
  // @UseInterceptors(FilesInterceptor('images')) // 'images' is the field name in the form
  // async uploadPictureProfile(
  //   @UploadedFiles() images: Express.Multer.File[],
  //   @Param('id') id: string
  // ): Promise<UserAttribute> {
  //   // upload to S3
  //   const results: S3.ManagedUpload.SendData[] =
  //     await this.attributeService.uploadImages(images);
  //   // build attributes payload
  //   const attributes: AttributeEntity<
  //     OriginalImageAttributeEntity,
  //     ActionEntity
  //   >[] = results.map((r) => {
  //     const { Location, Key } = r;
  //     const image: OriginalImageAttributeEntity = {
  //       key: Key,
  //       path: Location,
  //     };
  //     const action: ActionEntity = {};
  //     const attr: AttributeEntity<OriginalImageAttributeEntity, ActionEntity> =
  //       {
  //         type: AttributeTypeEnum.PICTURE_PROFILE,
  //         value: image,
  //         actions: action,
  //       };
  //     return attr;
  //   });
  //   // save to DB
  //   const data: AttributeVersion[] =
  //     await this.attributeService.upsertAttributes(id, attributes);
  //   const userAttributes: UserAttributesDto[] = data.map((a) => {
  //     const userAttribute: UserAttributesDto = {
  //       userId: id,
  //       attributeId: a.id,
  //     };
  //     return userAttribute;
  //   });
  //   const [userAttr] = await this.userAttributeService.assignAttributesToUser(
  //     userAttributes
  //   );
  //   return userAttr;
  // }

  @Get('/active')
  @UseGuards(AuthGuard)
  async isUserActive(
    @Request() req,
  ): Promise< { isActive: boolean }> {
    const userId = req.currentUser.id;
    const isActive = await this.userService.isUserActive(userId)
    return {
      isActive:isActive
    };
  }

  @Put('email-verify')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Verify user email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async verifyEmail(@Request() req, @Res() res) {
    const user = req.currentUser;
    const userId = user.id;
    try{
      if(user.emailVerified === true){
        await this.userService.updateEmailVerified(userId, true);
        return res.status(200).json({ message: 'Email have been verified.' });
      }
      return res.status(400).json({ message: 'Email is not verified yet.' });
    } catch(error:any){
      const msg = error?.message || 'Failed to send verification email';
      return res.status(500).json({ message: msg });
    }
  }

}
