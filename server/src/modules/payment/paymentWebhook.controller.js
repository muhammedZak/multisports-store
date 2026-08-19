import { processRazorpayWebhook } from './paymentWebhook.service.js';

export async function handleRazorpayWebhook(req, res) {
  const signature = req.get('x-razorpay-signature');

  const eventId = req.get('x-razorpay-event-id');

  const result = await processRazorpayWebhook({
    rawBody: req.body,

    signature,

    eventId,
  });

  /*
   * Razorpay treats HTTP 2xx as successful
   * delivery.
   */
  res.status(200).json({
    success: true,

    data: result,
  });
}
