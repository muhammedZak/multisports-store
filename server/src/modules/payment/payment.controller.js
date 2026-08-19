import { validateCheckoutAddressInput } from '../checkout/checkout.validation.js';

import {
  createRazorpayPaymentOrderForCustomer,
  verifyRazorpayPaymentForCustomer,
} from './payment.service.js';

import { validateRazorpayVerificationInput } from './payment.validation.js';

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

export async function verifyRazorpayPaymentForCustomerController(req, res) {
  const input = validateRazorpayVerificationInput(req.body);

  const result = await verifyRazorpayPaymentForCustomer({
    customerId: req.user.id,

    ...input,
  });

  res.status(200).json({
    success: true,

    data: result,
  });
}