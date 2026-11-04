import assert from "node:assert/strict";
import test from "node:test";
import { calculateEarnedPoints, calculatePointsDiscount } from "@/lib/points";
import { calculateBundleDiscount } from "@/lib/checkout-pricing";

test("earned points use Rp50.000 per point", () => {
  assert.equal(calculateEarnedPoints(49_999), 0);
  assert.equal(calculateEarnedPoints(50_000), 1);
  assert.equal(calculateEarnedPoints(125_000), 2);
  assert.equal(calculateEarnedPoints(0), 0);
});

test("points discount uses Rp1 per point", () => {
  assert.equal(calculatePointsDiscount(250), 250);
  assert.equal(calculatePointsDiscount(0), 0);
  assert.equal(calculatePointsDiscount(-1), 0);
});

test("invalid point values never create a discount", () => {
  assert.equal(calculatePointsDiscount(1.5), 0);
  assert.equal(calculatePointsDiscount(Number.NaN), 0);
});

test("bundle discount matches the Midtrans item discount", () => {
  const discount = calculateBundleDiscount([{
    bundlePrice: 210_000,
    productIds: ["game", "blocks"],
    items: [
      { productId: "game", quantity: 1, price: 125_000 },
      { productId: "blocks", quantity: 1, price: 100_000 },
    ],
  }]);
  assert.equal(discount, 15_000);
  assert.equal(125_000 + 100_000 - discount, 210_000);
});

test("incomplete bundle groups do not receive a discount", () => {
  assert.equal(calculateBundleDiscount([{
    bundlePrice: 210_000,
    productIds: ["game", "blocks"],
    items: [{ productId: "game", quantity: 1, price: 125_000 }],
  }]), 0);
});
