// @ts-nocheck
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

const skKey = (userId) => `vegasphere_e2e_sk_${userId}`;
const pkKey = (userId) => `vegasphere_e2e_pk_${userId}`;
const convKeyKey = (conversationId) => `vegasphere_e2e_ck_${conversationId}`;

export function ensureE2eKeypair(userId) {
  if (typeof window === "undefined" || !userId) return null;
  const id = String(userId);
  const existingSk = localStorage.getItem(skKey(id));
  if (existingSk) {
    try {
      const secretKey = naclUtil.decodeBase64(existingSk);
      const pubB64 = localStorage.getItem(pkKey(id));
      const publicKey = pubB64 ? naclUtil.decodeBase64(pubB64) : null;
      if (publicKey && publicKey.length === nacl.box.publicKeyLength) {
        return { secretKey, publicKey };
      }
    } catch {
      /* fall through to regenerate */
    }
  }
  const pair = nacl.box.keyPair();
  localStorage.setItem(skKey(id), naclUtil.encodeBase64(pair.secretKey));
  localStorage.setItem(pkKey(id), naclUtil.encodeBase64(pair.publicKey));
  return pair;
}

export function getPublicKeyBase64(userId) {
  const p = ensureE2eKeypair(userId);
  return p ? naclUtil.encodeBase64(p.publicKey) : "";
}

export function wrapConversationKeyForUser(
  recipientPublicKeyB64,
  conversationKey32,
  senderSecretKey
) {
  const recipientPk = naclUtil.decodeBase64(recipientPublicKeyB64);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const boxed = nacl.box(
    conversationKey32,
    nonce,
    recipientPk,
    senderSecretKey
  );
  return {
    box: naclUtil.encodeBase64(boxed),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

export function unwrapConversationKey(
  issuerPublicKeyB64,
  boxB64,
  nonceB64,
  mySecretKey
) {
  const issuerPk = naclUtil.decodeBase64(issuerPublicKeyB64);
  const opened = nacl.box.open(
    naclUtil.decodeBase64(boxB64),
    naclUtil.decodeBase64(nonceB64),
    issuerPk,
    mySecretKey
  );
  if (!opened) throw new Error("unwrap failed");
  return opened;
}

export function getStoredConversationKey(conversationId) {
  if (typeof window === "undefined" || !conversationId) return null;
  const raw = localStorage.getItem(convKeyKey(String(conversationId)));
  if (!raw) return null;
  try {
    return naclUtil.decodeBase64(raw);
  } catch {
    return null;
  }
}

export function storeConversationKey(conversationId, key32) {
  localStorage.setItem(
    convKeyKey(String(conversationId)),
    naclUtil.encodeBase64(key32)
  );
}

export function generateConversationKey() {
  return nacl.randomBytes(nacl.secretbox.keyLength);
}

export function encryptMessageUtf8(plain, key32) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msg = new TextEncoder().encode(plain);
  const boxed = nacl.secretbox(msg, nonce, key32);
  return {
    box: naclUtil.encodeBase64(boxed),
    nonce: naclUtil.encodeBase64(nonce),
    version: 1,
  };
}

export function decryptMessageUtf8(boxB64, nonceB64, key32) {
  const opened = nacl.secretbox.open(
    naclUtil.decodeBase64(boxB64),
    naclUtil.decodeBase64(nonceB64),
    key32
  );
  if (!opened) throw new Error("decrypt failed");
  return new TextDecoder().decode(opened);
}
