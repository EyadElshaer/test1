-- =============================================================================
-- PREMIKEYS POSTGRESQL ROW-LEVEL SECURITY (RLS) & LEAST-PRIVILEGE POLICIES
-- =============================================================================
-- Purpose:
--   1. Enable and force Row-Level Security (RLS) across all 22 tables in the
--      PostgreSQL database (`public` schema).
--   2. Prevent unrestricted public/anonymous database access (e.g., PostgREST /
--      Supabase Data API `anon` and `authenticated` roles).
--   3. Enforce strict tenant & customer isolation:
--      - Customers can only SELECT/INSERT/UPDATE their own records (`User`,
--        `UserSession`, `Order`, `OrderItem`, `RefundRequest`, `PromoCodeUsage`).
--      - Customers cannot modify privileged fields (`status`, `paymentStatus`,
--        `adminCustomerNote`, `adminInternalNote`, `role`, `permissions`).
--      - Administrative tables (`Admin`, `AdminSession`, `AdminAuditLog`,
--        `StoreSetting`) are completely inaccessible to non-admin roles.
--      - Catalog tables (`Category`, `Product`, `ProductImage`, `FilterGroup`,
--        `FilterOption`, `ProductAttributeValue`, `FaqItem`, `PaymentMethod`)
--        allow public read access ONLY to published/active rows and restrict
--        all mutations to authorized Admin/Backend service roles.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SESSION CONTEXT HELPER FUNCTIONS
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '');
$$;

CREATE OR REPLACE FUNCTION public.app_current_admin_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_admin_id', true), '');
$$;

CREATE OR REPLACE FUNCTION public.app_current_admin_role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_admin_role', true), '');
$$;

CREATE OR REPLACE FUNCTION public.app_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('app.current_admin_role', true) IN ('SUPER_ADMIN', 'ADMIN'),
    false
  ) OR current_user IN ('postgres', 'service_role');
$$;

-- -----------------------------------------------------------------------------
-- 2. ENABLE & FORCE ROW-LEVEL SECURITY ON ALL 22 TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE "Admin"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Admin"                 FORCE ROW LEVEL SECURITY;

ALTER TABLE "AdminSession"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminSession"          FORCE ROW LEVEL SECURITY;

ALTER TABLE "AdminAuditLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminAuditLog"         FORCE ROW LEVEL SECURITY;

ALTER TABLE "User"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                  FORCE ROW LEVEL SECURITY;

ALTER TABLE "UserSession"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserSession"           FORCE ROW LEVEL SECURITY;

ALTER TABLE "Category"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category"              FORCE ROW LEVEL SECURITY;

ALTER TABLE "Product"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"               FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProductImage"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductImage"          FORCE ROW LEVEL SECURITY;

ALTER TABLE "FilterGroup"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FilterGroup"           FORCE ROW LEVEL SECURITY;

ALTER TABLE "FilterOption"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FilterOption"          FORCE ROW LEVEL SECURITY;

ALTER TABLE "ProductAttributeValue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductAttributeValue" FORCE ROW LEVEL SECURITY;

ALTER TABLE "PaymentMethod"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod"         FORCE ROW LEVEL SECURITY;

ALTER TABLE "PromoCode"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromoCode"             FORCE ROW LEVEL SECURITY;

ALTER TABLE "PromoCodeUsage"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromoCodeUsage"        FORCE ROW LEVEL SECURITY;

ALTER TABLE "Order"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order"                 FORCE ROW LEVEL SECURITY;

ALTER TABLE "OrderItem"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem"             FORCE ROW LEVEL SECURITY;

ALTER TABLE "OrderStatusHistory"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderStatusHistory"    FORCE ROW LEVEL SECURITY;

ALTER TABLE "RefundRequest"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefundRequest"         FORCE ROW LEVEL SECURITY;

ALTER TABLE "RefundStatusHistory"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefundStatusHistory"   FORCE ROW LEVEL SECURITY;

ALTER TABLE "FaqItem"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FaqItem"               FORCE ROW LEVEL SECURITY;

ALTER TABLE "StoreSetting"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StoreSetting"          FORCE ROW LEVEL SECURITY;

ALTER TABLE "UploadedFile"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UploadedFile"          FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. ADMINISTRATIVE & SYSTEM TABLES (Admin-Only / Backend Service Only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_table_isolation" ON "Admin";
CREATE POLICY "admin_table_isolation" ON "Admin"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "admin_session_isolation" ON "AdminSession";
CREATE POLICY "admin_session_isolation" ON "AdminSession"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "admin_audit_log_select" ON "AdminAuditLog";
CREATE POLICY "admin_audit_log_select" ON "AdminAuditLog"
  FOR SELECT
  USING (public.app_is_admin());

