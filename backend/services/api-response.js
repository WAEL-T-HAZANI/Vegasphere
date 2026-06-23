/**
 * Standard success envelope: { success: true, data, message? }
 * Errors go through ApiError + error_handler → { success: false, message, details }
 */

function ok(res, data = null, { status = 200, message = null } = {}) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}

function created(res, data = null, message = null) {
  return ok(res, data, { status: 201, message: message || undefined });
}

function sendExport(res, payload, filename) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2),
  );
}

module.exports = { ok, created, sendExport };
