const sessionContextByTo = new Map();

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function extractInboundRoot(payload) {
  if (!payload || typeof payload !== "object") return {};
  if (payload.message && typeof payload.message === "object") return payload.message;
  if (payload.data && typeof payload.data === "object") return payload.data;
  return payload;
}

function getInboundText(root) {
  return firstDefined(
    root?.normalized?.content?.text,
    root?.content?.text,
    root?.text,
    root?.message?.text
  );
}

function getInboundFrom(root) {
  return firstDefined(
    root?.normalized?.from,
    root?.from,
    root?.message?.from
  );
}

function getDeviceId(root, headers = {}) {
  return firstDefined(
    root?.deviceId,
    root?.device?.id,
    headers["x-device-id"],
    headers["X-Device-Id"]
  );
}

function getTenantId(root, headers = {}) {
  return firstDefined(
    root?.tenantId,
    root?.tenant?.id,
    headers["x-tenant-id"],
    headers["X-Tenant-Id"]
  );
}

function isMetaPayload(payload) {
  return !!payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
}

function isWhatsappConnectPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const root = extractInboundRoot(payload);
  const hasEvent =
    payload?.event === "message.inbound" ||
    root?.event === "message.inbound" ||
    payload?.type === "message.inbound";
  const hasNormalized = !!root?.normalized;
  const hasDevice = !!getDeviceId(root);
  const hasFrom = !!getInboundFrom(root);
  return hasEvent || (hasNormalized && hasDevice && hasFrom);
}

function saveSessionContext(to, context) {
  if (!to) return;
  sessionContextByTo.set(String(to), {
    deviceId: context.deviceId,
    tenantId: context.tenantId,
    provider: "whatsapp-connect-v2",
    updatedAt: Date.now(),
  });
}

function getSessionContext(to) {
  if (!to) return null;
  return sessionContextByTo.get(String(to)) || null;
}

function normalizeIncomingPayload(payload, headers = {}) {
  if (isMetaPayload(payload)) return payload;
  if (!isWhatsappConnectPayload(payload)) return payload;

  const root = extractInboundRoot(payload);
  const from = getInboundFrom(root);
  const textBody = getInboundText(root);
  const deviceId = getDeviceId(root, headers);
  const tenantId = getTenantId(root, headers);

  if (!from) return payload;

  saveSessionContext(from, { deviceId, tenantId });

  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from,
                  type: "text",
                  text: { body: textBody || "" },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

module.exports = {
  isMetaPayload,
  isWhatsappConnectPayload,
  normalizeIncomingPayload,
  getSessionContext,
};
