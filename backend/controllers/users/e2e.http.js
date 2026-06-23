const { ApiError } = require("../../services/http-error.js");
const User = require("../../models/User.js");

const setE2ePublicKey = async (req, res) => {
    const pk = (req.body?.publicKey || "").trim();
    if (!pk || pk.length < 40) {
      throw ApiError.badRequest("Invalid public key");
    }
    await User.findByIdAndUpdate(req.user.id, { e2ePublicKey: pk });
    res.json({ ok: true });
  
};

const getE2ePublicKey = async (req, res) => {
    const u = await User.findById(req.user.id).select("e2ePublicKey");
    res.json({ e2ePublicKey: u?.e2ePublicKey || "" });
  
};

module.exports = {
  setE2ePublicKey,
  getE2ePublicKey,
};
