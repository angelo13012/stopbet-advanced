const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onSchedule }         = require("firebase-functions/v2/scheduler");
const { defineSecret }       = require("firebase-functions/params");
const admin  = require("firebase-admin");
const stripe = require("stripe");

admin.initializeApp();

const stripeSecret        = defineSecret("STRIPE_SECRET");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

const PRICES      = { monthly: 349, yearly: 3000 };
const VALID_PLANS = ['monthly', 'yearly'];

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

exports.confirmCheckout = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const { sessionId, plan, trial } = request.data;
  if (!sessionId || !VALID_PLANS.includes(plan)) throw new HttpsError("invalid-argument", "Données invalides");
  const stripeClient = stripe(stripeSecret.value());
  try {
    const session = await stripeClient.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const isTrial = trial === true || session.metadata?.trial === "true";
    const validStatus = isTrial ? ["no_payment_required", "paid"] : ["paid"];
    if (!validStatus.includes(session.payment_status)) throw new HttpsError("failed-precondition", "Paiement non confirme");
    if (!isTrial) {
      const expectedAmount = PRICES[plan];
      const lineItems  = await stripeClient.checkout.sessions.listLineItems(sessionId);
      const paidAmount = lineItems.data[0]?.amount_total;
      if (paidAmount !== expectedAmount) throw new HttpsError("permission-denied", "Montant de paiement invalide");
    }
    if (session.metadata?.userId !== request.auth.uid) throw new HttpsError("permission-denied", "Session invalide");
    const subscription     = session.subscription;
    const subscriptionId   = typeof subscription === 'string' ? subscription : subscription?.id;
    const currentPeriodEnd = subscription?.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;
    const trialEndsAt = isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null;
    const updateData  = {
      subscriptionType: "premium",
      subscriptionStatus: "active",
      subscriptionPlan: plan,
      subscribedAt: new Date().toISOString(),
      stripeSessionId: sessionId,
      stripeSubscriptionId: subscriptionId ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
    };
    if (isTrial) {
      updateData.trialUsed   = true;
      updateData.trialEndsAt = trialEndsAt;
      updateData.isTrial     = true;
    }
    await admin.firestore().collection("users").doc(request.auth.uid).update(updateData);
    return { success: true, isTrial, trialEndsAt };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

exports.cancelSubscription = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userData?.stripeSubscriptionId) throw new HttpsError("not-found", "Aucun abonnement actif trouvé");
  if (userData?.subscriptionStatus === "canceling") throw new HttpsError("failed-precondition", "Résiliation déjà en cours");
  const stripeClient = stripe(stripeSecret.value());
  try {
    const subscription = await stripeClient.subscriptions.update(userData.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    const cancelAt = new Date(subscription.cancel_at * 1000).toISOString();
    await admin.firestore().collection("users").doc(request.auth.uid).update({
      subscriptionStatus: "canceling",
      cancelAt,
    });
    return { success: true, cancelAt };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

exports.deleteAccount = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const uid = request.auth.uid;
  try {
    const userDoc  = await admin.firestore().collection("users").doc(uid).get();
    const userData = userDoc.data();
    if (userData?.stripeSubscriptionId && userData?.subscriptionStatus === "active") {
      const stripeClient = stripe(stripeSecret.value());
      await stripeClient.subscriptions.cancel(userData.stripeSubscriptionId).catch(() => {});
    }
    const deleteCollection = async (colPath) => {
      const snap = await admin.firestore().collection(colPath).get();
      const batch = admin.firestore().batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      if (snap.docs.length > 0) await batch.commit();
    };
    await deleteCollection(`users/${uid}/bets`);
    await deleteCollection(`users/${uid}/goals`);
    await deleteCollection(`users/${uid}/moods`);
    await admin.firestore().collection("users").doc(uid).delete();
    await admin.firestore().collection("leaderboard").doc(uid).delete().catch(() => {});
    await admin.auth().deleteUser(uid);
    return { success: true };
  } catch (error) {
    throw new HttpsError("internal", error.message);
  }
});

