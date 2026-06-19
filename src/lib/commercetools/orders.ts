import { apiRoot } from './client';
import type { Order } from '@commercetools/platform-sdk';

export async function getOrders(params?: {
  limit?: number;
  offset?: number;
  sort?: string[];
}) {
  try {
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          limit: params?.limit || 20,
          offset: params?.offset || 0,
          sort: params?.sort,
        },
      })
      .execute();

    return response.body.results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching orders: ${errorMessage}`);
  }
}

export async function getOrderById(orderId: string) {
  try {
    const response = await apiRoot
      .orders()
      .withId({ ID: orderId })
      .get()
      .execute();

    return response.body;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching order: ${errorMessage}`);
  }
}

export async function getOrdersByCustomerId(customerId: string) {
  try {
    const response = await apiRoot
      .orders()
      .get({
        queryArgs: {
          where: `customerId="${customerId}"`,
          sort: ['createdAt desc'],
        },
      })
      .execute();

    return response.body.results;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error fetching customer orders: ${errorMessage}`);
  }
}

export async function createOrderFromCart(cartId: string, cartVersion: number) {
  try {
    const response = await apiRoot
      .orders()
      .post({
        body: {
          cart: {
            id: cartId,
            typeId: 'cart',
          },
          version: cartVersion,
        },
      })
      .execute();

    return response.body;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error creating order: ${errorMessage}`);
  }
}
