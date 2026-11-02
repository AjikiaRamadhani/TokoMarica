type Schema = Record<string, unknown>;
type Method = "get" | "post" | "put" | "patch" | "delete";

const objectSchema: Schema = { type: "object", additionalProperties: true };
const arraySchema = (items: Schema = objectSchema): Schema => ({ type: "array", items });
const jsonContent = (schema: Schema) => ({ content: { "application/json": { schema } } });

const errors: Record<string, Schema> = {
  "400": { description: "Bad request: payload atau parameter tidak valid." },
  "401": { description: "Unauthorized: session login atau kredensial layanan valid diperlukan." },
  "403": { description: "Forbidden: role atau game tidak diizinkan." },
  "404": { description: "Resource tidak ditemukan." },
  "429": { description: "Too many requests." },
  "500": { description: "Internal server error." },
  "502": { description: "Bad gateway: layanan email atau provider eksternal gagal." },
  "503": { description: "Service unavailable: integrasi belum dikonfigurasi." },
};

const pathParam = (name: string, description: string): Schema => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string" },
});

const queryParam = (name: string, description: string, schema: Schema = { type: "string" }): Schema => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
});

const operation = (
  summary: string,
  tag: string,
  options: {
    auth?: boolean;
    admin?: boolean;
    parameters?: Schema[];
    requestBody?: Schema;
    success?: Schema;
    successStatus?: string;
    successDescription?: string;
    errorCodes?: string[];
    security?: Schema[];
  } = {},
) => ({
  summary,
  description: summary,
  tags: [tag],
  ...(options.parameters ? { parameters: options.parameters } : {}),
  ...(options.requestBody ? { requestBody: jsonContent(options.requestBody) } : {}),
  ...(options.security
    ? { security: options.security }
    : options.auth || options.admin
      ? { security: [{ SessionCookie: [] }] }
      : {}),
  responses: {
    [options.successStatus ?? "200"]: {
      description: options.successDescription ?? "Request berhasil.",
      ...(options.success ? jsonContent(options.success) : {}),
    },
    ...Object.fromEntries((options.errorCodes ?? []).map((code) => [code, errors[code]])),
  },
});

