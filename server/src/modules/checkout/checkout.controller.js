import { resolveCheckoutForCustomer } from './checkout.service.js';

import { validateCheckoutAddressInput } from './checkout.validation.js';

export async function previewCheckoutForCustomer(req, res) {
  const input = validateCheckoutAddressInput(req.body);

  const { preview } = await resolveCheckoutForCustomer({
    customerId: req.user.id,

    ...input,
  });

  res.status(200).json({
    success: true,

    data: {
      checkout: preview,
    },
  });
}
