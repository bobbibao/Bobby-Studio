import { Response } from 'express';
import { json } from 'body-parser';
import RequestWithRawBody from '../modules/stripe-webhook/requestWithRawBody.interface';

// NestJS uses the body-parser library to parse incoming request bodies.
// Because of that, we don’t get to access the raw body straightforwardly.
// The Stripe package that we need to use to work with webhooks requires it, though.
// ref: https://wanago.io/2021/07/05/api-nestjs-stripe-events-webhooks/
function rawBodyMiddleware() {
  return json({
    verify: (
      request: RequestWithRawBody,
      response: Response,
      buffer: Buffer
    ) => {
      if (
        (request.url === '/api/webhook' || request.url === '/webhook') &&
        Buffer.isBuffer(buffer)
      ) {
        request.rawBody = Buffer.from(buffer);
      }
      return true;
    },
  });
}

export default rawBodyMiddleware;
