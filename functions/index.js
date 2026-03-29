const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule }         = require("firebase-functions/v2/scheduler");
const { defineSecret }       = require("firebase-functions/params");
const admin  = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();

const stripeSecret = defineSecret("STRIPE_SECRET");

const PRICES      = { monthly: 349, yearly: 3000 };
const VALID_PLANS = ['monthly', 'yearly'];

// ── Checkout normal ──
exports.createCheckoutSession = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const { plan, successUrl, cancelUrl } = request.data;
  if (!VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Plan invalide");
  if (!successUrl || !cancelUrl)   throw new HttpsError("invalid-argument", "URLs manquantes");
  const stripeClient = stripe(stripeSecret.value());
  const amount = PRICES[plan];
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", product_data: { name: plan === "yearly" ? "StopBet Premium Annuel" : "StopBet Premium Mensuel", description: plan === "yearly" ? "2 mois offerts" : "Accès à toutes les fonctionnalités" }, unit_amount: amount, recurring: { interval: plan === "yearly" ? "year" : "month" } }, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}&plan=" + plan,
      cancel_url:  cancelUrl,
      metadata: { userId: request.auth.uid, plan, expectedAmount: amount.toString() },
    });
    return { url: session.url };
  } catch (error) { throw new HttpsError("internal", error.message); }
});

// ── Checkout avec essai 7 jours ──
exports.createTrialSession = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const { plan, successUrl, cancelUrl } = request.data;
  if (!VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Plan invalide");
  if (!successUrl || !cancelUrl)   throw new HttpsError("invalid-argument", "URLs manquantes");
  const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.trialUsed) throw new HttpsError("failed-precondition", "Essai gratuit déjà utilisé");
  const stripeClient = stripe(stripeSecret.value());
  const amount = PRICES[plan];
  try {
    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", product_data: { name: plan === "yearly" ? "StopBet Premium Annuel" : "StopBet Premium Mensuel", description: "7 jours gratuits, puis facturation automatique" }, unit_amount: amount, recurring: { interval: plan === "yearly" ? "year" : "month" } }, quantity: 1 }],
      mode: "subscription",
      subscription_data: { trial_period_days: 7 },
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}&plan=" + plan + "&trial=true",
      cancel_url:  cancelUrl,
      metadata: { userId: request.auth.uid, plan, trial: "true" },
    });
    return { url: session.url };
  } catch (error) { throw new HttpsError("internal", error.message); }
});

// ── Confirmer le checkout ──
exports.confirmCheckout = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const { sessionId, plan, trial } = request.data;
  if (!sessionId || !VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Données invalides");
  const stripeClient = stripe(stripeSecret.value());
  try {
    const session     = await stripeClient.checkout.sessions.retrieve(sessionId);
    const isTrial     = trial === true || session.metadata?.trial === "true";
    const validStatus = isTrial ? ["no_payment_required", "paid"] : ["paid"];
    if (!validStatus.includes(session.payment_status)) throw new HttpsError("failed-precondition", "Paiement non confirme");
    if (!isTrial) {
      const expectedAmount = PRICES[plan];
      const lineItems  = await stripeClient.checkout.sessions.listLineItems(sessionId);
      const paidAmount = lineItems.data[0]?.amount_total;
      if (paidAmount !== expectedAmount) throw new HttpsError("permission-denied", "Montant de paiement invalide");
    }
    if (session.metadata?.userId !== request.auth.uid) throw new HttpsError("permission-denied", "Session invalide");
    const trialEndsAt  = isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    const updateData   = { subscriptionType: "premium", subscriptionStatus: "active", subscriptionPlan: plan, subscribedAt: new Date().toISOString(), stripeSessionId: sessionId };
    if (isTrial) { updateData.trialUsed = true; updateData.trialEndsAt = trialEndsAt; updateData.isTrial = true; }
    await admin.firestore().collection("users").doc(request.auth.uid).update(updateData);
    return { success: true, isTrial, trialEndsAt };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

// ── Générer code parrainage ──
exports.generateReferralCode = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.referralCode) return { code: userData.referralCode };
  const code = request.auth.uid.slice(0, 8).toUpperCase();
  await admin.firestore().collection("users").doc(request.auth.uid).update({ referralCode: code, referralCount: 0 });
  return { code };
});

// ── Appliquer code parrainage ──
exports.applyReferralCode = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const { code } = request.data;
  if (!code) throw new HttpsError("invalid-argument", "Code manquant");
  const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.referralApplied) throw new HttpsError("failed-precondition", "Code déjà utilisé");
  const referrersSnap = await admin.firestore().collection("users").where("referralCode", "==", code.toUpperCase()).limit(1).get();
  if (referrersSnap.empty) throw new HttpsError("not-found", "Code invalide");
  const referrerDoc  = referrersSnap.docs[0];
  const referrerId   = referrerDoc.id;
  if (referrerId === request.auth.uid) throw new HttpsError("invalid-argument", "Tu ne peux pas utiliser ton propre code");
  const referrerData = referrerDoc.data();
  const newCount     = (referrerData.referralCount ?? 0) + 1;
  const batch        = admin.firestore().batch();
  batch.update(referrerDoc.ref, { referralCount: newCount });
  const bonusEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  batch.update(admin.firestore().collection("users").doc(request.auth.uid), { referralApplied: true, referredBy: referrerId, referralBonusEnds: bonusEndsAt, subscriptionType: "premium", subscriptionStatus: "active", isTrial: true, trialEndsAt: bonusEndsAt });
  await batch.commit();
  return { success: true, bonusEndsAt, referrerCount: newCount };
});

