import { Module, forwardRef } from '@nestjs/common';
import { PolicyService } from '../policy/policy.service';
import { ConfigurationService } from '../profile-config/configuration.service';
import { PolicyRepository } from '../policy/policy.repository';
import { ConfigurationRepository } from '../profile-config/configuration.repository';
import { UserAttributeService } from './user-attribute.service';
import { UserAttributeRepository } from './user-attribute.repository';
import { AttributeController } from './attribute.controller';
import { AttributeService } from './attribute.service';
import { AttributeRepository } from './attribute.repository';
import { ProjectController } from '../project/project.controller';
import { ProjectService } from '../project/project.service';
import { ProjectRepository } from '../project/project.repository';
import { HttpModule } from '@nestjs/axios';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { VizpointModule } from '../vizpoint/vizpoint.module';
import { TeamModule } from '../team/team.module';
import { FeedbackController } from '../feedback/feedback.controller';
import { FeedbackService } from '../feedback/feedback.service';
import { FeedbackRepository } from '../feedback/feedback.repository';
import { BookmarkRepository } from '../bookmark/bookmark.repository';
import { FavoriteRepository } from '../favorite/favorite.repository';
import { GCSConnector } from '../../connectors/gcs.connector';
import { RedisService } from 'src/shared/services/redis.service';
import { UserModule } from '../user/user.module';
import { RoleModule } from '../role/role.module';
import { EntitlementModule } from '../entitlement/entitlement.module';

@Module({
  imports: [HttpModule, VizpointModule, TeamModule, forwardRef(() => UserModule), forwardRef(() => RoleModule), EntitlementModule],
  providers: [
    PolicyService,
    ConfigurationService,
    PolicyRepository,
    RedisService,
    ConfigurationRepository,
    UserAttributeService,
    UserAttributeRepository,
    AttributeService,
    AttributeRepository,
    ProjectService,
    ProjectRepository,
    FeedbackService,
    FeedbackRepository,
    BookmarkRepository,
    FavoriteRepository,
    GCSConnector,
  ],
  controllers: [
    AttributeController,
    ProjectController,
    FeedbackController,
  ],
  exports: [
    ConfigurationService,
    UserAttributeService,
    AttributeService,
    AttributeRepository,
    BookmarkRepository,
    FavoriteRepository,
    GCSConnector,
  ],
})
export class AttributeModule {}
