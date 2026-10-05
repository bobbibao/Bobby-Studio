import { forwardRef, useImperativeHandle } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import * as subscriptionAPI from '@/features/user';

interface StripeCardFormProps {
  priceId: string;
  onSubmit: () => void;
}
export interface StripeCardFormRef {
  triggerSubmit: () => void; // 🟢 Expose method submit
}

const StripeCardForm = forwardRef<StripeCardFormRef, StripeCardFormProps>(({ priceId, onSubmit }, ref) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: "card",
      card: cardElement,
    });

    if (error) {
      console.error("Error creating payment method:", error);
      return;
    }

    // Send paymentMethod.id to the API to create the subscription
    const data = await subscriptionAPI.createStripeSubscription(paymentMethod.id, priceId);

    // Call the onSubmit callback
    onSubmit();
  };

  // Expose `triggerSubmit` so the parent can call it
  useImperativeHandle(ref, () => ({
    triggerSubmit: handleSubmit,
  }));

  return (
    <form className="mt-4">
      <CardElement className="p-3 border rounded-lg" />
    </form>
  );
});

export default StripeCardForm;




