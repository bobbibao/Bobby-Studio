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

    // 🟢 Gửi paymentMethod.id lên BE để tạo Subscription
    const data = await subscriptionAPI.createStripeSubscription(paymentMethod.id, priceId);

    // 🟢 Gọi callback onSubmit
    onSubmit();
  };

  // 🟢 Expose `triggerSubmit` để gọi từ bên ngoài
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




