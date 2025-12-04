import {
  ClientBuilder,
  type AuthMiddlewareOptions,
  type HttpMiddlewareOptions,
} from '@commercetools/sdk-client-v2';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';

const projectKey = process.env.CTP_PROJECT_KEY;
const clientId = process.env.CTP_CLIENT_ID;
const clientSecret = process.env.CTP_CLIENT_SECRET;
const authHost = process.env.CTP_AUTH_URL;
const apiHost = process.env.CTP_API_URL;
const scopesEnv = process.env.CTP_SCOPES;

if (!projectKey || !clientId || !clientSecret || !authHost || !apiHost) {
  throw new Error(
    'Missing commercetools configuration. Ensure CTP_PROJECT_KEY/CTP_CLIENT_ID/CTP_CLIENT_SECRET/CTP_AUTH_URL/CTP_API_URL are set.'
  );
}

const authMiddlewareOptions: AuthMiddlewareOptions = {
  host: authHost,
  projectKey,
  credentials: {
    clientId,
    clientSecret,
  },
  scopes: scopesEnv ? [scopesEnv] : undefined,
  fetch,
};

const httpMiddlewareOptions: HttpMiddlewareOptions = {
  host: apiHost,
  fetch,
};

const ctpClient = new ClientBuilder()
  .withClientCredentialsFlow(authMiddlewareOptions)
  .withHttpMiddleware(httpMiddlewareOptions)
  .build();

export const apiRoot = createApiBuilderFromCtpClient(ctpClient).withProjectKey({ projectKey });