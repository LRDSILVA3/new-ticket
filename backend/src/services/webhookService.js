const crypto = require('crypto');
const store = require('../db/store');

class WebhookService {
  /**
   * Dispatches an event payload to a tenant's configured webhook endpoint
   * @param {Object|string} tenantOrId Tenant instance or tenant ID/slug
   * @param {string} eventType e.g. 'ticket.created', 'ticket.called', 'ticket.qr_opened'
   * @param {Object} payload Event details
   */
  async dispatchWebhook(tenantOrId, eventType, payload) {
    try {
      const tenant = typeof tenantOrId === 'string' 
        ? store.getTenantBySlug(tenantOrId) 
        : tenantOrId;

      if (!tenant || !tenant.webhook_url) {
        return { skipped: true, reason: 'No webhook_url configured for tenant' };
      }

      const timestamp = new Date().toISOString();
      const bodyData = {
        event: eventType,
        timestamp,
        tenant_id: tenant.id,
        tenant_slug: tenant.slug,
        data: payload
      };

      const bodyString = JSON.stringify(bodyData);
      const secret = tenant.webhook_secret || 'default-secret';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(bodyString)
        .digest('hex');

      // Async dispatch using native fetch (Node 20+)
      const response = await fetch(tenant.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NextQueue-Event': eventType,
          'X-NextQueue-Signature': signature,
          'X-NextQueue-Tenant': tenant.slug,
          'User-Agent': 'NextQueue-Webhook-Engine/1.0'
        },
        body: bodyString,
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      const result = {
        success: response.ok,
        status: response.status,
        eventType,
        url: tenant.webhook_url,
        timestamp
      };

      // Log dispatch event in audit history
      store.logEvent({
        tenant_id: tenant.id,
        event_type: 'WEBHOOK_DISPATCHED',
        payload: {
          event: eventType,
          status: response.status,
          success: response.ok,
          url: tenant.webhook_url
        }
      });

      return result;
    } catch (err) {
      console.warn(`[Webhook] Dispatch failed for ${eventType}:`, err.message);
      return {
        success: false,
        error: err.message,
        eventType
      };
    }
  }

  /**
   * Test a tenant webhook with a sample ping event
   */
  async testWebhook(tenant, overrideUrl = null) {
    const targetUrl = overrideUrl || tenant.webhook_url;
    if (!targetUrl) {
      throw new Error('Nenhuma URL de webhook configurada. Informe uma URL para o disparo.');
    }

    const testPayload = {
      message: 'Disparo de teste da API NextQueue',
      test: true,
      ping: 'pong',
      generated_at: new Date().toISOString()
    };

    const targetTenant = {
      ...tenant,
      webhook_url: targetUrl
    };

    return this.dispatchWebhook(targetTenant, 'system.ping', testPayload);
  }
}

module.exports = new WebhookService();
