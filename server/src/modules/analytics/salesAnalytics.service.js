import { Product } from '../catalog/product.model.js';

import { Order, ORDER_STATUSES } from '../order/order.model.js';

import { Payment, PAYMENT_STATUSES } from '../payment/payment.model.js';

const TOP_SELLING_LIMIT = 10;
const LOW_PERFORMING_LIMIT = 5;

function toIdString(value) {
  return value?.toString() ?? null;
}

/*
 * Allocate the Order-level Coupon discount across
 * Order lines proportionally.
 *
 * Example:
 *
 * lineCouponShare =
 *   Order.discountAmount × lineTotal / Order.subtotal
 *
 * Because money uses integer paise, proportional
 * division can leave remainder paise.
 *
 * We:
 * 1. floor every proportional share
 * 2. calculate remaining paise
 * 3. give remaining paise to the largest fractional
 *    remainders
 * 4. use immutable Order-item position as deterministic
 *    tie-breaker
 *
 * BigInt avoids precision loss during multiplication.
 */
function allocatePaidLineAmounts(order) {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    return [];
  }

  const subtotal = order.subtotal;
  const discountAmount = order.discountAmount;

  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(discountAmount)
  ) {
    throw new Error('Order analytics requires valid integer commerce totals.');
  }

  /*
   * No Order-level Coupon allocation is needed.
   *
   * item.lineTotal already includes any item-level
   * Product discount from the immutable snapshot.
   */
  if (discountAmount === 0 || subtotal === 0) {
    return items.map((item) => ({
      item,
      paidLineAmount: item.lineTotal,
    }));
  }

  const subtotalBigInt = BigInt(subtotal);
  const discountBigInt = BigInt(discountAmount);

  let allocatedDiscount = 0n;

  const allocations = items.map((item, index) => {
    const lineTotalBigInt = BigInt(item.lineTotal);

    const numerator = discountBigInt * lineTotalBigInt;

    const couponShare = numerator / subtotalBigInt;

    const remainder = numerator % subtotalBigInt;

    allocatedDiscount += couponShare;

    return {
      item,
      index,
      couponShare,
      remainder,
    };
  });

  let remainingDiscount = discountBigInt - allocatedDiscount;

  /*
   * Largest-remainder distribution ensures:
   *
   * sum(line coupon shares)
   * === Order.discountAmount
   */
  const remainderPriority = [...allocations].sort((left, right) => {
    if (left.remainder === right.remainder) {
      return left.index - right.index;
    }

    return left.remainder > right.remainder ? -1 : 1;
  });

  for (
    let index = 0;
    remainingDiscount > 0n && index < remainderPriority.length;
    index += 1
  ) {
    remainderPriority[index].couponShare += 1n;

    remainingDiscount -= 1n;
  }

  return allocations.map(({ item, couponShare }) => {
    const allocatedCouponShare = Number(couponShare);

    const paidLineAmount = item.lineTotal - allocatedCouponShare;

    if (!Number.isSafeInteger(paidLineAmount) || paidLineAmount < 0) {
      throw new Error('Order analytics produced an invalid paid line amount.');
    }

    return {
      item,
      paidLineAmount,
    };
  });
}

async function getRecognizedOrders(range) {
  return Order.aggregate([
    {
      $match: {
        placedAt: {
          $gte: range.startAt,
          $lte: range.endAt,
        },

        orderStatus: {
          $ne: ORDER_STATUSES.CANCELLED,
        },
      },
    },

    /*
     * Use successful Payment state as the
     * recognition authority exactly as Task 14.3.
     */
    {
      $lookup: {
        from: Payment.collection.name,

        localField: 'paymentId',
        foreignField: '_id',

        as: 'payment',
      },
    },

    {
      $match: {
        'payment.status': PAYMENT_STATUSES.SUCCEEDED,
      },
    },

    {
      $project: {
        placedAt: 1,

        subtotal: 1,
        discountAmount: 1,
        totalAmount: 1,

        items: 1,
      },
    },

    /*
     * Stable ordering allows the most recent
     * historical snapshot label within the range
     * to become the display label when a Product
     * or Category name changed over time.
     *
     * Metrics remain grouped by persisted IDs.
     */
    {
      $sort: {
        placedAt: 1,
        _id: 1,
      },
    },
  ]);
}

function addSportMetric(metrics, item, paidLineAmount) {
  const current = metrics.get(item.sport) ?? {
    sport: item.sport,
    unitsSold: 0,
    salesAmount: 0,
  };

  current.unitsSold += item.quantity;

  current.salesAmount += paidLineAmount;

  metrics.set(item.sport, current);
}

