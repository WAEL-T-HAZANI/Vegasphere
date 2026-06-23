const { ApiError } = require("../../services/http-error.js");
const { hashSecret, compareSecret } = require("../../services/password-hash.js");

const User = require("../../models/User.js");

const setTwoStepPin = async (req, res) => {
    const raw = req.body?.pin;
    const pin = String(raw || "").trim();
    if (!/^\d{4,8}$/.test(pin)) {
      throw ApiError.badRequest("PIN must be 4-8 digits");
    }
    const user = await User.findById(req.user.id).select("+twoStepPinHash");
    if (!user) throw ApiError.notFound("User not found");

    user.twoStepPinHash = await hashSecret(pin);
    user.twoStepEnabled = true;
    await user.save();
    return res.json({ ok: true, twoStepEnabled: true });
  
};

const disableTwoStep = async (req, res) => {
    const raw = req.body?.pin;
    const pin = String(raw || "").trim();
    const user = await User.findById(req.user.id).select("+twoStepPinHash");
    if (!user) throw ApiError.notFound("User not found");

    if (user.twoStepEnabled && user.twoStepPinHash) {
      if (!pin) throw ApiError.badRequest("PIN required");
      const ok = await compareSecret(pin, user.twoStepPinHash);
      if (!ok) throw ApiError.badRequest("Invalid PIN");
    }
    user.twoStepEnabled = false;
    user.twoStepPinHash = "";
    await user.save();
    return res.json({ ok: true, twoStepEnabled: false });
  
};

module.exports = {
  setTwoStepPin,
  disableTwoStep,
};
