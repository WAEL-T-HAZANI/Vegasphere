const User = require("../../models/User.js");
const Conversation = require("../../models/Conversation.js");
const NetworkingPost = require("../../models/NetworkingPost.js");
const { ApiError } = require("../../services/http-error.js");
const { wrapHttpHandlers } = require("../../services/async-handler.js");
const { defaultAvatarUrl } = require("../../services/avatar-utils.js");
const { publishNetworkingUpdated } = require("../../services/networking-notify.js");
const {
  applyPresencePrivacy,
  canViewerSeeUserField,
  filterDiscoverableUsers,
} = require("../users/helpers.js");

const USER_SELECT =
  "_id name username profilePic isOnline lastSeen showOnlineStatus showLastSeen lastSeenVisibility onlineVisibility profilePhotoVisibility aboutVisibility searchDiscoverable blockedUsers ignoredUserIds networkingHeadline networkingSkills networkingInterests networkingLookingFor networkingOpenToCollaborate";

function normalizeTag(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeTags(items) {
  return Array.from(
    new Set((Array.isArray(items) ? items : []).map(normalizeTag).filter(Boolean)),
  );
}

function hasNetworkingProfile(user) {
  if (!user) return false;
  return Boolean(
    String(user.networkingHeadline || "").trim() ||
      normalizeTags(user.networkingSkills).length ||
      normalizeTags(user.networkingInterests).length ||
      String(user.networkingLookingFor || "").trim(),
  );
}

function displayName(user) {
  return String(user?.name || user?.username || "").trim();
}

async function sanitizeNetworkingPeer(viewerId, user, { isSelf = false } = {}) {
  if (!user) return null;
  const id = String(user._id || user.id || "");
  const self = isSelf || String(viewerId || "") === id;

  const photoAllowed =
    self || (await canViewerSeeUserField(viewerId, user, "profilePhoto"));
  const lastSeenVisible =
    self || (await canViewerSeeUserField(viewerId, user, "lastSeen"));
  const onlineVisible =
    self || (await canViewerSeeUserField(viewerId, user, "online"));
  const presence = applyPresencePrivacy(viewerId, user, {
    lastSeenVisible,
    onlineVisible,
  });

  return {
    _id: user._id,
    name: displayName(user),
    username: user.username || "",
    profilePic: photoAllowed
      ? user.profilePic || ""
      : defaultAvatarUrl(user.name || user.username),
    isOnline: presence.isOnline,
    lastSeen: presence.lastSeen,
    networkingHeadline: user.networkingHeadline || "",
    networkingSkills: normalizeTags(user.networkingSkills),
    networkingInterests: normalizeTags(user.networkingInterests),
    networkingLookingFor: user.networkingLookingFor || "",
    networkingOpenToCollaborate: Boolean(user.networkingOpenToCollaborate),
  };
}

function overlap(a, b) {
  const left = new Set(normalizeTags(a));
  return normalizeTags(b).filter((item) => left.has(item));
}

/** Networking fields only — never profile bio/about. */
function networkingTextTokens(user) {
  return normalizeTags(
    [
      ...(user.networkingSkills || []),
      ...(user.networkingInterests || []),
      user.networkingHeadline,
      user.networkingLookingFor,
    ]
      .join(" ")
      .split(/[\s,;#/|]+/),
  ).filter((token) => token.length >= 3);
}

async function viewerGroupContext(userId) {
  const groups = await Conversation.find({
    members: userId,
    isSelfChat: { $ne: true },
    $or: [{ isGroup: true }, { isChannel: true }],
  })
    .select("_id name members")
    .lean();

  const groupIds = new Set(groups.map((group) => String(group._id)));
  const groupNamesById = new Map(
    groups.map((group) => [String(group._id), group.name || "Group"]),
  );

  return { groups, groupIds, groupNamesById };
}

function passesRelationshipFilters(viewer, candidate) {
  const viewerId = String(viewer._id);
  const candidateId = String(candidate._id);

  const viewerBlocked = new Set((viewer.blockedUsers || []).map(String));
  const viewerIgnored = new Set((viewer.ignoredUserIds || []).map(String));
  const candidateBlocked = new Set((candidate.blockedUsers || []).map(String));
  const candidateIgnored = new Set((candidate.ignoredUserIds || []).map(String));

  if (viewerBlocked.has(candidateId)) return false;
  if (candidateBlocked.has(viewerId)) return false;
  if (viewerIgnored.has(candidateId)) return false;
  if (candidateIgnored.has(viewerId)) return false;

  return true;
}

async function listNetworking(req, res) {
  const userId = String(req.user.id);
  const q = String(req.query.q || "").trim().toLowerCase();
  const tag = normalizeTag(req.query.tag || "");

  const [viewer, groupContext] = await Promise.all([
    User.findById(userId)
      .select(USER_SELECT)
      .lean(),
    viewerGroupContext(userId),
  ]);

  if (!viewer) throw ApiError.unauthorized("Please authenticate using a valid token");

  const viewerSkills = normalizeTags(viewer.networkingSkills);
  const viewerInterests = normalizeTags(viewer.networkingInterests);
  const viewerTokens = new Set(networkingTextTokens(viewer));

  const candidateFilter = {
    _id: { $ne: userId },
    email: { $not: /bot$/i },
  };

  if (tag) {
    candidateFilter.$or = [
      { networkingSkills: tag },
      { networkingInterests: tag },
      { networkingHeadline: new RegExp(tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
    ];
  }

  const [rawCandidates, targetGroups, posts] = await Promise.all([
    User.find(candidateFilter)
      .select(USER_SELECT)
      .sort({ networkingOpenToCollaborate: -1, isOnline: -1, updatedAt: -1 })
      .limit(120)
      .lean(),
    Conversation.find({
      members: { $ne: userId },
      isSelfChat: { $ne: true },
      $or: [{ isGroup: true }, { isChannel: true }],
    })
      .select("_id name members")
      .limit(250)
      .lean(),
    NetworkingPost.find({ status: "open" })
      .sort({ createdAt: -1 })
      .limit(24)
      .populate("authorId", USER_SELECT)
      .lean(),
  ]);

  const relationshipFiltered = rawCandidates.filter((candidate) =>
    passesRelationshipFilters(viewer, candidate),
  );
  const discoverable = await filterDiscoverableUsers(userId, relationshipFiltered);
  const candidates = discoverable.filter(hasNetworkingProfile);

  const groupsByMember = new Map();
  for (const group of targetGroups) {
    const id = String(group._id);
    if (!groupContext.groupIds.has(id)) continue;
    for (const member of group.members || []) {
      const key = String(member);
      if (key === userId) continue;
      const list = groupsByMember.get(key) || [];
      list.push({
        _id: group._id,
        name: groupContext.groupNamesById.get(id) || group.name || "Group",
      });
      groupsByMember.set(key, list);
    }
  }

  const recommendationsRaw = candidates
    .map((candidate) => {
      const sharedSkills = overlap(viewerSkills, candidate.networkingSkills);
      const sharedInterests = overlap(viewerInterests, candidate.networkingInterests);
      const candidateTokens = networkingTextTokens(candidate);
      const textMatches = candidateTokens
        .filter((token) => viewerTokens.has(token))
        .slice(0, 4);
      const mutualGroups = groupsByMember.get(String(candidate._id)) || [];

      let score = 0;
      score += sharedSkills.length * 14;
      score += sharedInterests.length * 10;
      score += mutualGroups.length * 8;
      score += candidate.networkingOpenToCollaborate ? 8 : 0;
      score += candidate.isOnline ? 4 : 0;
      score += Math.min(textMatches.length * 4, 12);
      score = Math.max(0, Math.min(98, score));

      const reasons = [];
      if (sharedSkills.length) {
        reasons.push({
          code: "shared_skills",
          items: sharedSkills.slice(0, 3),
        });
      }
      if (sharedInterests.length) {
        reasons.push({
          code: "shared_interests",
          items: sharedInterests.slice(0, 3),
        });
      }
      if (mutualGroups.length) {
        reasons.push({
          code: "mutual_groups",
          count: mutualGroups.length,
        });
      }
      if (candidate.networkingOpenToCollaborate) {
        reasons.push({ code: "open_to_collaborate" });
      }
      if (!reasons.length && textMatches.length) {
        reasons.push({
          code: "similar_keywords",
          items: textMatches.slice(0, 3),
        });
      }

      return {
        candidate,
        matchScore: score,
        sharedSkills,
        sharedInterests,
        mutualGroups: mutualGroups.slice(0, 3),
        reasons,
      };
    })
    .filter((item) => item.reasons.length > 0 && item.matchScore >= 8)
    .filter((item) => {
      if (!q) return true;
      const hay = [
        item.candidate.name,
        item.candidate.username,
        item.candidate.networkingHeadline,
        item.candidate.networkingLookingFor,
        ...(item.candidate.networkingSkills || []),
        ...(item.candidate.networkingInterests || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 18);

  const recommendations = await Promise.all(
    recommendationsRaw.map(async (item) => ({
      user: await sanitizeNetworkingPeer(userId, item.candidate),
      matchScore: item.matchScore,
      sharedSkills: item.sharedSkills,
      sharedInterests: item.sharedInterests,
      mutualGroups: item.mutualGroups,
      reasons: item.reasons,
    })),
  );

  const filteredPosts = (
    await Promise.all(
      posts
        .filter((post) => {
          const author = post.authorId;
          if (!author || typeof author !== "object") return true;
          return passesRelationshipFilters(viewer, author);
        })
        .filter((post) => {
          if (!q && !tag) return true;
          const hay = [
            post.title,
            post.summary,
            post.roleNeeded,
            ...(post.tags || []),
            post.authorId?.name,
            post.authorId?.username,
          ]
            .join(" ")
            .toLowerCase();
          return (!q || hay.includes(q)) && (!tag || normalizeTags(post.tags).includes(tag));
        })
        .map(async (post) => {
          const interestedIds = (post.interestedUserIds || []).map(String);
          const author =
            post.authorId && typeof post.authorId === "object"
              ? await sanitizeNetworkingPeer(userId, post.authorId)
              : null;
          return {
            _id: post._id,
            title: post.title,
            summary: post.summary,
            tags: post.tags || [],
            roleNeeded: post.roleNeeded || "",
            status: post.status,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            author,
            authorId: author?._id || post.authorId?._id || post.authorId,
            interestedCount: interestedIds.length,
            viewerInterested: interestedIds.includes(userId),
          };
        }),
    )
  ).filter(Boolean);

  res.json({
    profile: await sanitizeNetworkingPeer(userId, viewer, { isSelf: true }),
    recommendations,
    posts: filteredPosts,
    popularTags: Array.from(
      new Set([
        ...viewerSkills,
        ...viewerInterests,
        ...recommendations.flatMap((item) => [
          ...item.sharedSkills,
          ...item.sharedInterests,
          ...(item.user?.networkingSkills || []).slice(0, 2),
        ]),
        ...filteredPosts.flatMap((post) => post.tags || []),
      ]),
    )
      .filter(Boolean)
      .slice(0, 18),
  });
}

async function updateNetworkingProfile(req, res) {
  const body = req.body || {};
  const update = {
    networkingHeadline: body.headline || "",
    networkingSkills: normalizeTags(body.skills),
    networkingInterests: normalizeTags(body.interests),
    networkingLookingFor: body.lookingFor || "",
  };
  if ("openToCollaborate" in body) {
    update.networkingOpenToCollaborate = Boolean(body.openToCollaborate);
  }

  const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select(
    USER_SELECT,
  );

  publishNetworkingUpdated({ kind: "profile", userId: req.user.id });

  res.json(await sanitizeNetworkingPeer(req.user.id, user, { isSelf: true }));
}

async function createNetworkingPost(req, res) {
  const post = await NetworkingPost.create({
    authorId: req.user.id,
    title: req.body.title,
    summary: req.body.summary,
    tags: normalizeTags(req.body.tags),
    roleNeeded: req.body.roleNeeded || "",
  });

  await post.populate("authorId", USER_SELECT);
  publishNetworkingUpdated({ kind: "post_created", postId: String(post._id), userId: req.user.id });

  res.status(201).json({
    _id: post._id,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    roleNeeded: post.roleNeeded,
    status: post.status,
    author: await sanitizeNetworkingPeer(req.user.id, post.authorId, { isSelf: true }),
    authorId: post.authorId?._id || post.authorId,
    interestedCount: 0,
    viewerInterested: false,
  });
}

async function updateNetworkingPost(req, res) {
  const body = req.body || {};
  const update = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.summary !== undefined) update.summary = body.summary;
  if (body.tags !== undefined) update.tags = normalizeTags(body.tags);
  if (body.roleNeeded !== undefined) update.roleNeeded = body.roleNeeded;

  const post = await NetworkingPost.findOneAndUpdate(
    { _id: req.params.id, authorId: req.user.id, status: "open" },
    update,
    { new: true },
  ).populate("authorId", USER_SELECT);

  if (!post) throw ApiError.notFound("Networking post not found");

  publishNetworkingUpdated({ kind: "post_updated", postId: String(post._id), userId: req.user.id });

  const interestedIds = (post.interestedUserIds || []).map(String);
  res.json({
    _id: post._id,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    roleNeeded: post.roleNeeded,
    status: post.status,
    author: await sanitizeNetworkingPeer(req.user.id, post.authorId),
    authorId: post.authorId?._id || post.authorId,
    interestedCount: interestedIds.length,
    viewerInterested: interestedIds.includes(String(req.user.id)),
  });
}

async function closeNetworkingPost(req, res) {
  const post = await NetworkingPost.findOneAndUpdate(
    { _id: req.params.id, authorId: req.user.id },
    { status: "closed" },
    { new: true },
  );

  if (!post) throw ApiError.notFound("Networking post not found");

  publishNetworkingUpdated({ kind: "post_closed", postId: String(post._id), userId: req.user.id });

  res.json({ ok: true });
}

async function toggleNetworkingPostInterest(req, res) {
  const postId = req.params.id;
  const userId = String(req.user.id);

  const post = await NetworkingPost.findById(postId).select("authorId interestedUserIds status");
  if (!post || post.status !== "open") {
    throw ApiError.notFound("Networking post not found");
  }
  if (String(post.authorId) === userId) {
    throw ApiError.badRequest("You cannot express interest on your own post");
  }

  const interested = (post.interestedUserIds || []).map(String);
  const already = interested.includes(userId);
  const update = already
    ? { $pull: { interestedUserIds: userId } }
    : { $addToSet: { interestedUserIds: userId } };

  const updated = await NetworkingPost.findByIdAndUpdate(postId, update, { new: true }).select(
    "interestedUserIds",
  );

  publishNetworkingUpdated({ kind: "post_interest", postId, userId });

  res.json({
    ok: true,
    viewerInterested: !already,
    interestedCount: (updated?.interestedUserIds || []).length,
  });
}

function resolveIntroLocale(value) {
  return String(value || "en").toLowerCase().startsWith("ar") ? "ar" : "en";
}

function pickVariant(seed, options) {
  if (!options.length) return "";
  let hash = 0;
  for (const ch of String(seed || "")) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return options[Math.abs(hash) % options.length];
}

function joinSentences(parts) {
  const cleaned = parts
    .map((part) => String(part || "").trim().replace(/[.!?…]+$/u, ""))
    .filter(Boolean);
  if (!cleaned.length) return "";
  return `${cleaned.join(". ")}.`;
}

async function mutualGroupsBetween(viewerId, targetId) {
  const { groups } = await viewerGroupContext(viewerId);
  return groups
    .filter((group) =>
      (group.members || []).some((member) => String(member) === String(targetId)),
    )
    .slice(0, 2)
    .map((group) => ({
      _id: group._id,
      name: group.name || "Group",
    }));
}

function buildNetworkingIntro({
  viewer,
  target,
  sharedSkills,
  sharedInterests,
  mutualGroups = [],
  context,
  tone,
  locale,
}) {
  const lang = resolveIntroLocale(locale);
  const targetName = displayName(target) || (lang === "ar" ? "صديقي" : "there");
  const viewerName = displayName(viewer) || (lang === "ar" ? "أنا" : "I");
  const viewerGoal = String(context || viewer.networkingLookingFor || "").trim();
  const viewerSkills = normalizeTags(viewer.networkingSkills);
  const targetSkills = normalizeTags(target.networkingSkills);
  const targetInterests = normalizeTags(target.networkingInterests);
  const headline = String(target.networkingHeadline || "").trim();
  const targetLookingFor = String(target.networkingLookingFor || "").trim();
  const shared = [...sharedSkills, ...sharedInterests].slice(0, 4);
  const sharedSet = new Set(shared);
  const uniqueSkills = targetSkills.filter((skill) => !sharedSet.has(skill));
  const uniqueInterests = targetInterests.filter((interest) => !sharedSet.has(interest));
  const seed = String(target._id || targetName);
  const groupName = String(mutualGroups?.[0]?.name || "").trim();

  let openLine = "";
  if (lang === "ar") {
    if (headline) {
      openLine = pickVariant(`${seed}:open`, [
        `لفت انتباهي عنوانك «${headline}»`,
        `رأيت تركيزك على «${headline}» في مركز التواصل`,
        `ملفك يبرز «${headline}» — وهذا قريب مما أبحث عنه`,
      ]);
      if (shared.length) {
        openLine += pickVariant(`${seed}:shared-note`, [
          `، ولدينا تقاطع في ${shared.slice(0, 2).join(" و")}`,
          `، ونحن نشترك أيضًا في ${shared[0]}`,
          "",
        ]);
      }
    } else if (targetLookingFor) {
      openLine = pickVariant(`${seed}:open`, [
        `قرأت أنك تبحث عن «${targetLookingFor}»`,
        `يبدو أن هدفك «${targetLookingFor}» قريب مما أعمل عليه`,
      ]);
    } else if (uniqueSkills.length) {
      openLine = `أعجبتني خبرتك في ${uniqueSkills.slice(0, 2).join(" و")}`;
      if (shared.length) openLine += ` (إضافة إلى ${shared[0]} المشترك)`;
    } else if (shared.length) {
      openLine = pickVariant(`${seed}:open`, [
        `لاحظت أننا نشترك في ${shared.slice(0, 3).join(" و")}`,
        `يبدو أن ${shared[0]} مجال يربط ملفينا`,
      ]);
    } else if (targetSkills.length) {
      openLine = `رأيت مهاراتك في ${targetSkills.slice(0, 2).join(" و")}`;
    } else {
      openLine = "رأيت ملفك على مركز التواصل في فيغاسفير";
    }
  } else if (headline) {
    openLine = pickVariant(`${seed}:open`, [
      `Your headline "${headline}" stood out on the networking hub`,
      `I noticed your focus on ${headline} in your profile`,
      `Your profile highlights "${headline}" — that aligns with what I am exploring`,
    ]);
    if (shared.length) {
      openLine += pickVariant(`${seed}:shared-note`, [
        `, and we also overlap on ${shared.slice(0, 2).join(" and ")}`,
        `, plus we share ${shared[0]}`,
        "",
      ]);
    }
  } else if (targetLookingFor) {
    openLine = pickVariant(`${seed}:open`, [
      `I read that you are looking for "${targetLookingFor}"`,
      `Your goal of "${targetLookingFor}" seems close to what I am working on`,
    ]);
  } else if (uniqueSkills.length) {
    openLine = `Your ${uniqueSkills.slice(0, 2).join(" and ")} background caught my attention`;
    if (shared.length) openLine += ` (alongside our shared ${shared[0]})`;
  } else if (shared.length) {
    openLine = pickVariant(`${seed}:open`, [
      `We overlap on ${shared.slice(0, 3).join(", ")}`,
      `It looks like ${shared[0]} connects our profiles`,
    ]);
  } else if (targetSkills.length) {
    openLine = `I saw your skills in ${targetSkills.slice(0, 2).join(" and ")}`;
  } else {
    openLine = "I came across your profile on Vegasphere Networking";
  }

  let bridgeLine = "";
  if (lang === "ar") {
    if (groupName) {
      bridgeLine = pickVariant(`${seed}:group`, [
        viewerGoal
          ? `نحن في ${groupName}، وأعمل على «${viewerGoal}» — أعتقد أنك الشخص المناسب`
          : `نحن في ${groupName} وأود تبادل الأفكار`,
        viewerGoal
          ? `بما أننا في ${groupName}، أردت التواصل بخصوص «${viewerGoal}»`
          : `لاحظت وجودنا معًا في ${groupName} وأردت التعارف`,
        viewerGoal && headline
          ? `في ${groupName}، لفت انتباهي تركيزك على «${headline}» بينما أبني «${viewerGoal}»`
          : `وجودنا في ${groupName} هو ما دفعني للتواصل`,
        viewerGoal && uniqueSkills.length
          ? `عبر ${groupName}، رأيت خبرتك في ${uniqueSkills[0]} — قد تساعد في «${viewerGoal}»`
          : `${groupName} هو حيث لاحظت ملفك`,
      ]);
    } else if (viewerGoal && targetLookingFor) {
      bridgeLine = pickVariant(`${seed}:goals`, [
        `أركز على «${viewerGoal}» وملاحظتك حول «${targetLookingFor}» تبدو متقاربة`,
        `أولويتي «${viewerGoal}» — بحثك عن «${targetLookingFor}» قد يتوافق معها`,
      ]);
    } else if (viewerGoal && headline) {
      bridgeLine = pickVariant(`${seed}:proj-headline`, [
        `أبني نحو «${viewerGoal}» وعملك حول «${headline}» يبدو مناسبًا`,
        `لمشروع «${viewerGoal}»، خلفيتك في «${headline}» قد تكون مفيدة`,
      ]);
    } else if (viewerGoal && uniqueSkills.length) {
      const skill = uniqueSkills[pickVariant(`${seed}:skill`, uniqueSkills.length)];
      bridgeLine = pickVariant(`${seed}:proj-skill`, [
        `أعمل على «${viewerGoal}» وخبرتك في ${skill} قد تساعد`,
        `لمشروع «${viewerGoal}»، مهاراتك في ${skill} تبدو مفيدة`,
      ]);
    } else if (viewerGoal && shared.length) {
      bridgeLine = pickVariant(`${seed}:proj-shared`, [
        `أعمل على «${viewerGoal}» وخلفيتنا المشتركة في ${shared.slice(0, 2).join(" / ")} قد تسرّع التعاون`,
        `هدفي «${viewerGoal}» — بما أننا نلمس ${shared[0]}، ربما نتعاون`,
      ]);
    } else if (viewerGoal && targetSkills.length) {
      bridgeLine = pickVariant(`${seed}:proj`, [
        `أعمل على «${viewerGoal}» ومجموعة مهاراتك ${targetSkills.slice(0, 2).join(" + ")} قد تناسب`,
        `أبحث عن زميل لـ «${viewerGoal}» — مهاراتك لفتت انتباهي`,
      ]);
    } else if (targetLookingFor && viewerSkills.length) {
      const skill = viewerSkills[pickVariant(`${seed}:viewer-skill`, viewerSkills.length)];
      bridgeLine = pickVariant(`${seed}:offer`, [
        `ذكرت «${targetLookingFor}» — أقدم ${skill} ويسعدني استكشاف ذلك معك`,
        `إن كان «${targetLookingFor}» ما زال مطروحًا، خلفيتي في ${skill} قد تفيد`,
      ]);
    } else if (uniqueInterests.length) {
      bridgeLine = `أود سماع تجربتك مع ${uniqueInterests.slice(0, 2).join(" و")}`;
    } else if (uniqueSkills.length) {
      bridgeLine = `أود معرفة المزيد عن عملك في ${uniqueSkills[0]}`;
    } else if (shared.length) {
      bridgeLine = pickVariant(`${seed}:shared-bridge`, [
        `ربما نتعاون حول ${shared.slice(0, 2).join(" و")}`,
        `أعتقد أن تقاطعنا في ${shared[0]} قد يفيدنا`,
      ]);
    } else if (targetLookingFor) {
      bridgeLine = `إن كان «${targetLookingFor}» ما زال نشطًا، يسعدني الحديث عن كيف يمكنني المساعدة`;
    }
  } else if (groupName) {
    bridgeLine = pickVariant(`${seed}:group`, [
      viewerGoal
        ? `We are both in ${groupName}, and I am working on "${viewerGoal}" — I thought you might be the right person to ask`
        : `We are both in ${groupName}, and I would love to compare notes`,
      viewerGoal
        ? `Since we share ${groupName}, I wanted to reach out about "${viewerGoal}"`
        : `I noticed we are both in ${groupName} and wanted to introduce myself`,
      viewerGoal && headline
        ? `In ${groupName}, your work on ${headline} stood out while I am building "${viewerGoal}"`
        : `Being in ${groupName} together is what made me reach out`,
      viewerGoal && uniqueSkills.length
        ? `Through ${groupName}, I noticed your ${uniqueSkills[0]} background — it could help with "${viewerGoal}"`
        : `${groupName} is where I first noticed your profile`,
      viewerGoal && targetLookingFor
        ? `We overlap in ${groupName}, and both "${viewerGoal}" and "${targetLookingFor}" sound compatible`
        : `I saw you in ${groupName} and wanted to connect`,
    ]);
  } else if (viewerGoal && targetLookingFor) {
    bridgeLine = pickVariant(`${seed}:goals`, [
      `I am focused on "${viewerGoal}" and your note about "${targetLookingFor}" seems aligned`,
      `My current priority is "${viewerGoal}" — your search for "${targetLookingFor}" might overlap nicely`,
    ]);
  } else if (viewerGoal && headline) {
    bridgeLine = pickVariant(`${seed}:proj-headline`, [
      `I am building toward "${viewerGoal}" and your work around ${headline} looks relevant`,
      `For "${viewerGoal}", someone with your ${headline} background could be a strong fit`,
    ]);
  } else if (viewerGoal && uniqueSkills.length) {
    const skill = uniqueSkills[pickVariant(`${seed}:skill`, uniqueSkills.length)];
    bridgeLine = pickVariant(`${seed}:proj-skill`, [
      `I am working on "${viewerGoal}" and your ${skill} experience could help`,
      `For "${viewerGoal}", your ${skill} skills seem especially useful`,
    ]);
  } else if (viewerGoal && shared.length) {
    bridgeLine = pickVariant(`${seed}:proj-shared`, [
      `I am working on "${viewerGoal}" and our shared ${shared.slice(0, 2).join(" / ")} background might help us move fast`,
      `My goal is "${viewerGoal}" — since we both touch ${shared[0]}, maybe we could team up`,
    ]);
  } else if (viewerGoal && targetSkills.length) {
    bridgeLine = pickVariant(`${seed}:proj`, [
      `I am working on "${viewerGoal}" and your ${targetSkills.slice(0, 2).join(" + ")} stack could fit`,
      `I am looking for a teammate for "${viewerGoal}" — your skills stood out for that reason`,
    ]);
  } else if (targetLookingFor && viewerSkills.length) {
    const skill = viewerSkills[pickVariant(`${seed}:viewer-skill`, viewerSkills.length)];
    bridgeLine = pickVariant(`${seed}:offer`, [
      `You mentioned "${targetLookingFor}" — I bring ${skill} and would be glad to explore that together`,
      `If "${targetLookingFor}" is still open, my ${skill} background might be useful`,
    ]);
  } else if (uniqueInterests.length) {
    bridgeLine = `I would enjoy hearing how you got into ${uniqueInterests.slice(0, 2).join(" and ")}`;
  } else if (uniqueSkills.length) {
    bridgeLine = `I would love to learn more about your work with ${uniqueSkills[0]}`;
  } else if (shared.length) {
    bridgeLine = pickVariant(`${seed}:shared-bridge`, [
      `Maybe we could collaborate around ${shared.slice(0, 2).join(" and ")}`,
      `I think our overlap on ${shared[0]} could lead to something useful`,
    ]);
  } else if (targetLookingFor) {
    bridgeLine = `If "${targetLookingFor}" is still active, I would be happy to chat about how I could help`;
  }

  const closeLine = pickVariant(`${seed}:${tone}`, [
    lang === "ar"
      ? tone === "formal"
        ? "يسعدني التواصل معك واستكشاف فرص التعاون"
        : "هل تود التواصل وتبادل الأفكار؟"
      : tone === "formal"
        ? "I would be glad to connect and explore whether we can collaborate"
        : "Would you like to connect and exchange ideas?",
    lang === "ar"
      ? tone === "short"
        ? "هل نتواصل؟"
        : "ما رأيك أن نتواصل قريبًا؟"
      : tone === "short"
        ? "Want to connect?"
        : "Open to a quick chat?",
    lang === "ar"
      ? tone === "formal"
        ? "أتطلع إلى فرصة التعارف"
        : "هل يناسبك التواصل؟"
      : tone === "formal"
        ? "I look forward to hearing from you"
        : "Would connecting work for you?",
  ]);

  const greeting = lang === "ar" ? "مرحبًا" : tone === "formal" ? "Hi" : "Hey";
  const body = joinSentences(tone === "short" ? [openLine] : [openLine, bridgeLine]);

  if (tone === "formal") {
    return lang === "ar"
      ? `${greeting} ${targetName}، ${body} ${closeLine} — ${viewerName}`
      : `${greeting} ${targetName}, ${body} ${closeLine} — ${viewerName}`;
  }
  if (tone === "short") {
    return `${greeting} ${targetName}, ${body} ${closeLine}`;
  }
  return `${greeting} ${targetName}, ${body} ${closeLine}`;
}

async function generateIntro(req, res) {
  const targetId = String(req.body.targetUserId || "");
  const [viewer, target] = await Promise.all([
    User.findById(req.user.id).select(USER_SELECT).lean(),
    User.findById(targetId).select(USER_SELECT).lean(),
  ]);

  if (!viewer || !target) throw ApiError.notFound("User not found");
  if (!passesRelationshipFilters(viewer, target)) {
    throw ApiError.forbidden("Cannot generate intro for this user");
  }
  if (!(await canViewerSeeUserField(req.user.id, target, "search"))) {
    throw ApiError.forbidden("User is not discoverable");
  }

  const sharedSkills = overlap(viewer.networkingSkills, target.networkingSkills);
  const sharedInterests = overlap(viewer.networkingInterests, target.networkingInterests);
  const mutualGroups = await mutualGroupsBetween(req.user.id, targetId);
  const intro = buildNetworkingIntro({
    viewer,
    target,
    sharedSkills,
    sharedInterests,
    mutualGroups,
    context: req.body.context,
    tone: req.body.tone,
    locale: req.body.locale,
  });

  res.json({
    intro,
    sharedSkills,
    sharedInterests,
  });
}

module.exports = wrapHttpHandlers({
  listNetworking,
  updateNetworkingProfile,
  createNetworkingPost,
  updateNetworkingPost,
  closeNetworkingPost,
  toggleNetworkingPostInterest,
  generateIntro,
});
