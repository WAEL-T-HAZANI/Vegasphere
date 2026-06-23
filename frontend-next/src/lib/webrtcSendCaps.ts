// @ts-nocheck
const maxVideo = Number(
  process.env.NEXT_PUBLIC_WEBRTC_MAX_VIDEO_BITRATE || 1_200_000
);
const maxAudio = Number(
  process.env.NEXT_PUBLIC_WEBRTC_MAX_AUDIO_BITRATE || 32000
);

export async function applyOutboundRtpCaps(pc) {
  if (!pc || typeof pc.getSenders !== "function") return;
  for (const sender of pc.getSenders()) {
    const track = sender.track;
    if (!track) continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const enc = params.encodings[0];
      if (track.kind === "video") enc.maxBitrate = maxVideo;
      else if (track.kind === "audio") enc.maxBitrate = maxAudio;
      await sender.setParameters(params);
    } catch {
      /* setParameters unsupported or rejected */
    }
  }
}