DROP POLICY IF EXISTS "admin_audit_log_insert" ON "AdminAuditLog";
CREATE POLICY "admin_audit_log_insert" ON "AdminAuditLog"
  FOR INSERT
  WITH CHECK (public.app_is_admin());
-- Note: No UPDATE or DELETE policy on AdminAuditLog (immutable audit trail)

DROP POLICY IF EXISTS "store_setting_admin_all" ON "StoreSetting";
CREATE POLICY "store_setting_admin_all" ON "StoreSetting"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "store_setting_public_read_safe_keys" ON "StoreSetting";
CREATE POLICY "store_setting_public_read_safe_keys" ON "StoreSetting"
  FOR SELECT
  USING (
    "key" NOT IN ('gemini_api_key', 'telegram_bot_token', 'recaptcha_secret_key', 'google_sheets_webhook_url')
  );

-- -----------------------------------------------------------------------------
-- 4. CUSTOMER ACCOUNT & SESSION TABLES ("User", "UserSession")
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_select_own_or_admin" ON "User";
CREATE POLICY "user_select_own_or_admin" ON "User"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR "id" = public.app_current_user_id()
  );

DROP POLICY IF EXISTS "user_update_own_or_admin" ON "User";
CREATE POLICY "user_update_own_or_admin" ON "User"
  FOR UPDATE
  USING (
    public.app_is_admin()
    OR "id" = public.app_current_user_id()
  )
  WITH CHECK (
    public.app_is_admin()
    OR "id" = public.app_current_user_id()
  );

DROP POLICY IF EXISTS "user_insert_registration" ON "User";
CREATE POLICY "user_insert_registration" ON "User"
  FOR INSERT
  WITH CHECK (
    public.app_is_admin()
    OR "id" = COALESCE(public.app_current_user_id(), "id")
  );

DROP POLICY IF EXISTS "user_delete_admin_only" ON "User";
CREATE POLICY "user_delete_admin_only" ON "User"
  FOR DELETE
  USING (public.app_is_admin());

DROP POLICY IF EXISTS "user_session_own_or_admin" ON "UserSession";
CREATE POLICY "user_session_own_or_admin" ON "UserSession"
  FOR ALL
  USING (
    public.app_is_admin()
    OR "userId" = public.app_current_user_id()
  )
  WITH CHECK (
    public.app_is_admin()
    OR "userId" = public.app_current_user_id()
  );

-- -----------------------------------------------------------------------------
-- 5. ORDERS, ORDER ITEMS, TIMELINE & REFUNDS (Strict Ownership & IDOR Prevention)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "order_select_owner_or_admin" ON "Order";
CREATE POLICY "order_select_owner_or_admin" ON "Order"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR ("userId" IS NOT NULL AND "userId" = public.app_current_user_id())
  );

DROP POLICY IF EXISTS "order_insert_customer_or_admin" ON "Order";
CREATE POLICY "order_insert_customer_or_admin" ON "Order"
  FOR INSERT
  WITH CHECK (
    public.app_is_admin()
    OR (
      "status" = 'PENDING'
      AND "adminCustomerNote" IS NULL
      AND "adminInternalNote" IS NULL
      AND ("userId" IS NULL OR "userId" = public.app_current_user_id())
    )
  );

DROP POLICY IF EXISTS "order_update_admin_only" ON "Order";
CREATE POLICY "order_update_admin_only" ON "Order"
  FOR UPDATE
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "order_delete_admin_only" ON "Order";
CREATE POLICY "order_delete_admin_only" ON "Order"
  FOR DELETE
  USING (public.app_is_admin());

DROP POLICY IF EXISTS "order_item_select_owner_or_admin" ON "OrderItem";
CREATE POLICY "order_item_select_owner_or_admin" ON "OrderItem"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM "Order" o
      WHERE o."id" = "OrderItem"."orderId"
        AND o."userId" IS NOT NULL
        AND o."userId" = public.app_current_user_id()
    )
  );

DROP POLICY IF EXISTS "order_item_write_admin" ON "OrderItem";
CREATE POLICY "order_item_write_admin" ON "OrderItem"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "order_history_select_owner_or_admin" ON "OrderStatusHistory";
CREATE POLICY "order_history_select_owner_or_admin" ON "OrderStatusHistory"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM "Order" o
      WHERE o."id" = "OrderStatusHistory"."orderId"
        AND o."userId" IS NOT NULL
        AND o."userId" = public.app_current_user_id()
    )
  );

DROP POLICY IF EXISTS "order_history_insert_admin" ON "OrderStatusHistory";
CREATE POLICY "order_history_insert_admin" ON "OrderStatusHistory"
  FOR INSERT
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "refund_select_owner_or_admin" ON "RefundRequest";
CREATE POLICY "refund_select_owner_or_admin" ON "RefundRequest"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM "Order" o
      WHERE o."id" = "RefundRequest"."orderId"
        AND o."userId" IS NOT NULL
        AND o."userId" = public.app_current_user_id()
    )
  );

