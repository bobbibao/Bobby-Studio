import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { ConfigurationService } from '../profile-config/configuration.service';
import { UserService } from '../user/user.service';
import { PaymentService } from '../payment/payment.service';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { DEFAULT_USER_ROLE } from '../../config/roles.config';
import { vi } from 'date-fns/locale';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ConfigurationService))
    private readonly configurationService: ConfigurationService,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => VizpointService))
    private readonly vizpointService: VizpointService,
  ) {}

  async getRolesForUser(userId: string) {
    return this.prisma.role.findMany({
      where: { userId },
      // include: { permissions: true },
    });
  }

  async addRoleToUser(userId: string, roleId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: {
          connect: { id: roleId },
        },
      },
    });
  }

  async getRoleByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }

  async createUserRole(createRoleDto: CreateRoleDto) {
    const { name, userId, actions } = createRoleDto;

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const role = await this.prisma.role.create({
      data: {
        name,
        userId,
        actions: {
          connect: actions?.map((actionId) => ({ id: actionId })) || [],
        },
      },
      include: { actions: true },
    });

    return role;
  }

  async getUserDetails(userId: string) {
    // Get user and configuration
    const user = await this.userService.getById(userId);
    const configuration =
      await this.configurationService.getUserConfigurations(userId);

    // Fetch and validate subscription status
    let subscriptionData = null;
    let currentRole = user.role || DEFAULT_USER_ROLE;
    const vizpoints = await this.vizpointService.getUserVizPoints(userId);
    if (user.stripeCustomerId) {
      try {
        const subscription = await this.paymentService.getCurrent(
          userId,
          user.stripeCustomerId,
        );

        if (subscription) {
          // Get credit information

          subscriptionData = {
            id: subscription.id,
            userId: subscription.userId,
            status: subscription.status,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            nextRenewDate: subscription.nextRenewDate,
            amount: Math.round(subscription.amount * 100), // Convert to cents
            currency: subscription.currency,
            plan: subscription.plan,
            credit: vizpoints.subscriptionVizPoints + vizpoints.freeVizPoints,
            usedCredit: vizpoints.usedPaidCredit + vizpoints.usedFreeCredit,
            cancelDate: subscription.cancelDate,
            billingInterval: subscription.billingInterval,
          };

          // Validate and sync role with actual subscription
          const expectedRole = subscription.plan || DEFAULT_USER_ROLE;
          if (user.role !== expectedRole) {
            console.warn(
              `Role mismatch for user ${userId}: DB role=${user.role}, Subscription plan=${expectedRole}. Syncing...`,
            );
            await this.userService.changeUserRole(userId, expectedRole);
            currentRole = expectedRole;
          }
        } else {
          // No active subscription - ensure user has default role
          if (user.role !== DEFAULT_USER_ROLE) {
            console.warn(
              `No subscription found for user ${userId} but role is ${user.role}. Downgrading to ${DEFAULT_USER_ROLE}`,
            );
            await this.userService.changeUserRole(userId, DEFAULT_USER_ROLE);
            currentRole = DEFAULT_USER_ROLE;
          }
        }
      } catch (error) {
        console.error(`Error fetching subscription for user ${userId}:`, error);
        // On error, fall back to database role but log it
      }
    } else {
      // No Stripe customer - ensure default role
      if (user.role !== DEFAULT_USER_ROLE) {
        console.warn(
          `User ${userId} has no Stripe customer but role is ${user.role}. Downgrading to ${DEFAULT_USER_ROLE}`,
        );
        await this.userService.changeUserRole(userId, DEFAULT_USER_ROLE);
        currentRole = DEFAULT_USER_ROLE;
      }
    }

    return {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      emailVerified: user.emailVerified,
      role: currentRole,
      hasCompletedSurvey: !!user.surveyCompletedAt,
      configuration,
      language: user.language,
      subscription: subscriptionData,
      usedCredits: vizpoints.usedPaidCredit + vizpoints.usedFreeCredit,
      totalCredits: vizpoints.subscriptionVizPoints + vizpoints.freeVizPoints,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
    };
  }
}
