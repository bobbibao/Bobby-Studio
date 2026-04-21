import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import UploadService from './upload.service';
import { GCSConnector } from '../../connectors/gcs.connector';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';

@Module({
  imports: [ConfigModule,UserModule],
  controllers: [UploadController],
  providers: [UploadService, GCSConnector],
})
export class UploadModule {}