function addCategoryMetric(metrics, item, paidLineAmount) {
  const categoryId = toIdString(item.categoryId);

  const current = metrics.get(categoryId) ?? {
    categoryId,
    categoryName: item.categoryName,

    unitsSold: 0,
    salesAmount: 0,
  };

  /*
   * Deliberately use an Order snapshot name,
   * never today's Category name.
   *
   * Since recognized Orders are sorted oldest →
   * newest, this leaves the newest historical
   * label encountered inside the reporting range.
   */
  current.categoryName = item.categoryName;

  current.unitsSold += item.quantity;

  current.salesAmount += paidLineAmount;

  metrics.set(categoryId, current);
}

function addProductMetric(metrics, item, paidLineAmount) {
  const productId = toIdString(item.productId);

  const current = metrics.get(productId) ?? {
    productId,
    productName: item.productName,

    unitsSold: 0,
    salesAmount: 0,
  };

  /*
   * Same historical-label rule as Category.
   * Do not join the current Product merely to
   * display a renamed title.
   */
  current.productName = item.productName;

  current.unitsSold += item.quantity;

  current.salesAmount += paidLineAmount;

  metrics.set(productId, current);
}

function compareSalesGroups(left, right, labelField) {
  if (right.salesAmount !== left.salesAmount) {
    return right.salesAmount - left.salesAmount;
  }

  if (right.unitsSold !== left.unitsSold) {
    return right.unitsSold - left.unitsSold;
  }

  return String(left[labelField] ?? '').localeCompare(
    String(right[labelField] ?? ''),
  );
}

function createTopSellingProducts(productMetrics) {
  return [...productMetrics.values()]
    .sort((left, right) => {
      /*
       * Locked Product ranking:
       *
       * 1. unitsSold desc
       * 2. salesAmount desc
       */
      if (right.unitsSold !== left.unitsSold) {
        return right.unitsSold - left.unitsSold;
      }

      if (right.salesAmount !== left.salesAmount) {
        return right.salesAmount - left.salesAmount;
      }

      return left.productName.localeCompare(right.productName);
    })
    .slice(0, TOP_SELLING_LIMIT);
}

async function createLowPerformingProducts(productMetrics) {
  /*
   * Low-performing reporting is deliberately based
   * on CURRENT active Products.
   *
   * The Product collection decides which Products
   * belong in the current active comparison set.
   *
   * Historical quantity/revenue still comes from
   * immutable Order snapshots.
   */
  const activeProducts = await Product.find({
    isActive: true,
  })
    .select('_id name')
    .lean();

  return activeProducts
    .map((product) => {
      const productId = product._id.toString();

      const metric = productMetrics.get(productId);

      return {
        productId,

        productName: product.name,

        unitsSold: metric?.unitsSold ?? 0,

        salesAmount: metric?.salesAmount ?? 0,
      };
    })
    .sort((left, right) => {
      if (left.unitsSold !== right.unitsSold) {
        return left.unitsSold - right.unitsSold;
      }

      if (left.salesAmount !== right.salesAmount) {
        return left.salesAmount - right.salesAmount;
      }

      const nameComparison = left.productName.localeCompare(right.productName);

      if (nameComparison !== 0) {
        return nameComparison;
      }

      return left.productId.localeCompare(right.productId);
    })
    .slice(0, LOW_PERFORMING_LIMIT);
}

export async function getSalesAndProductAnalytics(range) {
  const recognizedOrders = await getRecognizedOrders(range);

  const sportMetrics = new Map();
  const categoryMetrics = new Map();
  const productMetrics = new Map();

  for (const order of recognizedOrders) {
    const allocatedLines = allocatePaidLineAmounts(order);

    for (const { item, paidLineAmount } of allocatedLines) {
      addSportMetric(sportMetrics, item, paidLineAmount);

      addCategoryMetric(categoryMetrics, item, paidLineAmount);

      addProductMetric(productMetrics, item, paidLineAmount);
    }
  }

  const bySport = [...sportMetrics.values()].sort((left, right) =>
    compareSalesGroups(left, right, 'sport'),
  );

  const byCategory = [...categoryMetrics.values()].sort((left, right) =>
    compareSalesGroups(left, right, 'categoryName'),
  );

  const topSelling = createTopSellingProducts(productMetrics);

  const lowPerforming = await createLowPerformingProducts(productMetrics);

  return {
    bySport,
    byCategory,

    topSelling,
    lowPerforming,
  };
}
