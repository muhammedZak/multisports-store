import { validateCheckoutAddressInput } from '../checkout/checkout.validation.js';

import { createRazorpayPaymentOrderForCustomer } from './payment.service.js';

export async function createRazorpayOrderForCustomer(req, res) {
  /*
   * Reuse Task 8.2's exact address/request contract.
   *
   * Browser cannot submit:
   * customerId
   * amount
   * currency
   * Cart items
   * prices
   * totals
   */
  const input = validateCheckoutAddressInput(req.body);

  const result = await createRazorpayPaymentOrderForCustomer({
    customerId: req.user.id,

    ...input,
  });

  res.status(201).json({
    success: true,

    data: result,
  });
}
