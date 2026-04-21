import { Logger, Module, forwardRef } from '@nestjs/common';
import { ImageController } from './image.controller';
import { ImageService } from './image.service';
import { GCSConnector } from 'src/connectors/gcs.connector';
import { AttributeModule } from '../attribute/attribute.module';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';

@Module({
  imports: [forwardRef(() => AttributeModule), forwardRef(() => UserModule), forwardRef(() => RoleModule)],
  controllers: [ImageController],
  providers: [
    ImageService,
    PrismaService,
    JwtService,
    GCSConnector,
    Logger,
  ],
  exports: [ImageService],
})
export class ImageModule {}
