// Loading a draft for editing is separate from choosing the customer's plan.
export async function selectCustomerDesignVersion<T extends { revision?: number }>(
  version: number,
  load: (version: number) => Promise<T>,
  publish: (revision: number, version: number) => Promise<T>,
): Promise<T> {
  if (!Number.isInteger(version) || version < 1) throw new Error("Phiên bản tour không hợp lệ.");
  const fresh = await load(version);
  return publish(fresh.revision || 1, version);
}
