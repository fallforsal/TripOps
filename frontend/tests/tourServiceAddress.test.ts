import { test } from "node:test";
import assert from "node:assert/strict";
import { mealAddress, serviceAddress } from "../src/app/lib/tourServiceAddress.ts";
import type { Service } from "../src/app/types/index.ts";

const post: Service = { id: "42", providerId: "provider", providerName: "Provider", category: "fnb",
  name: "Restaurant", price: 150000, location: "Đà Lạt", fullAddress: "  12 Trần Phú, Đà Lạt  ",
  description: "Menu and seating capacity are not an address", image: "", rating: 0, status: "approved" };

test("older platform meals display the full address of their linked post", () => {
  assert.equal(mealAddress({ serviceId: "42", supplierSource: "PLATFORM_PARTNER" }, [post]), "12 Trần Phú, Đà Lạt");
});

test("the address saved with a tour survives later post changes and missing catalogue entries", () => {
  const meal = { serviceId: "42", supplier: { address: "Original tour address" } };
  assert.equal(mealAddress(meal, [{ ...post, fullAddress: "Changed post address" }]), "Original tour address");
  assert.equal(mealAddress(meal, []), "Original tour address");
});

test("Agency supplier meals use their own address even if a legacy platform ID remains", () => {
  assert.equal(mealAddress({ serviceId: "42", supplierSource: "AGENCY_SUPPLIER",
    supplier: { address: "Private restaurant address" } }, [post]), "Private restaurant address");
  assert.equal(mealAddress({ serviceId: "42", supplierSource: "AGENCY_SUPPLIER" }, [post]), undefined);
  assert.equal(mealAddress({ serviceId: "42", isCustom: true }, [post]), undefined);
});

test("structured address parts are combined when a post has no full address", () => {
  assert.equal(serviceAddress({ ...post, fullAddress: " ", street: " 12 Trần Phú ", ward: "Phường 3", province: "Lâm Đồng" }),
    "12 Trần Phú, Phường 3, Lâm Đồng");
  assert.equal(serviceAddress({ location: "Đà Lạt" }), "Đà Lạt");
});

test("missing addresses are not replaced by service descriptions or unrelated posts", () => {
  assert.equal(mealAddress({ serviceId: "missing" }, [post]), undefined);
  assert.equal(mealAddress({}, [post]), undefined);
  assert.equal(serviceAddress({ ...post, fullAddress: " ", location: " " }), undefined);
});