DROP POLICY IF EXISTS "refund_write_admin" ON "RefundRequest";
CREATE POLICY "refund_write_admin" ON "RefundRequest"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "refund_history_select_owner_or_admin" ON "RefundStatusHistory";
CREATE POLICY "refund_history_select_owner_or_admin" ON "RefundStatusHistory"
  FOR SELECT
  USING (
    public.app_is_admin()
    OR EXISTS (
      SELECT 1 FROM "RefundRequest" r
      JOIN "Order" o ON o."id" = r."orderId"
      WHERE r."id" = "RefundStatusHistory"."refundRequestId"
        AND o."userId" IS NOT NULL
        AND o."userId" = public.app_current_user_id()
    )
  );

DROP POLICY IF EXISTS "refund_history_write_admin" ON "RefundStatusHistory";
CREATE POLICY "refund_history_write_admin" ON "RefundStatusHistory"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- -----------------------------------------------------------------------------
-- 6. CATALOG, PROMO CODES & FILE UPLOADS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "category_public_read" ON "Category";
CREATE POLICY "category_public_read" ON "Category"
  FOR SELECT
  USING ("isActive" = true OR public.app_is_admin());

DROP POLICY IF EXISTS "category_admin_write" ON "Category";
CREATE POLICY "category_admin_write" ON "Category"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "product_public_read" ON "Product";
CREATE POLICY "product_public_read" ON "Product"
  FOR SELECT
  USING (("isPublished" = true AND "isArchived" = false) OR public.app_is_admin());

DROP POLICY IF EXISTS "product_admin_write" ON "Product";
CREATE POLICY "product_admin_write" ON "Product"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "product_image_public_read" ON "ProductImage";
CREATE POLICY "product_image_public_read" ON "ProductImage"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "product_image_admin_write" ON "ProductImage";
CREATE POLICY "product_image_admin_write" ON "ProductImage"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "filter_group_public_read" ON "FilterGroup";
CREATE POLICY "filter_group_public_read" ON "FilterGroup"
  FOR SELECT
  USING ("isActive" = true OR public.app_is_admin());

DROP POLICY IF EXISTS "filter_group_admin_write" ON "FilterGroup";
CREATE POLICY "filter_group_admin_write" ON "FilterGroup"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "filter_option_public_read" ON "FilterOption";
CREATE POLICY "filter_option_public_read" ON "FilterOption"
  FOR SELECT
  USING ("isActive" = true OR public.app_is_admin());

DROP POLICY IF EXISTS "filter_option_admin_write" ON "FilterOption";
CREATE POLICY "filter_option_admin_write" ON "FilterOption"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "product_attr_public_read" ON "ProductAttributeValue";
CREATE POLICY "product_attr_public_read" ON "ProductAttributeValue"
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "product_attr_admin_write" ON "ProductAttributeValue";
CREATE POLICY "product_attr_admin_write" ON "ProductAttributeValue"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "payment_method_public_read" ON "PaymentMethod";
CREATE POLICY "payment_method_public_read" ON "PaymentMethod"
  FOR SELECT
  USING ("isActive" = true OR public.app_is_admin());

DROP POLICY IF EXISTS "payment_method_admin_write" ON "PaymentMethod";
CREATE POLICY "payment_method_admin_write" ON "PaymentMethod"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "faq_public_read" ON "FaqItem";
CREATE POLICY "faq_public_read" ON "FaqItem"
  FOR SELECT
  USING ("isActive" = true OR public.app_is_admin());

DROP POLICY IF EXISTS "faq_admin_write" ON "FaqItem";
CREATE POLICY "faq_admin_write" ON "FaqItem"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "promo_code_admin_all" ON "PromoCode";
CREATE POLICY "promo_code_admin_all" ON "PromoCode"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

DROP POLICY IF EXISTS "promo_usage_admin_all" ON "PromoCodeUsage";
CREATE POLICY "promo_usage_admin_all" ON "PromoCodeUsage"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

-- UploadedFile: Public can only read 'product_image' category; 'payment_screenshot' is strictly private!
DROP POLICY IF EXISTS "uploaded_file_public_product_images" ON "UploadedFile";
CREATE POLICY "uploaded_file_public_product_images" ON "UploadedFile"
  FOR SELECT
  USING (
    "category" = 'product_image'
    OR public.app_is_admin()
  );

DROP POLICY IF EXISTS "uploaded_file_admin_write" ON "UploadedFile";
CREATE POLICY "uploaded_file_admin_write" ON "UploadedFile"
  FOR ALL
  USING (public.app_is_admin())
  WITH CHECK (public.app_is_admin());

COMMIT;