export const getApiDocs = () => {
  const paths: Record<string, Record<string, unknown>> = {};
  const add = (path: string, method: Method, summary: string, tag: string, options: Parameters<typeof operation>[2] = {}) => {
    paths[path] ??= {};
    paths[path][method] = operation(summary, tag, options);
  };

  // Public landing page content.
  for (const [path, summary] of [
    ["/api/solutions", "Get solutions"],
  ]) add(path, "get", summary, "Content", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/company", "get", "Get company profile", "Content", { success: objectSchema, errorCodes: ["404", "500"] });

  // Catalog, cart, checkout, and orders.
  add("/api/product-categories", "get", "List active product categories", "Catalog", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/products", "get", "List products", "Catalog", {
    parameters: [
      queryParam("page", "Page number.", { type: "integer", minimum: 1, default: 1 }),
      queryParam("limit", "Items per page; maximum 50.", { type: "integer", minimum: 1, maximum: 50, default: 12 }),
      queryParam("search", "Search product name or description."),
      queryParam("category", "Product category slug."),
      queryParam("age", "Age range such as 3-5."),
      queryParam("skillFocus", "Skill focus filter."),
      queryParam("minPrice", "Minimum price.", { type: "integer", minimum: 0 }),
      queryParam("maxPrice", "Maximum price.", { type: "integer", minimum: 0 }),
      queryParam("sort", "newest, price_asc, price_desc, or bestseller."),
    ],
    success: objectSchema,
    errorCodes: ["500"],
  });
  add("/api/products/{slug}", "get", "Get product detail", "Catalog", { parameters: [pathParam("slug", "Product slug.")], success: objectSchema, errorCodes: ["404", "500"] });
  add("/api/recommendations/{productId}", "get", "Get product recommendations", "Recommendations", {
    parameters: [
      pathParam("productId", "Product ID used as the recommendation context."),
      queryParam("limit", "Maximum number of recommendations; defaults to 5.", { type: "integer", minimum: 1 }),
      queryParam("sessionId", "Anonymous recommendation session ID."),
    ],
    success: objectSchema,
    errorCodes: ["400", "404", "500"],
  });
  add("/api/recommendations/events", "post", "Record a product recommendation event", "Recommendations", {
    requestBody: {
      type: "object",
      required: ["productId", "type"],
      properties: {
        productId: { type: "string" },
        type: { type: "string", enum: ["VIEW", "CLICK", "CART", "PURCHASE"] },
        sessionId: { type: "string", description: "Required for anonymous users." },
      },
    },
    success: objectSchema,
    successStatus: "201",
    errorCodes: ["400", "404", "429", "500"],
  });

  add("/api/cart", "get", "Get current user cart", "Cart", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cart", "post", "Add product to cart", "Cart", { auth: true, requestBody: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, bundleId: { type: "string", nullable: true } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "500"] });
  add("/api/cart", "patch", "Update cart item quantity", "Cart", { auth: true, requestBody: { type: "object", required: ["itemId", "quantity"], properties: { itemId: { type: "string" }, quantity: { type: "integer", minimum: 1 } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/cart", "delete", "Delete cart item", "Cart", { auth: true, requestBody: { type: "object", required: ["itemId"], properties: { itemId: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/cart/{itemId}", "put", "Update cart item", "Cart", { auth: true, parameters: [pathParam("itemId", "Cart item ID.")], requestBody: { type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1 } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/cart/{itemId}", "delete", "Delete cart item by ID", "Cart", { auth: true, parameters: [pathParam("itemId", "Cart item ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/checkout", "post", "Create product checkout", "Orders", { auth: true, requestBody: { type: "object", required: ["shippingName", "shippingPhone", "shippingAddress", "shippingCity", "shippingProvince", "shippingPostalCode", "shippingCost"], properties: { shippingName: { type: "string" }, shippingPhone: { type: "string" }, shippingAddress: { type: "string" }, shippingCity: { type: "string" }, shippingProvince: { type: "string" }, shippingPostalCode: { type: "string" }, shippingCourier: { type: "string" }, shippingService: { type: "string" }, shippingCost: { type: "integer", minimum: 0 }, checkoutProductId: { type: "string" }, userVoucherId: { type: "string", description: "ID voucher milik user yang akan digunakan." }, redeemPoints: { type: "integer", minimum: 0, description: "Kompatibilitas alur lama; gunakan penukaran poin menjadi voucher untuk alur baru." } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "500"] });
  add("/api/cashier/transactions", "get", "List POS transactions", "Cashier", { auth: true, parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page."), queryParam("status", "COMPLETED or VOIDED.")], success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cashier/members", "get", "Search members for POS", "Cashier", { auth: true, parameters: [queryParam("search", "Name, email, or WhatsApp number.")], success: objectSchema, errorCodes: ["400", "401", "500"] });
  add("/api/cashier/products", "get", "List active products and store stock for POS", "Cashier", { auth: true, parameters: [queryParam("limit", "Maximum number of products; defaults to 50.", { type: "integer", minimum: 1, maximum: 50 })], success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cashier/transactions", "post", "Create POS cash register transaction", "Cashier", { auth: true, requestBody: { type: "object", required: ["paymentMethod", "paidAmount", "items"], properties: { customerId: { type: "string" }, userVoucherId: { type: "string" }, paymentMethod: { type: "string", enum: ["CASH", "CARD", "QRIS"] }, paidAmount: { type: "integer", minimum: 0 }, paymentReference: { type: "string" }, notes: { type: "string" }, items: { type: "array", items: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 } } } } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/cashier/transactions/{id}/void", "post", "Void POS transaction and restore stock", "Cashier", { auth: true, parameters: [pathParam("id", "POS transaction ID.")], success: objectSchema, errorCodes: ["401", "409", "500"] });
  add("/api/cashier/transactions/{id}", "get", "Get POS transaction detail", "Cashier", { auth: true, parameters: [pathParam("id", "POS transaction ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/cashier/transactions/{id}/receipt", "get", "Get POS receipt data", "Cashier", { auth: true, parameters: [pathParam("id", "POS transaction ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/cashier/playpasses", "get", "List active Playpass packages", "Cashier", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/cashier/playpasses", "post", "Issue Playpass ticket", "Cashier", { auth: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "500"] });
  add("/api/cashier/playpasses/check-in", "post", "Check in Playpass ticket", "Cashier", { auth: true, requestBody: { type: "object", properties: { qrToken: { type: "string" }, ticketNumber: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/cashier/playpasses/{ticketNumber}/void", "post", "Void Playpass ticket", "Cashier", { auth: true, parameters: [pathParam("ticketNumber", "Playpass ticket number.")], success: objectSchema, errorCodes: ["401", "409", "500"] });
  add("/api/admin/playpass-packages", "get", "List Playpass packages", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/admin/playpass-packages", "post", "Create Playpass package", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "500"] });
  add("/api/admin/playpass-packages/{id}", "put", "Update Playpass package", "Admin", { admin: true, parameters: [pathParam("id", "Playpass package ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/admin/playpass-packages/{id}", "delete", "Deactivate Playpass package", "Admin", { admin: true, parameters: [pathParam("id", "Playpass package ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/playpass", "get", "List active Playpass packages or return slot availability", "Playpass", {
    parameters: [
      queryParam("packageId", "Playpass package ID; provide together with date for slot availability."),
      queryParam("date", "Visit date in YYYY-MM-DD; provide together with packageId."),
    ],
    success: objectSchema,
    errorCodes: ["404", "500"],
  });
  add("/api/playpass-bookings", "get", "List current user Playpass bookings", "Playpass", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/playpass-bookings", "post", "Create an online Playpass booking", "Playpass", {
    auth: true,
    requestBody: {
      type: "object",
      required: ["packageId", "date", "startTime", "quantity"],
      properties: {
        packageId: { type: "string" },
        date: { type: "string", format: "date" },
        startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        quantity: { type: "integer", minimum: 1 },
        customerPhone: { type: "string", nullable: true },
        participants: { type: "array", description: "Optional child/parent participant list; maximum equals quantity.", items: { type: "object", required: ["name"], properties: { name: { type: "string" }, age: { type: "integer", minimum: 0, maximum: 120 }, relationship: { type: "string" } } } },
        fnbItems: { type: "array", description: "Optional F&B add-ons.", items: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 } } } },
      },
    },
    success: objectSchema,
    successStatus: "201",
    errorCodes: ["400", "401", "409", "500"],
  });
  add("/api/playpass-bookings/{bookingNumber}", "get", "Get the current user's Playpass booking", "Playpass", { auth: true, parameters: [pathParam("bookingNumber", "Playpass booking number.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/playpass-bookings/{bookingNumber}", "post", "Refresh Playpass payment status from Midtrans", "Playpass", { auth: true, parameters: [pathParam("bookingNumber", "Playpass booking number.")], success: objectSchema, errorCodes: ["400", "401", "404", "502"] });
  add("/api/table-reservations", "get", "List table packages, availability, or current user reservations", "Table reservation", {
    parameters: [
      queryParam("packageId", "Table fee package ID; provide together with date for slot availability."),
      queryParam("date", "Reservation date in YYYY-MM-DD; provide together with packageId."),
      queryParam("mine", "Set to 1 to list the authenticated user's reservations.", { type: "string", enum: ["1"] }),
    ],
    success: objectSchema,
    errorCodes: ["401", "404", "500"],
  });
  add("/api/table-reservations", "post", "Create an online table reservation", "Table reservation", {
    auth: true,
    requestBody: {
      type: "object",
      required: ["packageId", "date", "startTime", "partySize"],
      properties: {
        packageId: { type: "string" },
        date: { type: "string", format: "date" },
        startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        partySize: { type: "integer", minimum: 1 },
        customerPhone: { type: "string", nullable: true },
        participants: { type: "array", description: "Optional child/parent participant list; maximum equals partySize.", items: { type: "object", required: ["name"], properties: { name: { type: "string" }, age: { type: "integer", minimum: 0, maximum: 120 }, relationship: { type: "string" } } } },
        fnbItems: { type: "array", description: "Optional F&B add-ons.", items: { type: "object", required: ["productId", "quantity"], properties: { productId: { type: "string" }, quantity: { type: "integer", minimum: 1 } } } },
      },
    },
    success: objectSchema,
    successStatus: "201",
    errorCodes: ["400", "401", "409", "500"],
  });
  add("/api/table-reservations/{reservationNumber}", "get", "Get the current user's table reservation", "Table reservation", { auth: true, parameters: [pathParam("reservationNumber", "Reservation number.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/table-reservations/{reservationNumber}", "post", "Refresh table reservation payment status from Midtrans", "Table reservation", { auth: true, parameters: [pathParam("reservationNumber", "Reservation number.")], success: objectSchema, errorCodes: ["401", "404", "400", "502"] });
  add("/api/cashier/table-reservations/check-in", "post", "Check in a table reservation QR", "Cashier", { auth: true, requestBody: { type: "object", description: "Provide qrToken or reservationNumber.", properties: { qrToken: { type: "string" }, reservationNumber: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/cashier/table-fees/packages", "get", "List active table fee packages for cashier", "Cashier", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/cashier/vouchers", "get", "List active vouchers for cashier", "Cashier", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/fnb-products", "get", "List active F&B menu products", "F&B", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/cashier/fnb-orders", "get", "List pre-ordered F&B items", "Cashier", { auth: true, parameters: [queryParam("status", "PENDING, PREPARING, READY, SERVED, or CANCELLED.")], success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/cashier/fnb-orders/{id}", "patch", "Update F&B pre-order status", "Cashier", { auth: true, parameters: [pathParam("id", "F&B order item ID.")], requestBody: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"] } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/cashier/table-fees", "get", "List active table fee sessions", "Cashier", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cashier/table-fees", "post", "Open table fee session", "Cashier", { auth: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/cashier/table-fees/{id}/complete", "post", "Complete table fee session", "Cashier", { auth: true, parameters: [pathParam("id", "Table fee session ID.")], success: objectSchema, errorCodes: ["401", "409", "500"] });
  add("/api/cashier/table-fees/{id}/cancel", "post", "Cancel table fee session", "Cashier", { auth: true, parameters: [pathParam("id", "Table fee session ID.")], success: objectSchema, errorCodes: ["401", "409", "500"] });
  add("/api/cashier/shifts", "get", "Get current cashier shift", "Cashier", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cashier/shifts", "post", "Open cashier shift", "Cashier", { auth: true, requestBody: { type: "object", required: ["openingCash"], properties: { openingCash: { type: "integer", minimum: 0 }, notes: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "409", "500"] });
  add("/api/cashier/shifts/{id}/close", "post", "Close cashier shift", "Cashier", { auth: true, parameters: [pathParam("id", "Shift ID.")], requestBody: { type: "object", required: ["closingCash"], properties: { closingCash: { type: "integer", minimum: 0 }, notes: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "409", "500"] });
  add("/api/cashier/sales", "get", "List unified cashier sales", "Cashier", { auth: true, parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page."), queryParam("period", "day, month, or year."), queryParam("date", "Reference date in YYYY-MM-DD format.")], success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cashier/sales", "post", "Create unified mixed sale", "Cashier", { auth: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/cashier/sales/{id}/receipt", "get", "Get unified cashier sale receipt data", "Cashier", { auth: true, parameters: [pathParam("id", "Unified sale ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/cashier/sales/{id}/void", "post", "Void unified mixed sale", "Cashier", { auth: true, parameters: [pathParam("id", "Unified sale ID.")], success: objectSchema, errorCodes: ["401", "409", "500"] });
  add("/api/admin/table-fee-packages", "get", "List table fee packages", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/admin/table-fee-packages", "post", "Create table fee package", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "500"] });
  add("/api/admin/table-fee-packages/{id}", "put", "Update table fee package", "Admin", { admin: true, parameters: [pathParam("id", "Table fee package ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/admin/table-fee-packages/{id}", "delete", "Deactivate table fee package", "Admin", { admin: true, parameters: [pathParam("id", "Table fee package ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/orders", "get", "List current user orders", "Orders", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/orders/{id}", "get", "Get order detail", "Orders", { auth: true, parameters: [pathParam("id", "Order ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/orders/{id}", "patch", "Cancel order or confirm delivery", "Orders", { auth: true, parameters: [pathParam("id", "Order ID.")], requestBody: { type: "object", required: ["action"], properties: { action: { type: "string", enum: ["cancel", "confirm_delivery"] } } }, success: objectSchema, errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/orders/{id}/reviews", "get", "List the current user's reviews for an order", "Reviews", { auth: true, parameters: [pathParam("id", "Order ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/orders/{id}/reviews", "post", "Create a product review after delivery confirmation", "Reviews", { auth: true, parameters: [pathParam("id", "Order ID.")], requestBody: { type: "object", required: ["productId", "rating"], properties: { productId: { type: "string" }, rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string", maxLength: 1000 } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/products/{slug}/reviews", "get", "List public reviews for a product", "Reviews", { parameters: [pathParam("slug", "Product slug or ID.") , queryParam("page", "Page number."), queryParam("limit", "Reviews per page; maximum 50.")], success: objectSchema, errorCodes: ["404", "500"] });

  // Events and tickets.
  add("/api/events", "get", "List active events", "Events", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/events/{slug}", "get", "Get event detail", "Events", { parameters: [pathParam("slug", "Event slug.")], success: objectSchema, errorCodes: ["404", "500"] });
  add("/api/event-bookings", "get", "List current user event bookings", "Events", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/event-bookings", "post", "Create event booking", "Events", { auth: true, requestBody: { type: "object", required: ["eventId", "quantity", "participantNames"], properties: { eventId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, participantNames: { type: "array", items: { type: "string" } }, customerPhone: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "500"] });
  add("/api/event-bookings/{bookingNumber}", "get", "Get event booking detail", "Events", { auth: true, parameters: [pathParam("bookingNumber", "Booking number.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/event-bookings/{bookingNumber}", "post", "Refresh or pay event booking", "Events", { auth: true, parameters: [pathParam("bookingNumber", "Booking number.")], success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/event-tickets/{ticketCode}", "get", "Get e-ticket and QR data", "Tickets", { auth: true, parameters: [pathParam("ticketCode", "Ticket code.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/event-tickets/{ticketCode}", "post", "Check in ticket by code", "Tickets", { admin: true, parameters: [pathParam("ticketCode", "Ticket code.")], requestBody: { type: "object", required: ["qrToken"], properties: { qrToken: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "429", "500"] });
  add("/api/event-tickets/{ticketCode}/check-in", "post", "Check in a ticket by ticket code and QR token", "Tickets", { auth: true, parameters: [pathParam("ticketCode", "Ticket code, or scan to resolve by QR token.")], requestBody: { type: "object", required: ["qrToken"], properties: { qrToken: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "409", "500"] });
  add("/api/event-tickets/check-in", "post", "Check in ticket by QR token", "Tickets", { admin: true, requestBody: { type: "object", required: ["qrToken"], properties: { qrToken: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "429", "500"] });

  // Printables, articles, newsletter, and authentication.
  add("/api/printables", "get", "List active printables", "Printables", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/printables/{id}", "get", "Get printable detail", "Printables", { parameters: [pathParam("id", "Printable ID or slug.")], success: objectSchema, errorCodes: ["404", "500"] });
  add("/api/printables/{id}/download", "post", "Prepare printable download, email delivery, and a manual WhatsApp share link", "Printables", { auth: true, parameters: [pathParam("id", "Printable ID or slug.")], requestBody: { type: "object", required: ["name", "email", "whatsapp"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, whatsapp: { type: "string", description: "Nomor WhatsApp dalam format internasional atau nomor Indonesia lokal." }, childAge: { type: "integer", minimum: 0, maximum: 18 } } }, success: { type: "object", properties: { message: { type: "string" }, downloadUrl: { type: "string", format: "uri" }, whatsappUrl: { type: "string", format: "uri", description: "Link wa.me yang membuka WhatsApp dengan pesan dan link PDF siap dikirim manual." }, expiresIn: { type: "integer" }, delivery: { type: "object", properties: { email: { type: "string", enum: ["sent", "failed"] }, whatsapp: { type: "string", enum: ["accepted", "failed", "not_configured"] } } } } }, successStatus: "200", errorCodes: ["400", "401", "404", "429", "500", "503"] });
  add("/api/articles", "get", "List published articles", "Articles", { parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page."), queryParam("search", "Search article title."), queryParam("media", "Use video to return articles with video metadata.")], success: objectSchema, errorCodes: ["500"] });
  add("/api/articles/videos", "get", "List published article videos for the showcase", "Articles", { parameters: [queryParam("limit", "Maximum number of videos.")], success: arraySchema(), errorCodes: ["500"] });
  add("/api/articles/{slug}", "get", "Get published article", "Articles", { parameters: [pathParam("slug", "Article slug.")], success: objectSchema, errorCodes: ["404", "500"] });
  add("/api/articles/{slug}/comments", "get", "List article comments", "Articles", { parameters: [pathParam("slug", "Article slug.")], success: arraySchema(), errorCodes: ["404", "500"] });
  add("/api/articles/{slug}/comments", "post", "Create article comment", "Articles", { auth: true, parameters: [pathParam("slug", "Article slug.")], requestBody: { type: "object", required: ["content"], properties: { content: { type: "string", maxLength: 2000 } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "500"] });
  add("/api/article-categories", "get", "List article categories", "Articles", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/newsletter", "post", "Subscribe to newsletter", "Marketing", { requestBody: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "500"] });
  add("/api/b2b/inquiries", "post", "Submit a corporate or school inquiry", "B2B", { requestBody: { type: "object", required: ["organizationName", "organizationType", "contactName", "email", "whatsapp", "requestType"], properties: { organizationName: { type: "string" }, organizationType: { type: "string", description: "For example SCHOOL, CORPORATE, or COMMUNITY." }, contactName: { type: "string" }, email: { type: "string", format: "email" }, whatsapp: { type: "string" }, requestType: { type: "string", description: "For example school visit, birthday package, area rental, or teacher training." }, participantCount: { type: "integer", minimum: 1 }, eventDate: { type: "string", format: "date" }, budget: { type: "integer", minimum: 0 }, notes: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "429", "500"] });
  add("/api/preorders", "get", "List published pre-order and exclusive release campaigns", "Pre-Orders", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/preorders", "post", "Create a pre-order reservation and Midtrans payment", "Pre-Orders", { auth: true, requestBody: { type: "object", required: ["campaignId", "quantity"], properties: { campaignId: { type: "string" }, quantity: { type: "integer", minimum: 1 }, whatsapp: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "409", "500"] });
  add("/api/preorders/mine", "get", "List current user's pre-order reservations", "Pre-Orders", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/preorders/reservation/{reservationNumber}", "get", "Get current user's pre-order payment and reservation status", "Pre-Orders", { auth: true, parameters: [pathParam("reservationNumber", "Pre-order reservation number.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/preorders/reservation/{reservationNumber}", "post", "Refresh current user's pre-order payment status from Midtrans", "Pre-Orders", { auth: true, parameters: [pathParam("reservationNumber", "Pre-order reservation number.")], success: objectSchema, errorCodes: ["400", "401", "404", "502"] });
  add("/api/preorders/{slug}", "get", "Get published pre-order campaign detail", "Pre-Orders", { parameters: [pathParam("slug", "Campaign slug.")], success: objectSchema, errorCodes: ["404", "500"] });
  add("/api/subscriptions/plans", "get", "List active Edu-Kit subscription plans", "Subscriptions", { success: arraySchema(), errorCodes: ["500"] });
  add("/api/subscriptions", "get", "List current user's subscriptions and billing cycles", "Subscriptions", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/subscriptions", "post", "Create a subscription and initial payment", "Subscriptions", { auth: true, requestBody: { type: "object", required: ["planId", "shippingName", "shippingPhone", "shippingAddress", "shippingCity", "shippingProvince", "shippingPostalCode"], properties: { planId: { type: "string" }, childProfileId: { type: "string", description: "Optional child profile owned by the current user." }, shippingName: { type: "string" }, shippingPhone: { type: "string" }, shippingAddress: { type: "string" }, shippingCity: { type: "string" }, shippingProvince: { type: "string" }, shippingPostalCode: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "404", "500"] });
  add("/api/subscriptions/{subscriptionNumber}", "patch", "Pause, resume, skip, or cancel a subscription", "Subscriptions", { auth: true, parameters: [pathParam("subscriptionNumber", "Subscription number.")], requestBody: { type: "object", required: ["action"], properties: { action: { type: "string", enum: ["PAUSE", "RESUME", "SKIP", "CANCEL"] } } }, success: objectSchema, errorCodes: ["400", "401", "404", "409", "500"] });
  add("/api/subscriptions/activities", "get", "List digital activities for an active subscriber", "Subscription Activities", { auth: true, success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/subscription-activities", "get", "List subscription activities", "Subscription Activities", { admin: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/admin/subscription-activities", "post", "Create a subscription activity", "Subscription Activities", { admin: true, requestBody: { type: "object", required: ["slug", "title", "description", "contentType"], properties: { slug: { type: "string" }, title: { type: "string" }, description: { type: "string" }, contentType: { type: "string", description: "GUIDE, VIDEO, or WORKSHEET." }, videoUrl: { type: "string", format: "uri" }, guideUrl: { type: "string", format: "uri" }, thumbnailUrl: { type: "string", format: "uri" }, ageMin: { type: "integer", minimum: 0 }, ageMax: { type: "integer", minimum: 0 }, sortOrder: { type: "integer", minimum: 0 }, isPublished: { type: "boolean" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "500"] });
  add("/api/admin/subscription-activities/{id}", "patch", "Update a subscription activity", "Subscription Activities", { admin: true, parameters: [pathParam("id", "Activity ID.")], requestBody: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, contentType: { type: "string" }, videoUrl: { type: "string", format: "uri", nullable: true }, guideUrl: { type: "string", format: "uri", nullable: true }, thumbnailUrl: { type: "string", format: "uri", nullable: true }, ageMin: { type: "integer", minimum: 0, nullable: true }, ageMax: { type: "integer", minimum: 0, nullable: true }, sortOrder: { type: "integer", minimum: 0 }, isPublished: { type: "boolean" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/admin/subscription-activities/{id}", "delete", "Delete a subscription activity", "Subscription Activities", { admin: true, parameters: [pathParam("id", "Activity ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/children", "get", "List current user's child profiles", "Child Profiles", { auth: true, success: arraySchema(), errorCodes: ["401", "500"] });
  add("/api/children", "post", "Create a child profile and personalization preferences", "Child Profiles", { auth: true, requestBody: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 120 }, birthDate: { type: "string", format: "date" }, gender: { type: "string" }, learningLevel: { type: "string" }, learningStyle: { type: "string" }, interests: { type: "array", items: { type: "string" } }, favoriteThemes: { type: "array", items: { type: "string" } }, allergies: { type: "string" }, personalizationNotes: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "500"] });
  add("/api/children/{id}", "get", "Get a child profile", "Child Profiles", { auth: true, parameters: [pathParam("id", "Child profile ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/children/{id}", "patch", "Update a child profile and personalization preferences", "Child Profiles", { auth: true, parameters: [pathParam("id", "Child profile ID.")], requestBody: { type: "object", properties: { name: { type: "string", maxLength: 120 }, birthDate: { type: "string", format: "date", nullable: true }, gender: { type: "string", nullable: true }, learningLevel: { type: "string", nullable: true }, learningStyle: { type: "string", nullable: true }, interests: { type: "array", items: { type: "string" } }, favoriteThemes: { type: "array", items: { type: "string" } }, allergies: { type: "string", nullable: true }, personalizationNotes: { type: "string", nullable: true }, isActive: { type: "boolean" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });
  add("/api/children/{id}", "delete", "Delete a child profile", "Child Profiles", { auth: true, parameters: [pathParam("id", "Child profile ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/points", "get", "Get current user points", "Rewards", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/games/visit", "post", "Record a logged-in user's visit to an external web game and award limited engagement points", "Games", { auth: true, requestBody: { type: "object", required: ["gameId"], properties: { gameId: { type: "string", enum: ["pacu-jalur", "panjat-pinang", "dino-escape", "angkasa-rasa"] } } }, success: { type: "object", properties: { awarded: { type: "boolean" }, reason: { type: "string", enum: ["already_awarded", "daily_limit_reached"] }, pointsAwarded: { type: "integer" }, pointsToday: { type: "integer" }, dailyLimit: { type: "integer" }, balance: { type: "integer" } } }, errorCodes: ["400", "401", "404", "429", "500"] });
  add("/api/games/launch", "post", "Create a short-lived launch URL for an external web game", "Games", { auth: true, requestBody: { type: "object", required: ["gameId"], properties: { gameId: { type: "string", enum: ["pacu-jalur", "panjat-pinang", "dino-escape", "angkasa-rasa"] } } }, success: objectSchema, errorCodes: ["400", "401", "404", "429", "503"] });
  add("/api/games/{gameId}/complete", "post", "Record completion from an external web game and award limited points", "Games", { parameters: [pathParam("gameId", "Game identifier.")], requestBody: { type: "object", required: ["launchToken"], properties: { launchToken: { type: "string" } } }, security: [{ GameApiKey: [] }], success: objectSchema, errorCodes: ["400", "401", "403", "404", "500", "503"] });
  add("/api/vouchers", "get", "List voucher catalog and owned vouchers", "Rewards", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/vouchers", "post", "Exchange points for a voucher", "Rewards", { auth: true, requestBody: { type: "object", required: ["voucherId"], properties: { voucherId: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "409", "500"] });
  add("/api/auth/register", "post", "Register user", "Authentication", { requestBody: { type: "object", required: ["name", "email", "password"], properties: { name: { type: "string" }, email: { type: "string", format: "email" }, password: { type: "string", format: "password" }, confirmPassword: { type: "string", format: "password" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "409", "429", "500"] });
  add("/api/auth/forgot-password", "post", "Request a password reset OTP by email", "Authentication", { requestBody: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } }, success: objectSchema, errorCodes: ["400", "404", "429", "503"] });
  add("/api/auth/reset-password", "post", "Reset password with a one-time OTP", "Authentication", { requestBody: { type: "object", required: ["email", "otp", "newPassword"], properties: { email: { type: "string", format: "email" }, otp: { type: "string", pattern: "^\\d{6}$", description: "6-digit OTP sent by email" }, newPassword: { type: "string", format: "password" } } }, success: objectSchema, errorCodes: ["400", "429", "500"] });
  add("/api/auth/{nextauth}", "get", "NextAuth handler", "Authentication", { parameters: [pathParam("nextauth", "NextAuth action such as csrf, session, or providers.")], success: objectSchema, errorCodes: ["400", "500"] });
  add("/api/auth/{nextauth}", "post", "NextAuth callback handler", "Authentication", { parameters: [pathParam("nextauth", "NextAuth action.")], success: objectSchema, errorCodes: ["400", "401", "500"] });
  add("/api/cron/orders", "get", "Expire unpaid retail orders and send expiration emails", "System", { requestBody: { type: "object" }, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/cron/orders", "post", "Expire unpaid retail orders and send expiration emails", "System", { requestBody: { type: "object" }, success: objectSchema, errorCodes: ["401", "500"] });

  // User profile and account management.
  add("/api/user/profile", "get", "Get current user profile and stats", "Profile", { auth: true, success: objectSchema, errorCodes: ["401", "404", "500"] });
  add("/api/user/profile", "patch", "Update user profile details", "Profile", { auth: true, requestBody: { type: "object", properties: { name: { type: "string" }, whatsapp: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "500"] });
  add("/api/user/profile/avatar", "post", "Upload user profile avatar image", "Profile", { auth: true, requestBody: { type: "object", description: "multipart/form-data with 'avatar' file" }, success: objectSchema, errorCodes: ["400", "401", "500"] });
  add("/api/user/profile/avatar", "delete", "Delete user profile avatar image", "Profile", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/user/profile/change-password", "post", "Change password for logged-in user", "Profile", { auth: true, requestBody: { type: "object", required: ["currentPassword", "newPassword", "confirmPassword"], properties: { currentPassword: { type: "string", format: "password" }, newPassword: { type: "string", format: "password" }, confirmPassword: { type: "string", format: "password" } } }, success: objectSchema, errorCodes: ["400", "401", "404", "500"] });

  // Shipping and external service adapters.
  add("/api/shipping/destinations", "get", "Search shipping destinations", "Shipping", { parameters: [queryParam("search", "Destination search query.")], success: arraySchema(), errorCodes: ["400", "500"] });
  add("/api/shipping/cost", "post", "Calculate shipping cost", "Shipping", { requestBody: { type: "object", required: ["destinationId", "weightGrams", "courier"], properties: { destinationId: { type: "string" }, weightGrams: { type: "integer", minimum: 1 }, courier: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "500"] });
  add("/api/shipping/reverse-geocode", "get", "Reverse geocode coordinates", "Shipping", { parameters: [queryParam("latitude", "Latitude."), queryParam("longitude", "Longitude.")], success: objectSchema, errorCodes: ["400", "500"] });
  add("/api/webhooks/midtrans", "get", "Check Midtrans webhook status", "Webhooks", { success: objectSchema, errorCodes: ["500"] });
  add("/api/webhooks/midtrans", "post", "Process Midtrans notification", "Webhooks", { requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "500"] });
  add("/api/webhooks/winpay", "post", "Process WinPay Checkout Page callback with signature verification", "Webhooks", { requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "500"] });

  // Admin API.
  add("/api/admin/analytics", "get", "Get admin analytics", "Admin", { admin: true, success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/points", "post", "Adjust user points", "Admin", { admin: true, requestBody: { type: "object", required: ["userId", "pointsDelta"], properties: { userId: { type: "string" }, pointsDelta: { type: "integer", description: "Positive adds points; negative removes points." }, reason: { type: "string" }, referenceId: { type: "string" }, idempotencyKey: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "404", "409", "500"] });
  add("/api/admin/vouchers", "get", "List voucher catalog", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/vouchers", "post", "Create voucher catalog item", "Admin", { admin: true, requestBody: { type: "object", properties: { code: { type: "string" }, title: { type: "string" }, description: { type: "string" }, pointsCost: { type: "integer" }, discountAmount: { type: "integer" }, expiresAt: { type: "string", format: "date-time" }, status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE"] } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/vouchers/{id}", "patch", "Update voucher catalog item", "Admin", { admin: true, parameters: [pathParam("id", "Voucher ID.")], requestBody: { type: "object", properties: { status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE"] }, isActive: { type: "boolean" } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/vouchers/{id}", "put", "Replace voucher catalog item", "Admin", { admin: true, parameters: [pathParam("id", "Voucher ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/vouchers/{id}", "delete", "Delete voucher catalog item", "Admin", { admin: true, parameters: [pathParam("id", "Voucher ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "409", "500"] });
  add("/api/admin/customers", "get", "List customers with order and points summary", "Admin", { admin: true, parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page."), queryParam("search", "Search by name, email, or WhatsApp.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/inventory", "get", "List stock by location and inventory movements", "Admin", { admin: true, parameters: [queryParam("productId", "Filter movements by product ID."), queryParam("location", "ONLINE_WAREHOUSE or MARICA_STORE."), queryParam("type", "PURCHASE, ADJUSTMENT, RETURN, RESERVATION, RELEASE, or TRANSFER."), queryParam("search", "Filter the product list by name."), queryParam("page", "Movement page number."), queryParam("limit", "Movement page size."), queryParam("productsPage", "Product list page number."), queryParam("productsLimit", "Product list page size.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/inventory", "post", "Adjust stock at a location or transfer stock between locations", "Admin", { admin: true, requestBody: { type: "object", required: ["productId", "quantityDelta", "type"], properties: { productId: { type: "string" }, quantityDelta: { type: "integer", description: "Nonzero delta for adjustments. Transfers use a positive quantity." }, type: { type: "string", enum: ["PURCHASE", "ADJUSTMENT", "RETURN", "RESERVATION", "RELEASE", "TRANSFER"] }, location: { type: "string", enum: ["ONLINE_WAREHOUSE", "MARICA_STORE"], description: "Required except for TRANSFER." }, fromLocation: { type: "string", enum: ["ONLINE_WAREHOUSE", "MARICA_STORE"], description: "Required for TRANSFER." }, toLocation: { type: "string", enum: ["ONLINE_WAREHOUSE", "MARICA_STORE"], description: "Required for TRANSFER; must differ from fromLocation." }, reason: { type: "string" }, referenceId: { type: "string" } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "404", "409", "500"] });
  add("/api/admin/articles", "get", "List admin articles", "Admin", { admin: true, parameters: [queryParam("status", "DRAFT or PUBLISHED."), queryParam("media", "Use video to list articles configured for Video Showcase."), queryParam("page", "Page number."), queryParam("limit", "Items per page.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/articles", "post", "Create article with optional video showcase metadata and product widget placements", "Admin", { admin: true, requestBody: { type: "object", properties: { title: { type: "string" }, content: { type: "string" }, videoUrl: { type: "string", format: "uri", nullable: true }, videoProvider: { type: "string", nullable: true }, videoDurationSeconds: { type: "integer", minimum: 0, nullable: true }, isVideoFeatured: { type: "boolean" }, productIds: { type: "array", maxItems: 8, uniqueItems: true, items: { type: "string" }, description: "Optional ordered list of active product IDs displayed in the article widget." } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/articles/{id}", "get", "Get admin article", "Admin", { admin: true, parameters: [pathParam("id", "Article ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/articles/{id}", "put", "Update article and optional video showcase metadata", "Admin", { admin: true, parameters: [pathParam("id", "Article ID.")], requestBody: { type: "object", properties: { videoUrl: { type: "string", format: "uri", nullable: true }, videoProvider: { type: "string", nullable: true }, videoDurationSeconds: { type: "integer", minimum: 0, nullable: true }, isVideoFeatured: { type: "boolean" }, productIds: { type: "array", maxItems: 8, uniqueItems: true, items: { type: "string" }, description: "If provided, replaces the article's product placements; [] removes all." } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/articles/{id}", "delete", "Delete article", "Admin", { admin: true, parameters: [pathParam("id", "Article ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/article-categories", "get", "List article categories for admin", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/article-categories", "post", "Create article category", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/article-categories/{id}", "put", "Update article category", "Admin", { admin: true, parameters: [pathParam("id", "Category ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/article-categories/{id}", "delete", "Delete article category", "Admin", { admin: true, parameters: [pathParam("id", "Category ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/products", "get", "List products for admin", "Admin", { admin: true, parameters: [queryParam("status", "in_stock, out_of_stock, or inactive."), queryParam("search", "Search product name."), queryParam("category", "Category slug.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/products", "post", "Create product", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/products/{id}", "get", "Get admin product", "Admin", { admin: true, parameters: [pathParam("id", "Product ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/products/{id}", "put", "Update product", "Admin", { admin: true, parameters: [pathParam("id", "Product ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/products/{id}", "delete", "Delete product", "Admin", { admin: true, parameters: [pathParam("id", "Product ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/product-categories", "get", "List product categories for admin", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/product-categories", "post", "Create product category", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/product-categories/{id}", "put", "Update product category", "Admin", { admin: true, parameters: [pathParam("id", "Category ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/product-categories/{id}", "delete", "Delete product category", "Admin", { admin: true, parameters: [pathParam("id", "Category ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/product-bundles", "get", "List product bundles", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/product-bundles", "post", "Create product bundle", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/product-bundles/{id}", "put", "Update product bundle", "Admin", { admin: true, parameters: [pathParam("id", "Bundle ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/product-bundles/{id}", "delete", "Delete product bundle", "Admin", { admin: true, parameters: [pathParam("id", "Bundle ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/orders", "get", "List all orders", "Admin", { admin: true, parameters: [queryParam("status", "Order status."), queryParam("page", "Page number."), queryParam("limit", "Items per page."), queryParam("search", "Search order number or email.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/orders/{id}", "put", "Update order status and fulfillment details", "Admin", { admin: true, parameters: [pathParam("id", "Order ID.")], requestBody: { type: "object", required: ["status"], properties: { status: { type: "string" }, trackingNumber: { type: "string", nullable: true }, shippingCourier: { type: "string", nullable: true }, fulfillmentNote: { type: "string", nullable: true } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/events", "get", "List events for admin", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/events", "post", "Create event", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/events/{id}", "get", "Get admin event", "Admin", { admin: true, parameters: [pathParam("id", "Event ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/events/{id}", "patch", "Update event", "Admin", { admin: true, parameters: [pathParam("id", "Event ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/events/{id}", "delete", "Delete event", "Admin", { admin: true, parameters: [pathParam("id", "Event ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/bookings", "get", "List recent event, Playpass, and table reservations", "Admin", { admin: true, success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/event-bookings", "get", "List event bookings", "Admin", { admin: true, parameters: [queryParam("status", "Booking status."), queryParam("page", "Page number."), queryParam("limit", "Items per page.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/event-bookings/{bookingNumber}/resend-email", "post", "Resend event ticket email", "Admin", { admin: true, parameters: [pathParam("bookingNumber", "Booking number.")], success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/printables", "get", "List printables for admin", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/printables", "post", "Create printable", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/printables/{id}", "patch", "Update printable", "Admin", { admin: true, parameters: [pathParam("id", "Printable ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/printables/{id}", "delete", "Delete printable", "Admin", { admin: true, parameters: [pathParam("id", "Printable ID.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/printable-leads", "get", "List printable leads", "Admin", { admin: true, parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page.")], success: objectSchema, errorCodes: ["401", "403", "500"] });
  add("/api/admin/upload", "post", "Upload admin image", "Admin", { admin: true, requestBody: { type: "object", description: "multipart/form-data upload payload" }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/printables/upload", "post", "Upload printable PDF", "Admin", { admin: true, requestBody: { type: "object", description: "multipart/form-data PDF upload payload" }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/b2b/inquiries", "get", "List B2B inquiries", "Admin", { admin: true, parameters: [queryParam("page", "Page number."), queryParam("limit", "Items per page; maximum 50."), queryParam("status", "NEW, CONTACTED, QUOTED, WON, LOST, or IN_PROGRESS (CONTACTED + QUOTED)."), queryParam("organizationType", "Filter by organization type, such as SCHOOL or CORPORATE."), queryParam("dateFrom", "Filter created date from YYYY-MM-DD."), queryParam("dateTo", "Filter created date through YYYY-MM-DD."), queryParam("search", "Search inquiry number, organization, contact, or email."), queryParam("sortBy", "createdAt, organizationName, eventDate, or status."), queryParam("sortOrder", "asc or desc; defaults to desc.")], success: objectSchema, errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/b2b/summary", "get", "Get B2B dashboard summary counts", "Admin", { admin: true, parameters: [queryParam("organizationType", "Filter by organization type."), queryParam("dateFrom", "Filter created date from YYYY-MM-DD."), queryParam("dateTo", "Filter created date through YYYY-MM-DD.")], success: objectSchema, errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/b2b/inquiries/{inquiryNumber}", "get", "Get B2B inquiry detail and quotation", "Admin", { admin: true, parameters: [pathParam("inquiryNumber", "B2B inquiry number.")], success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/b2b/inquiries/{inquiryNumber}", "patch", "Update B2B inquiry status or admin notes", "Admin", { admin: true, parameters: [pathParam("inquiryNumber", "B2B inquiry number.")], requestBody: { type: "object", properties: { status: { type: "string", enum: ["NEW", "CONTACTED", "QUOTED", "WON", "LOST"] }, adminNotes: { type: "string" } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/b2b/inquiries/{inquiryNumber}/quotation", "post", "Create or replace a B2B quotation", "Admin", { admin: true, parameters: [pathParam("inquiryNumber", "B2B inquiry number.")], requestBody: { type: "object", required: ["items"], properties: { validUntil: { type: "string", format: "date" }, items: { type: "array", items: { type: "object", required: ["name", "quantity", "unitPrice"], properties: { name: { type: "string" }, description: { type: "string" }, quantity: { type: "integer", minimum: 1 }, unitPrice: { type: "integer", minimum: 0 }, discount: { type: "integer", minimum: 0 } } } } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "404", "500"] });
  add("/api/admin/b2b/inquiries/{inquiryNumber}/quotation/pdf", "get", "Download B2B quotation as PDF", "Admin", { admin: true, parameters: [pathParam("inquiryNumber", "B2B inquiry number.")], success: { type: "string", format: "binary" }, errorCodes: ["401", "403", "404", "409", "500"] });
  add("/api/admin/b2b/inquiries/{inquiryNumber}/quotation/send", "post", "Send B2B quotation by email", "Admin", { admin: true, parameters: [pathParam("inquiryNumber", "B2B inquiry number.")], success: objectSchema, errorCodes: ["401", "403", "404", "409", "502"] });
  add("/api/admin/preorders", "get", "List pre-order campaigns", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/preorders", "post", "Create pre-order campaign", "Admin", { admin: true, requestBody: { type: "object", required: ["productId", "slug", "title", "description", "price", "preorderOpenAt", "releaseAt"], properties: { productId: { type: "string" }, slug: { type: "string" }, title: { type: "string" }, description: { type: "string" }, price: { type: "integer", minimum: 0 }, preorderOpenAt: { type: "string", format: "date-time" }, preorderCloseAt: { type: "string", format: "date-time" }, releaseAt: { type: "string", format: "date-time" }, stockLimit: { type: "integer", minimum: 1 }, status: { type: "string", enum: ["DRAFT", "PUBLISHED", "CLOSED", "COMPLETED"] } } }, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/preorders/{id}", "patch", "Update pre-order campaign", "Admin", { admin: true, parameters: [pathParam("id", "Pre-order campaign ID.")], requestBody: objectSchema, success: objectSchema, errorCodes: ["401", "403", "404", "500"] });
  add("/api/admin/subscription-plans", "get", "List subscription plans", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });
  add("/api/admin/subscription-plans", "post", "Create subscription plan", "Admin", { admin: true, requestBody: objectSchema, success: objectSchema, successStatus: "201", errorCodes: ["400", "401", "403", "500"] });
  add("/api/admin/subscription-plans/{id}", "patch", "Update subscription plan", "Admin", { admin: true, parameters: [pathParam("id", "Subscription plan ID.")], requestBody: { type: "object", required: ["name", "description", "price", "interval"], properties: { slug: { type: "string" }, name: { type: "string" }, description: { type: "string" }, price: { type: "integer", minimum: 0 }, interval: { type: "string", enum: ["MONTHLY", "QUARTERLY"] }, isActive: { type: "boolean" } } }, success: objectSchema, errorCodes: ["400", "401", "403", "404"] });
  add("/api/admin/subscription-plans/{id}", "delete", "Deactivate subscription plan", "Admin", { admin: true, parameters: [pathParam("id", "Subscription plan ID.")], success: objectSchema, errorCodes: ["401", "403", "404"] });
  add("/api/admin/subscriptions", "get", "List customer subscriptions and delivery status", "Admin", { admin: true, success: arraySchema(), errorCodes: ["401", "403", "500"] });

  add("/api/swagger", "get", "Get OpenAPI document", "Documentation", { success: objectSchema, errorCodes: ["500"] });
  add("/api/notifications", "get", "Get the current user's latest notifications and unread count", "Notifications", { auth: true, success: { type: "object", properties: { notifications: arraySchema(), unreadCount: { type: "integer" } } }, errorCodes: ["401", "500"] });
  add("/api/notifications", "patch", "Mark all notifications for the current user as read", "Notifications", { auth: true, success: objectSchema, errorCodes: ["401", "500"] });
  add("/api/notifications/{id}", "patch", "Mark one notification as read", "Notifications", { auth: true, parameters: [pathParam("id", "Notification ID.")], success: objectSchema, errorCodes: ["401", "404", "500"] });

  return {
    openapi: "3.0.3",
    info: {
      title: "Marica API",
      version: "2.0.0",
      description: "Dokumentasi API untuk website, katalog, checkout, event, printable, artikel, autentikasi, dan admin Marica.",
    },
    servers: [
      { url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", description: "Configured API server" },
      { url: "http://localhost:3000", description: "Local development" },
    ],
    tags: [
      { name: "Authentication", description: "Registrasi dan pemulihan akun." },
      { name: "Profile", description: "Profil, foto profil, dan kata sandi user yang sedang login." },
      { name: "Content", description: "Konten landing page." },
      { name: "Catalog", description: "Produk dan kategori produk." },
      { name: "Recommendations", description: "Rekomendasi produk dan event perilaku pengguna." },
      { name: "Cart", description: "Keranjang user yang sedang login." },
      { name: "Orders", description: "Checkout dan pesanan." },
      { name: "Events", description: "Event, booking, dan tiket." },
      { name: "Tickets", description: "E-ticket dan check-in QR." },
      { name: "Playpass", description: "Paket Playpass, slot, booking, dan tiket online." },
      { name: "Table reservation", description: "Reservasi meja/space, slot, dan check-in." },
      { name: "F&B", description: "Menu makanan/minuman dan pre-order booking." },
      { name: "Printables", description: "Materi aktivitas dan download." },
      { name: "Games", description: "Kunjungan game eksternal dan engagement points yang dibatasi." },
      { name: "Articles", description: "Artikel dan komentar." },
      { name: "Shipping", description: "Destinasi dan ongkos kirim." },
      { name: "Marketing", description: "Newsletter." },
      { name: "B2B", description: "Inquiry dan quotation untuk sekolah, corporate, komunitas, dan rombongan." },
      { name: "Rewards", description: "Saldo dan riwayat Marica Points." },
      { name: "Admin", description: "Endpoint yang membutuhkan role ADMIN." },
      { name: "Cashier", description: "Endpoint POS dan operasional toko untuk role KASIR." },
      { name: "Webhooks", description: "Callback dari payment provider." },
      { name: "Documentation", description: "Endpoint dokumentasi API." },
    ],
    paths,
    components: {
      securitySchemes: {
        SessionCookie: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description: "Session cookie Auth.js. Pada HTTPS production dapat menggunakan __Secure-authjs.session-token.",
        },
        GameApiKey: {
          type: "apiKey",
          in: "header",
          name: "x-game-api-key",
          description: "Kunci server-to-server khusus untuk setiap game. Jangan pernah disimpan di browser atau aplikasi mobile.",
        },
      },
    },
  };
};
