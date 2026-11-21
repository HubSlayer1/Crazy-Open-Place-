CREATE INDEX IF NOT EXISTS idx_orders_order_reference ON orders(order_reference);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_service_status ON orders(service_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_hash ON orders(tracking_token_hash);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order_id ON order_timeline(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_provider_tx_order_id ON provider_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_provider_tx_provider_id ON provider_transactions(provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_refund_history_refund_id ON refund_history(refund_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON support_tickets(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_packages_active_sort ON packages(active, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token_hash ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time ON admin_login_attempts(ip_address, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON admin_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_speed_tests_client_created ON speed_tests(client_ref, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uid_lookups_client_created ON uid_lookups(client_ref, queried_at DESC);

INSERT OR IGNORE INTO schema_migrations (id, applied_at)
VALUES ('0002_indexes', '2026-11-18T00:00:00.000Z');