// ── NOTIFICATIONS PUSH — Matin 8h ──
exports.sendMorningNotifications = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Paris" },
  async () => {
    const usersSnap = await admin.firestore()
      .collection("users")
      .where("notificationsEnabled", "==", true)
      .where("fcmToken", "!=", null)
      .get();

    const messages = usersSnap.docs.map(doc => {
      const data    = doc.data();
      const streak  = data.streakCount ?? 0;
      const isPremium = data.subscriptionType === "premium";

      let body = "";
      if (streak === 0)        body = "Aujourd'hui est un nouveau départ. Tu peux le faire ! 💪";
      else if (streak < 7)     body = `${streak} jour${streak > 1 ? 's' : ''} sans pari. Continue sur cette lancée ! 🔥`;
      else if (streak < 30)    body = `${streak} jours — tu es sur la bonne voie. Chaque jour compte. ⚡`;
      else                     body = `${streak} jours sans pari — tu es exceptionnel. 👑`;

      if (isPremium) body += " (Coach IA t'attend dans l'app)";

      return {
        token:        data.fcmToken,
        notification: { title: "Bonjour " + (data.firstName ?? "") + " 👋", body },
        webpush: {
          notification: { icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [200, 100, 200] },
          fcmOptions:   { link: "https://stopbet-app-angel.vercel.app" },
        },
      };
    });

    // Envoyer par lots de 500
    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) {
      await admin.messaging().sendEach(chunk);
    }

    console.log(`Morning notifications sent to ${messages.length} users`);
  }
);

// ── NOTIFICATIONS PUSH — Soir 20h ──
exports.sendEveningNotifications = onSchedule(
  { schedule: "0 20 * * *", timeZone: "Europe/Paris" },
  async () => {
    const usersSnap = await admin.firestore()
      .collection("users")
      .where("notificationsEnabled", "==", true)
      .where("fcmToken", "!=", null)
      .get();

    const now      = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const messages = usersSnap.docs
      .map(doc => {
        const data   = doc.data();
        const streak = data.streakCount ?? 0;

        // Vérifier si l'utilisateur n'a pas parié aujourd'hui
        const lastBetDate = data.lastBetDate ? data.lastBetDate.slice(0, 10) : null;
        const betToday    = lastBetDate === todayStr;

        if (betToday) return null; // Pas de notif si rechute aujourd'hui

        const body = streak > 0
          ? `Tu as tenu toute la journée ! ${streak} jour${streak > 1 ? 's' : ''} sans pari. +10 XP gagné 🎉`
          : "Une nouvelle journée sans pari s'achève. Demain est une nouvelle chance. 💪";

        return {
          token:        data.fcmToken,
          notification: { title: "Bravo pour aujourd'hui ! 🌙", body },
          webpush: {
            notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
            fcmOptions:   { link: "https://stopbet-app-angel.vercel.app" },
          },
        };
      })
      .filter(Boolean);

    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) {
      await admin.messaging().sendEach(chunk);
    }

    console.log(`Evening notifications sent to ${messages.length} users`);
  }
);

// ── NOTIFICATIONS PUSH — Alerte streak en danger (tous les 2 jours si inactif) ──
exports.sendStreakAlerts = onSchedule(
  { schedule: "0 12 * * *", timeZone: "Europe/Paris" },
  async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const usersSnap = await admin.firestore()
      .collection("users")
      .where("notificationsEnabled", "==", true)
      .where("fcmToken", "!=", null)
      .where("streakCount", ">", 0)
      .get();

    const messages = usersSnap.docs
      .map(doc => {
        const data        = doc.data();
        const lastBetDate = data.lastBetDate;
        // Envoyer seulement si le dernier pari date de plus de 2 jours (streak actif mais app pas ouverte)
        if (!lastBetDate || lastBetDate > twoDaysAgo) return null;

        const streak = data.streakCount ?? 0;
        return {
          token: data.fcmToken,
          notification: {
            title: "⚠️ Ton streak est en danger !",
            body:  `Tu as ${streak} jours sans pari — ouvre l'app pour confirmer que tu tiens bon !`,
          },
          webpush: {
            notification: { icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [300, 100, 300, 100, 300] },
            fcmOptions:   { link: "https://stopbet-app-angel.vercel.app" },
          },
        };
      })
      .filter(Boolean);

    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) {
      await admin.messaging().sendEach(chunk);
    }

    console.log(`Streak alerts sent to ${messages.length} users`);
  }
);