const CHAT_PRODUCT_KEY = "chat_product_id";

export function prepareProductChat(productId: number, storage: Storage = localStorage) {
  const nextProduct = String(productId);
  if (storage.getItem(CHAT_PRODUCT_KEY) === nextProduct) return;

  // Keep past message histories, but never authenticate a new product with
  // the previous product's conversation session.
  storage.removeItem("chat_session_id");
  storage.removeItem("chat_token");
  storage.setItem(CHAT_PRODUCT_KEY, nextProduct);
}
