import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { UserModule } from '../user/user.module';
import { AttributeModule } from '../attribute/attribute.module';

@Module({
  imports: [UserModule, AttributeModule],
  controllers: [AdminController],
})
export class AdminModule {}