// ── Webhook Stripe ──
exports.stripeWebhook = onRequest({ secrets: [stripeSecret, stripeWebhookSecret] }, async (req, res) => {
  if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
  const sig     = req.headers["stripe-signature"];
  const payload = req.rawBody;
  let event;
  try {
    const stripeClient = stripe(stripeSecret.value());
    event = stripeClient.webhooks.constructEvent(payload, sig, stripeWebhookSecret.value());
  } catch (err) {
    console.error("Webhook signature invalide:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;
        if (!userId) {
          // Chercher par stripeSubscriptionId
          const snap = await admin.firestore().collection("users")
            .where("stripeSubscriptionId", "==", subscription.id).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({
              subscriptionType: "free",
              subscriptionStatus: "canceled",
              stripeSubscriptionId: null,
              currentPeriodEnd: null,
              cancelAt: null,
            });
          }
        } else {
          await admin.firestore().collection("users").doc(userId).update({
            subscriptionType: "free",
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
            cancelAt: null,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const snap = await admin.firestore().collection("users")
          .where("stripeSubscriptionId", "==", subscription.id).limit(1).get();
        if (!snap.empty) {
          const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          const isCanceling = subscription.cancel_at_period_end === true;
          const cancelAt = subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000).toISOString()
            : null;
          await snap.docs[0].ref.update({
            currentPeriodEnd,
            subscriptionStatus: isCanceling ? "canceling" : "active",
            cancelAt: cancelAt ?? admin.firestore.FieldValue.delete(),
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const snap = await admin.firestore().collection("users")
            .where("stripeSubscriptionId", "==", subscriptionId).limit(1).get();
          if (!snap.empty) {
            await snap.docs[0].ref.update({
              subscriptionStatus: "past_due",
            });
          }
        }
        break;
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Internal error");
  }
});

exports.generateReferralCode = onCall({ secrets: [stripeSecret] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Non authentifie");
  const userDoc  = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (userData?.referralCode) return { code: userData.referralCode };
  const code = request.auth.uid.slice(0, 8).toUpperCase();
  await admin.firestore().collection("users").doc(request.auth.uid).update({ referralCode: code, referralCount: 0 });
  return { code };
});

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

exports.sendMorningNotifications = onSchedule(
  { schedule: "0 8 * * *", timeZone: "Europe/Paris" },
  async () => {
    const usersSnap = await admin.firestore().collection("users").where("notificationsEnabled", "==", true).where("fcmToken", "!=", null).get();
    const messages = usersSnap.docs.map(doc => {
      const data = doc.data();
      const streak = data.streakCount ?? 0;
      const isPremium = data.subscriptionType === "premium";
      let body = "";
      if (streak === 0)     body = "Aujourd'hui est un nouveau départ. Tu peux le faire ! 💪";
      else if (streak < 7)  body = `${streak} jour${streak > 1 ? 's' : ''} sans pari. Continue sur cette lancée ! 🔥`;
      else if (streak < 30) body = `${streak} jours — tu es sur la bonne voie. Chaque jour compte. ⚡`;
      else                  body = `${streak} jours sans pari — tu es exceptionnel. 👑`;
      if (isPremium) body += " (Coach IA t'attend dans l'app)";
      return { token: data.fcmToken, notification: { title: "Bonjour " + (data.firstName ?? "") + " 👋", body }, webpush: { notification: { icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [200, 100, 200] }, fcmOptions: { link: "https://stopbet-app-angel.vercel.app" } } };
    });
    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) await admin.messaging().sendEach(chunk);
    console.log(`Morning notifications sent to ${messages.length} users`);
  }
);

exports.sendEveningNotifications = onSchedule(
  { schedule: "0 20 * * *", timeZone: "Europe/Paris" },
  async () => {
    const usersSnap = await admin.firestore().collection("users").where("notificationsEnabled", "==", true).where("fcmToken", "!=", null).get();
    const now      = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const messages = usersSnap.docs.map(doc => {
      const data = doc.data();
      const streak = data.streakCount ?? 0;
      const lastBetDate = data.lastBetDate ? data.lastBetDate.slice(0, 10) : null;
      if (lastBetDate === todayStr) return null;
      const body = streak > 0
        ? `Tu as tenu toute la journée ! ${streak} jour${streak > 1 ? 's' : ''} sans pari. +10 XP gagné 🎉`
        : "Une nouvelle journée sans pari s'achève. Demain est une nouvelle chance. 💪";
      return { token: data.fcmToken, notification: { title: "Bravo pour aujourd'hui ! 🌙", body }, webpush: { notification: { icon: "/icon-192.png", badge: "/icon-192.png" }, fcmOptions: { link: "https://stopbet-app-angel.vercel.app" } } };
    }).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) await admin.messaging().sendEach(chunk);
    console.log(`Evening notifications sent to ${messages.length} users`);
  }
);

exports.sendStreakAlerts = onSchedule(
  { schedule: "0 12 * * *", timeZone: "Europe/Paris" },
  async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const usersSnap  = await admin.firestore().collection("users").where("notificationsEnabled", "==", true).where("fcmToken", "!=", null).where("streakCount", ">", 0).get();
    const messages = usersSnap.docs.map(doc => {
      const data = doc.data();
      const lastBetDate = data.lastBetDate;
      if (!lastBetDate || lastBetDate > twoDaysAgo) return null;
      const streak = data.streakCount ?? 0;
      return { token: data.fcmToken, notification: { title: "⚠️ Ton streak est en danger !", body: `Tu as ${streak} jours sans pari — ouvre l'app pour confirmer que tu tiens bon !` }, webpush: { notification: { icon: "/icon-192.png", badge: "/icon-192.png", vibrate: [300, 100, 300, 100, 300] }, fcmOptions: { link: "https://stopbet-app-angel.vercel.app" } } };
    }).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < messages.length; i += 500) chunks.push(messages.slice(i, i + 500));
    for (const chunk of chunks) await admin.messaging().sendEach(chunk);
    console.log(`Streak alerts sent to ${messages.length} users`);
  }
);