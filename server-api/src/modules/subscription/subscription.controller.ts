import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Request,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Param,
  Req,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentService } from '../payment/payment.service';
import { CreateSubscriptionSessionDto } from '../payment/dtos/CreateSubscriptionSessionDto';
import { AuthGuard } from '../auth/auth.guard';
import { DEFAULT_USER_ROLE } from '../../config/roles.config';
import { UserService } from '../user/user.service';
import { CreateSubscriptionDto } from './dtos/CreateSubscriptionDto';
import {
  SubscriptionResponseDto,
  SubscriptionResponseDtoV2,
} from './dtos/SubscriptionResponseDto';
import { PaymentPricingResponseDTO } from '../payment/dtos/PaymentPricingResponse.dto';
import Stripe from 'stripe';
import { VizpointService } from '../vizpoint/vizpoint.service';
import { UpdateSubscriptionDto } from './dtos/UpdateSubscriptionDto';
import { UpgradeSubscriptionResponseDto } from './dtos/UpgradeSubscriptionResponseDto';

@Controller('subscription')
@UseGuards(AuthGuard)
export class SubscriptionController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly userService: UserService,
    private readonly vizpointService: VizpointService,
  ) {}

  @Get('/prices')
  async getData(@Request() req): Promise<{
    monthly: PaymentPricingResponseDTO[];
    yearly: PaymentPricingResponseDTO[];
  }> {
    if (!req.currentUser || !req.currentUser.id) {
      throw new BadRequestException('Invalid user request.');
    }
    const userId = req.currentUser.id;
    let user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // sync stripe id
    if (!user.stripeCustomerId) {
      const customer = await this.paymentService.createUserWithStripe(
        user.email,
      );
      if (!customer || !customer.id) {
        throw new InternalServerErrorException(
          'Failed to create Stripe customer.',
        );
      }

      const updateResult = await this.userService.updateStripeCustomerId(
        userId,
        customer.id,
      );
      if (!updateResult) {
        throw new InternalServerErrorException(
          'Failed to update Stripe customer ID.',
        );
      }
      // refresh user
      user = await this.userService.getById(userId);
    }

    // const currentRole = req.currentUser?.role || DEFAULT_USER_ROLE;
    const currentSubscription = await this.paymentService.getCurrent(
      userId,
      user.stripeCustomerId,
    );
    const currentPriceId = currentSubscription?.priceId ?? null;
    return await this.paymentService.getPrices(currentPriceId);
  }

  @Post('/create-subscription-session')
  async createPaymentMethod(
    @Request() req,
    @Body() data: CreateSubscriptionSessionDto,
  ) {
    try {
      if (!req.currentUser || !req.currentUser.id) {
        throw new BadRequestException('Invalid user request.');
      }

      const userId = req.currentUser.id;
      let user = await this.userService.getById(userId);

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      if (!user.stripeCustomerId) {
        const customer = await this.paymentService.createUserWithStripe(
          user.email,
        );
        if (!customer || !customer.id) {
          throw new InternalServerErrorException(
            'Failed to create Stripe customer.',
          );
        }

        const updateResult = await this.userService.updateStripeCustomerId(
          userId,
          customer.id,
        );
        if (!updateResult) {
          throw new InternalServerErrorException(
            'Failed to update Stripe customer ID.',
          );
        }

        // refresh user
        user = await this.userService.getById(userId);
      }

      return await this.paymentService.createSubscriptionSession(user, data);
    } catch (error) {
      console.error('Error in createPaymentMethod:', error);
      throw new InternalServerErrorException(
        error.message || 'Something went wrong.',
      );
    }
  }

  @Post('attach-stripe')
  async attachStripeCustomerToUser(@Request() req) {
    try {
      const userId = req.currentUser.id;
      const user = await this.userService.getById(userId);
      if (user.stripeCustomerId) {
        return { success: true, customerId: user.stripeCustomerId };
      }
      const customer = await this.paymentService.createUserWithStripe(
        user.email,
      );
      await this.userService.updateStripeCustomerId(userId, customer.id);
      return { success: true, customerId: customer.id };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get('check-payment-method')
  async checkPaymentMethod(@Query('customerId') customerId: string) {
    const defaultPaymentMethod =
      await this.paymentService.checkUserHasPaymentMethod(customerId);

    return {
      customerId,
      defaultPaymentMethod,
    };
  }

  @Post('create-stripe-subscriptions')
  async createSubscription(
    @Request() req,
    @Body() body: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    const userId = req.currentUser.id;
    if (!userId) {
      throw new BadRequestException('User is not authenticated');
    }
    const user = await this.userService.getById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have a Stripe Customer ID');
    }
    const stripeCustomerId = user.stripeCustomerId;
    const { paymentMethodId, priceId } = body;
    return this.paymentService.createSubscription(
      userId,
      stripeCustomerId,
      paymentMethodId,
      priceId,
    );
  }

  @Get('prices/:priceId')
  async getPrice(@Param('priceId') priceId: string): Promise<Stripe.Price> {
    return this.paymentService.getPriceDetails(priceId);
  }

  @Get('billing-history')
  async getBillingHistory(
    @Req() req,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const userId = req.currentUser.id;
    const user = await this.userService.getById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have Stripe customer ID');
    }
    return this.paymentService.getBillingHistory(
      userId,
      user.stripeCustomerId,
      Number(page) || 1,
      Number(pageSize) || 10,
    );
  }

  @Get('/current')
  async getCurrentSubscription(
    @Request() req,
  ): Promise<SubscriptionResponseDtoV2> {
    const userId = req.currentUser.id;
    let user = await this.userService.getById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have Stripe customer ID');
    }
    // sync stripe id
    if (!user.stripeCustomerId) {
      const customer = await this.paymentService.createUserWithStripe(
        user.email,
      );
      if (!customer || !customer.id) {
        throw new InternalServerErrorException(
          'Failed to create Stripe customer.',
        );
      }

      const updateResult = await this.userService.updateStripeCustomerId(
        userId,
        customer.id,
      );
      if (!updateResult) {
        throw new InternalServerErrorException(
          'Failed to update Stripe customer ID.',
        );
      }
      // refresh user
      user = await this.userService.getById(userId);
    }
    // const subscription = await this.subscriptionService.getCurrent(userId, stripeCustomerId);
    const subscription = await this.paymentService.getCurrent(
      userId,
      user.stripeCustomerId,
    );
    if (!subscription) {
      throw new BadRequestException('Subscription not found');
    }
    const vizpoints = await this.vizpointService.getUserVizPoints(userId);
    const data = new SubscriptionResponseDtoV2(subscription);
    data.credit = vizpoints.subscriptionVizPoints + vizpoints.freeVizPoints;
    data.usedCredit = vizpoints.usedPaidCredit + vizpoints.usedFreeCredit;
    return data;
  }

  @Post('cancel')
  async cancelSubscription(@Request() req) {
    const userId = req.currentUser.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const user = await this.userService.getById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have Stripe customer ID');
    }
    const currentSubscription = await this.paymentService.getCurrent(
      userId,
      user.stripeCustomerId,
    );
    if (!currentSubscription || !currentSubscription.id) {
      throw new BadRequestException(
        'User does not have an active subscription',
      );
    }
    const cancelResult =
      await this.paymentService.cancelSubscriptionImmediately(
        currentSubscription.id,
      );
    await this.userService.changeUserRole(userId, DEFAULT_USER_ROLE);
    // await this.subscriptionService.cancelSubscription(currentSubscription.id);
    // await this.userService.changeUserRole(userId, DEFAULT_USER_ROLE);
    return {
      success: true,
      status: cancelResult.subscription.status,
      cancel_at_period_end: cancelResult.subscription.cancel_at_period_end,
      current_period_end: cancelResult.subscription.current_period_end,
    };
  }

  @Post('upgrade')
  async updateSubscriptionPlan(
    @Request() req,
    @Body() body: UpdateSubscriptionDto,
  ): Promise<UpgradeSubscriptionResponseDto> {
    const userId = req.currentUser.id;
    const { priceId } = body;
    // const newPlan = this.paymentService.getPlanFromPrice(priceId);
    const user = await this.userService.getById(userId);
    if (!user || !user.stripeCustomerId) {
      throw new BadRequestException('User does not have Stripe customer ID');
    }

    const currentSubscription = await this.paymentService.getCurrent(userId, user.stripeCustomerId);
    
    if (!currentSubscription || !currentSubscription.id) {
      throw new BadRequestException('No active subscription found');
    }

    // await this.userService.changeUserRole(userId, newPlan); // Already changed in Stripe Service

    // Update subscription on Stripe
    const upgradeSubscriptionResponseDto =
      await this.paymentService.updateSubscriptionPlan(
        currentSubscription.id,
        priceId,
      );

    return upgradeSubscriptionResponseDto;
  }
}
