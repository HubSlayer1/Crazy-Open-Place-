export interface Env {
  DB: D1Database;
  APP_BRIDGE_SECRET: string;
  ENVIRONMENT?: string;
  OFFICIAL_PROVIDER_URL?: string;
}

export type DispatchAction =
  | 'storefront.get'
  | 'packages.list'
  | 'order.create'
  | 'order.get'
  | 'order.cancel'
  | 'order.timeline.list'
  | 'order.payment.submit'
  | 'order.activation.submit'
  | 'order.refund.create'
  | 'order.support.create'
  | 'track.lookup'
  | 'admin.session.create'
  | 'admin.session.validate'
  | 'admin.session.revoke'
  | 'admin.login.attempt.record'
  | 'admin.login.attempts.recent'
  | 'admin.dashboard'
  | 'admin.orders.list'
  | 'admin.payment.verify'
  | 'admin.order.update'
  | 'admin.packages.create'
  | 'admin.packages.update'
  | 'admin.packages.delete'
  | 'admin.settings.update'
  | 'admin.refunds.update'
  | 'admin.redeem.create'
  | 'admin.redeem.assign'
  | 'admin.redeem.delete'
  | 'admin.support.reply'
  | 'admin.contacts.update'
  | 'admin.audit.list'
  | 'migration.import.batch'
  | 'migration.verify.counts'
  | 'speedTests.list'
  | 'speedTests.create'
  | 'speedTests.delete'
  | 'speedTests.clear'
  | 'uidLookups.list'
  | 'uidLookups.create'
  | 'uidLookups.delete'
  | 'uidLookups.clear'
  | 'contact.create';

export interface DispatchRequest {
  action: DispatchAction;
  payload?: Record<string, unknown>;
}

export class WorkerAppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
